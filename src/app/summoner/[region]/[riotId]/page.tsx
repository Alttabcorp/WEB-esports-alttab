import Link from "next/link";
import { redirect } from "next/navigation";
import { PrepDecisionView } from "@/components/PrepDecisionView";
import {
  findPlayerByPuuid,
  getAppProfile,
  getDayLpSummaryForPlayer,
  getStoredMatchesForPlayer,
  listRankSnapshots,
} from "@/lib/db/persist";
import {
  getChampionIdToKey,
  getDdragonVersion,
  getRuneCatalog,
} from "@/lib/ddragon";
import { decodeRiotIdParam } from "@/lib/format";
import {
  analyzePlayer,
  parseRiotId,
  resolveSummonerProfile,
} from "@/lib/riot/analyze";
import { RiotApiError } from "@/lib/riot/client";
import { isPlatformRegion } from "@/lib/riot/regions";
import type { QueueFilter } from "@/lib/riot/types";
import { buildContextualPool } from "@/lib/stats/contextualPool";
import { computeDayGoalProgress } from "@/lib/stats/dayGoal";
import { buildMatchLpLedger } from "@/lib/stats/matchLpLedger";
import { filterMatchesByRecentPatches } from "@/lib/stats/patchGate";
import { computeSessionEv } from "@/lib/stats/sessionEv";
import { SESSION_GAP_MS } from "@/lib/stats/temporal";
import type { RoleKey } from "@/lib/stats/roles";

type PageProps = {
  params: Promise<{ region: string; riotId: string }>;
  searchParams: Promise<{
    queue?: string;
    count?: string;
    refresh?: string;
    mode?: string;
    tab?: string;
  }>;
};

/**
 * Legacy URL: perfil salvo → novas rotas; outro invocador → Preparar enxuto.
 */
export default async function SummonerPage({ params, searchParams }: PageProps) {
  const { region, riotId: riotIdParam } = await params;
  const sp = await searchParams;
  const riotId = decodeRiotIdParam(riotIdParam);
  const queue = (sp.queue ?? "ranked") as QueueFilter;
  const count = Number(sp.count ?? "50");
  const forceRefresh = sp.refresh === "1" || sp.refresh === "true";

  if (!isPlatformRegion(region)) {
    return <ErrorState title="Região inválida" detail={`Região: ${region}`} />;
  }

  const parsed = parseRiotId(riotId);
  if (!parsed) {
    return (
      <ErrorState
        title="Riot ID inválido"
        detail="Use o formato Nome#TAG na busca."
      />
    );
  }

  const appProfile = await getAppProfile();
  const isSaved =
    appProfile &&
    appProfile.platform === region &&
    appProfile.gameName.toLowerCase() === parsed.gameName.toLowerCase() &&
    appProfile.tagLine.toLowerCase() === parsed.tagLine.toLowerCase();

  if (isSaved) {
    const qs = new URLSearchParams();
    if (sp.queue) qs.set("queue", sp.queue);
    if (sp.count) qs.set("count", sp.count);
    if (sp.refresh) qs.set("refresh", sp.refresh);
    if (sp.tab === "timing") {
      const q = qs.toString();
      redirect(q ? `/timing?${q}` : "/timing");
    }
    if (sp.tab === "history") redirect("/historico");
    if (sp.mode === "live") redirect("/coach");
    const q = qs.toString();
    redirect(q ? `/preparar?${q}` : "/preparar");
  }

  // Guest / outro invocador — carrega e mostra decisão enxuta
  try {
    const profile = await resolveSummonerProfile(
      region,
      parsed.gameName,
      parsed.tagLine,
      { preferDb: true, forceRefresh },
    );
    const analysis = await analyzePlayer({
      platform: region,
      puuid: profile.puuid,
      queue,
      count: Number.isFinite(count) ? count : 50,
      profile,
      preferDb: true,
      forceRefresh,
    });
    const ddragonVersion = await getDdragonVersion();
    const [idToKey, runeCatalog] = await Promise.all([
      getChampionIdToKey(ddragonVersion),
      getRuneCatalog(ddragonVersion),
    ]);

    const dbPlayer = await findPlayerByPuuid(profile.puuid);
    const dayLp = dbPlayer
      ? await getDayLpSummaryForPlayer(dbPlayer.id, profile.puuid)
      : null;
    const storedForLp = dbPlayer
      ? await getStoredMatchesForPlayer(dbPlayer.id, {
          count: Number.isFinite(count) ? count : 50,
          queue,
        })
      : [];
    const snapshots = dbPlayer
      ? await listRankSnapshots(dbPlayer.id, {
          sinceMs: 30 * 24 * 60 * 60_000,
          limit: 400,
        })
      : [];
    const patchGate = filterMatchesByRecentPatches(storedForLp, 1);
    const lpInsights = buildMatchLpLedger({
      matches: patchGate.filtered.length ? patchGate.filtered : storedForLp,
      puuid: profile.puuid,
      snapshots: snapshots.map((s) => ({
        ladderScore: s.ladderScore,
        createdAt: s.createdAt,
      })),
    });
    const preferredRole = "MIDDLE" as RoleKey;
    const todayPool = buildContextualPool({
      analysis,
      preferredRole,
      limit: 5,
      avgLpPerWin: lpInsights.avgLpPerWin,
      avgLpPerLoss: lpInsights.avgLpPerLoss,
    });
    const dayGoal = computeDayGoalProgress({
      target: null,
      stopLoss: null,
      delta: dayLp?.lpDelta ?? null,
      perHour: dayLp?.lpPerHour ?? null,
      avgLpPerWin: lpInsights.avgLpPerWin,
    });
    const chrono = storedForLp
      .map((m) => {
        const me = m.info.participants.find((p) => p.puuid === profile.puuid);
        if (!me) return null;
        return { createdAt: m.info.gameCreation, win: me.win };
      })
      .filter((g): g is { createdAt: number; win: boolean } => g != null)
      .sort((a, b) => a.createdAt - b.createdAt);
    const now = Date.now();
    let sessionStart = chrono.length;
    for (let i = chrono.length - 1; i >= 0; i--) {
      if (now - chrono[i].createdAt > SESSION_GAP_MS) break;
      sessionStart = i;
    }
    const session = chrono.slice(sessionStart);
    let lossStreak = 0;
    let winStreak = 0;
    for (let i = session.length - 1; i >= 0; i--) {
      if (session[i].win) {
        if (lossStreak > 0) break;
        winStreak += 1;
      } else {
        if (winStreak > 0) break;
        lossStreak += 1;
      }
    }
    const sessionEv = computeSessionEv({
      temporal: analysis.temporal,
      goal: dayGoal,
      nextSessionIndex: session.length + 1,
      lossStreak,
      winStreak,
      topPick: todayPool[0] ?? null,
    });
    return (
      <div className="space-y-3 pb-8">
        <p className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted)]">
          Análise avulsa de {parsed.gameName}#{parsed.tagLine}.{" "}
          <Link href="/config" className="text-[var(--alttab)] hover:underline">
            Salvar como perfil
          </Link>{" "}
          para Ranking, Timing e Histórico.
        </p>
        <PrepDecisionView
          gameName={profile.gameName}
          tagLine={profile.tagLine}
          platform={profile.platform}
          puuid={profile.puuid}
          summoner={profile.summoner}
          ranked={profile.ranked}
          analysis={analysis}
          ddragonVersion={ddragonVersion}
          idToKey={idToKey}
          runeCatalog={runeCatalog}
          dayLp={dayLp}
          todayPool={todayPool}
          dayGoal={dayGoal}
          sessionEv={sessionEv}
          queue={queue}
          count={Number.isFinite(count) ? count : 50}
          source={analysis.source}
          cached={analysis.cached}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof RiotApiError) {
      if (error.status === 404) {
        return (
          <ErrorState
            title="Invocador não encontrado"
            detail={`Não achamos ${parsed.gameName}#${parsed.tagLine} em ${region.toUpperCase()}.`}
          />
        );
      }
      return (
        <ErrorState
          title="Falha na Riot API"
          detail={error.message || `Status ${error.status}`}
        />
      );
    }
    console.error(error);
    return (
      <ErrorState
        title="Erro inesperado"
        detail="Não foi possível analisar o histórico."
      />
    );
  }
}

function ErrorState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-8 text-center">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">{title}</h1>
      <p className="mt-3 text-sm text-[var(--muted-strong)]">{detail}</p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-10 items-center rounded-lg bg-[var(--alttab)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--alttab-deep)]"
      >
        Voltar ao início
      </Link>
    </div>
  );
}

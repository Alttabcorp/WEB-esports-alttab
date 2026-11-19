import Link from "next/link";
import { CoachDashboard } from "@/components/CoachDashboard";
import {
  findPlayerByPuuid,
  getAppProfile,
  getDayLpSummaryForPlayer,
  listMatchHistory,
} from "@/lib/db/persist";
import { buildContextualPool } from "@/lib/stats/contextualPool";
import type { RoleKey } from "@/lib/stats/roles";
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
  type SummonerProfile,
} from "@/lib/riot/analyze";
import { RiotApiError } from "@/lib/riot/client";
import { isPlatformRegion, type PlatformRegion } from "@/lib/riot/regions";
import type { QueueFilter } from "@/lib/riot/types";
import type { AnalyzeResponse } from "@/lib/riot/analyze";
import type { RuneCatalog } from "@/lib/ddragon";

type PageProps = {
  params: Promise<{ region: string; riotId: string }>;
  searchParams: Promise<{
    queue?: string;
    count?: string;
    refresh?: string;
    mode?: string;
  }>;
};

type LoadResult =
  | {
      ok: true;
      profile: SummonerProfile;
      analysis: AnalyzeResponse;
      ddragonVersion: string;
      idToKey: Record<number, string>;
      runeCatalog: RuneCatalog;
    }
  | { ok: false; title: string; detail: string };

async function loadSummonerData(
  region: PlatformRegion,
  gameName: string,
  tagLine: string,
  queue: QueueFilter,
  count: number,
  forceRefresh: boolean,
): Promise<LoadResult> {
  try {
    const profile = await resolveSummonerProfile(region, gameName, tagLine, {
      preferDb: true,
      forceRefresh,
    });
    const analysis = await analyzePlayer({
      platform: region,
      puuid: profile.puuid,
      queue,
      count,
      profile,
      preferDb: true,
      forceRefresh,
    });
    const ddragonVersion = await getDdragonVersion();
    const [idToKey, runeCatalog] = await Promise.all([
      getChampionIdToKey(ddragonVersion),
      getRuneCatalog(ddragonVersion),
    ]);
    return {
      ok: true,
      profile,
      analysis,
      ddragonVersion,
      idToKey,
      runeCatalog,
    };
  } catch (error) {
    if (error instanceof RiotApiError) {
      if (error.status === 404) {
        return {
          ok: false,
          title: "Invocador não encontrado",
          detail: `Não achamos ${gameName}#${tagLine} em ${region.toUpperCase()}.`,
        };
      }
      if (error.status === 429) {
        return {
          ok: false,
          title: "Rate limit da Riot",
          detail:
            "Muitas requisições. Aguarde alguns segundos e tente de novo.",
        };
      }
      if (error.status === 500 && error.message.includes("RIOT_API_KEY")) {
        return {
          ok: false,
          title: "API key ausente",
          detail: "Crie .env.local com RIOT_API_KEY (veja .env.example).",
        };
      }
      return {
        ok: false,
        title: "Falha na Riot API",
        detail: error.message || `Status ${error.status}`,
      };
    }

    console.error(error);
    return {
      ok: false,
      title: "Erro inesperado",
      detail: "Não foi possível analisar o histórico.",
    };
  }
}

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

  const result = await loadSummonerData(
    region,
    parsed.gameName,
    parsed.tagLine,
    queue,
    Number.isFinite(count) ? count : 50,
    forceRefresh,
  );

  if (!result.ok) {
    return <ErrorState title={result.title} detail={result.detail} />;
  }

  const { profile, analysis, ddragonVersion, idToKey, runeCatalog } = result;
  const appProfile = await getAppProfile();
  const isCurrentProfile =
    appProfile?.puuid === profile.puuid &&
    appProfile.platform === profile.platform;

  const dbPlayer = await findPlayerByPuuid(profile.puuid);
  const matchHistory = dbPlayer
    ? await listMatchHistory(dbPlayer.id, profile.puuid, {
        count: 40,
        queue,
      })
    : [];

  const dayLp = dbPlayer
    ? await getDayLpSummaryForPlayer(dbPlayer.id, profile.puuid)
    : null;

  const preferredRole = (appProfile?.preferredRole as RoleKey | undefined) ?? "MIDDLE";
  const todayPool = buildContextualPool({
    analysis,
    preferredRole,
    limit: 5,
  });

  const initialMode = sp.mode === "live" ? "live" : "prep";

  return (
    <div className="space-y-4 pb-10">
      <CoachDashboard
        gameName={profile.gameName}
        tagLine={profile.tagLine}
        platform={profile.platform}
        puuid={profile.puuid}
        summoner={profile.summoner}
        ranked={profile.ranked}
        analysis={analysis}
        matchHistory={matchHistory}
        ddragonVersion={ddragonVersion}
        idToKey={idToKey}
        runeCatalog={runeCatalog}
        cached={analysis.cached}
        source={analysis.source}
        queue={queue}
        count={Number.isFinite(count) ? count : 50}
        isCurrentProfile={isCurrentProfile}
        initialMode={initialMode}
        dayLp={dayLp}
        todayPool={todayPool}
      />
    </div>
  );
}

function ErrorState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-8 text-center">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
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

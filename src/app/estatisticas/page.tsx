import { Suspense } from "react";
import { StatsExplorer } from "@/components/StatsExplorer";
import { Button, Panel } from "@/components/ui";
import {
  getAppProfile,
  getFreshAnalysisRun,
  getLatestAnalysisRun,
  getStoredMatchesForPlayer,
  listMatchHistory,
  listRankSnapshots,
} from "@/lib/db/persist";
import {
  getChampionIdToKey,
  getDdragonVersion,
  getRuneCatalog,
} from "@/lib/ddragon";
import type { QueueFilter } from "@/lib/riot/types";
import { buildChampionRoleStats } from "@/lib/stats/championRoleStats";
import { buildContextualPool } from "@/lib/stats/contextualPool";
import { buildMatchLpLedger } from "@/lib/stats/matchLpLedger";
import { buildPracticeCandidates } from "@/lib/stats/practiceCandidates";
import { analyzePlayer } from "@/lib/riot/analyze";
import { resolveSummonerFromDb } from "@/lib/riot/analyze";
import type { PlatformRegion } from "@/lib/riot/regions";
import type { RoleKey } from "@/lib/stats/roles";

type PageProps = {
  searchParams: Promise<{ champ?: string }>;
};

export default async function EstatisticasPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const initialChampionId = sp.champ ? Number(sp.champ) : null;
  const profile = await getAppProfile();

  if (!profile) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 py-10">
        <p className="data-label">Estatísticas</p>
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">
          Configure o perfil
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Salve seu invocador em Config para ver campeões e lanes do seu
          histórico.
        </p>
        <Button href="/config">Ir para configuração</Button>
      </div>
    );
  }

  const queue = profile.queue as QueueFilter;
  const count = Math.min(Math.max(profile.matchCount, 80), 200);
  const platform = profile.platform as PlatformRegion;
  const prepHref = "/preparar";

  const ddragonVersion = await getDdragonVersion();
  const [idToKey, runeCatalog, matchHistory, stored, snapshots] =
    await Promise.all([
      getChampionIdToKey(ddragonVersion),
      getRuneCatalog(ddragonVersion),
      listMatchHistory(profile.playerId, profile.puuid, {
        count: 80,
        queue,
      }),
      getStoredMatchesForPlayer(profile.playerId, {
        count: Math.min(profile.matchCount, 120),
        queue,
      }),
      listRankSnapshots(profile.playerId, {
        sinceMs: 14 * 24 * 60 * 60_000,
      }),
    ]);

  let analysis =
    (await getFreshAnalysisRun(profile.playerId, queue, count)) ??
    (await getLatestAnalysisRun(profile.playerId, queue, count, {
      allowNearbyCount: true,
    }));

  if (!analysis || analysis.analyzedGames === 0) {
    const resolved = await resolveSummonerFromDb(
      platform,
      profile.gameName,
      profile.tagLine,
    );
    if (resolved) {
      analysis = await analyzePlayer({
        platform,
        puuid: profile.puuid,
        queue,
        count,
        profile: resolved,
        preferDb: true,
        purpose: "self",
      });
    }
  }

  if (!analysis || analysis.analyzedGames === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 py-10">
        <Panel className="space-y-3 p-5">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Sem partidas ainda
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Sincronize o histórico em Config para montar estatísticas por
            campeão e lane.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button href="/config">Sincronizar</Button>
            <Button href={prepHref} variant="secondary">
              Preparar
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  const { byChampion, byChampRole } = buildChampionRoleStats(matchHistory);
  const ledger = buildMatchLpLedger({
    matches: stored,
    puuid: profile.puuid,
    snapshots: snapshots.map((s) => ({
      ladderScore: s.ladderScore,
      createdAt: s.createdAt,
    })),
  });
  const pool = buildContextualPool({
    analysis,
    preferredRole: profile.preferredRole as RoleKey,
    limit: 5,
    avgLpPerWin: ledger.avgLpPerWin,
    avgLpPerLoss: ledger.avgLpPerLoss,
  });
  const practiceCandidates = buildPracticeCandidates({
    analysis,
    pool,
    avgLpPerWin: ledger.avgLpPerWin,
    avgLpPerLoss: ledger.avgLpPerLoss,
  });

  return (
    <div className="pb-8">
      <Suspense
        fallback={
          <p className="text-sm text-[var(--muted)]">Carregando estatísticas…</p>
        }
      >
        <StatsExplorer
          champions={analysis.champions}
          roleInsights={analysis.roles}
          champOverviews={byChampion}
          byChampRole={byChampRole}
          matchHistory={matchHistory}
          ddragonVersion={ddragonVersion}
          idToKey={idToKey}
          runeCatalog={runeCatalog}
          prepHref={prepHref}
          overallWr={analysis.overallWr}
          analyzedGames={analysis.analyzedGames}
          practiceCandidates={practiceCandidates}
          initialChampionId={
            Number.isFinite(initialChampionId) ? initialChampionId : null
          }
        />
      </Suspense>
    </div>
  );
}

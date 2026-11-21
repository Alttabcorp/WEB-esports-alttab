import Link from "next/link";
import { StatsExplorer } from "@/components/StatsExplorer";
import { Button, Panel } from "@/components/ui";
import {
  getAppProfile,
  getFreshAnalysisRun,
  getLatestAnalysisRun,
  listMatchHistory,
} from "@/lib/db/persist";
import {
  getChampionIdToKey,
  getDdragonVersion,
  getRuneCatalog,
} from "@/lib/ddragon";
import { encodeRiotId } from "@/lib/format";
import type { QueueFilter } from "@/lib/riot/types";
import { buildChampionRoleStats } from "@/lib/stats/championRoleStats";
import { analyzePlayer } from "@/lib/riot/analyze";
import { resolveSummonerFromDb } from "@/lib/riot/analyze";
import type { PlatformRegion } from "@/lib/riot/regions";

export default async function EstatisticasPage() {
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
  const slug = encodeRiotId(profile.gameName, profile.tagLine);
  const prepHref = `/summoner/${profile.platform}/${slug}?queue=${profile.queue}&count=${profile.matchCount}`;

  const ddragonVersion = await getDdragonVersion();
  const [idToKey, runeCatalog, matchHistory] = await Promise.all([
    getChampionIdToKey(ddragonVersion),
    getRuneCatalog(ddragonVersion),
    listMatchHistory(profile.playerId, profile.puuid, {
      count: 80,
      queue,
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

  return (
    <div className="pb-8">
      <div className="mb-4">
        <Link
          href="/"
          className="text-sm text-[var(--alttab-soft)] hover:underline"
        >
          ← Hub
        </Link>
      </div>
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
      />
    </div>
  );
}

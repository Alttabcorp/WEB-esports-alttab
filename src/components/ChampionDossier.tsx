"use client";

import { useRouter } from "next/navigation";
import type { ChampionInsight } from "@/lib/stats/aggregate";
import type { MatchHistoryRow } from "@/lib/db/persist";
import type { RuneCatalog } from "@/lib/ddragon";
import type { LeagueEntryDto } from "@/lib/riot/types";
import { ChampionDetailPanel } from "./ChampionDetailPanel";
import { Button } from "@/components/ui";

type Props = {
  champion: ChampionInsight;
  champions: ChampionInsight[];
  matchHistory: MatchHistoryRow[];
  ddragonVersion: string;
  idToKey: Record<number, string>;
  runeCatalog: RuneCatalog;
  platform: string;
  ranked: LeagueEntryDto[];
  lpAvg?: number | null;
  lpGames?: number | null;
  alertCount?: number;
};

export function ChampionDossier({
  champion,
  champions,
  matchHistory,
  ddragonVersion,
  idToKey,
  runeCatalog,
  platform,
  ranked,
  lpAvg = null,
  lpGames = null,
}: Props) {
  const router = useRouter();

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-pretty text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
            {champion.championName}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Dossiê do campeão</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/analise?tab=ranking" variant="secondary" size="sm">
            Ranking
          </Button>
          <Button href="/" variant="ghost" size="sm">
            Hoje
          </Button>
        </div>
      </div>

      <ChampionDetailPanel
        champion={champion}
        champions={champions}
        onSelect={(id) => router.push(`/campeao/${id}`)}
        matchHistory={matchHistory}
        ddragonVersion={ddragonVersion}
        idToKey={idToKey}
        runeCatalog={runeCatalog}
        platform={platform}
        ranked={ranked}
        lpAvg={lpAvg}
        lpGames={lpGames}
      />
    </div>
  );
}

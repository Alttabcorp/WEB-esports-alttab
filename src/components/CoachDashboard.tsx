"use client";

import { useMemo, useState } from "react";
import type { AggregateResult } from "@/lib/stats/aggregate";
import type { LeagueEntryDto, SummonerDto } from "@/lib/riot/types";
import { SummonerHeader } from "./SummonerHeader";
import { ChampionRecommendations } from "./ChampionRecommendations";
import { BuildLeaderboard } from "./BuildLeaderboard";
import { MatchupTable } from "./MatchupTable";
import { RoleBreakdown } from "./RoleBreakdown";

type Props = {
  gameName: string;
  tagLine: string;
  platform: string;
  summoner: SummonerDto | null;
  ranked: LeagueEntryDto[];
  analysis: AggregateResult;
  ddragonVersion: string;
  idToKey: Record<number, string>;
  cached: boolean;
};

export function CoachDashboard({
  gameName,
  tagLine,
  platform,
  summoner,
  ranked,
  analysis,
  ddragonVersion,
  idToKey,
  cached,
}: Props) {
  const initialId =
    analysis.topRecommendations[0]?.championId ??
    analysis.champions[0]?.championId ??
    null;
  const [selectedId, setSelectedId] = useState<number | null>(initialId);

  const selected = useMemo(
    () => analysis.champions.find((c) => c.championId === selectedId) ?? null,
    [analysis.champions, selectedId],
  );

  return (
    <div className="space-y-8">
      <SummonerHeader
        gameName={gameName}
        tagLine={tagLine}
        platform={platform}
        summoner={summoner}
        ranked={ranked}
        overallWr={analysis.overallWr}
        analyzedGames={analysis.analyzedGames}
        wins={analysis.wins}
        losses={analysis.losses}
        ddragonVersion={ddragonVersion}
      />

      {cached ? (
        <p className="text-xs text-zinc-500">
          Resultado servido do cache (~20 min). Nova análise automática após o
          TTL.
        </p>
      ) : null}

      {analysis.analyzedGames < 10 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Amostra pequena ({analysis.analyzedGames} partidas). Recomendações
          terão baixa confiança — jogue mais ou aumente o número de partidas.
        </div>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
            O que jogar agora
          </h2>
          <p className="text-sm text-zinc-400">
            Ranking por Wilson score + lift vs seu WR geral (não pelo WR bruto).
          </p>
          <ChampionRecommendations
            champions={analysis.topRecommendations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            ddragonVersion={ddragonVersion}
            idToKey={idToKey}
          />
        </div>

        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
            Builds que você vence
            {selected ? ` · ${selected.championName}` : ""}
          </h2>
          <p className="text-sm text-zinc-400">
            Fingerprint dos itens principais (boots/consumíveis ignorados).
          </p>
          {selected ? (
            <BuildLeaderboard
              builds={selected.topBuilds}
              championName={selected.championName}
              ddragonVersion={ddragonVersion}
            />
          ) : (
            <p className="text-sm text-zinc-400">
              Selecione um campeão para ver builds.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
          Desempenho por role
        </h2>
        <RoleBreakdown roles={analysis.roles} />
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <MatchupTable
          title="Melhores matchups"
          matchups={analysis.bestMatchups}
          ddragonVersion={ddragonVersion}
          idToKey={idToKey}
          emptyText="Sem matchups com pelo menos 5 jogos na mesma lane."
        />
        <MatchupTable
          title="Piores matchups"
          matchups={analysis.worstMatchups}
          ddragonVersion={ddragonVersion}
          idToKey={idToKey}
          emptyText="Sem matchups fracos com amostra suficiente."
        />
      </section>
    </div>
  );
}

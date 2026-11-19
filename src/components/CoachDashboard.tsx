"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AggregateResult } from "@/lib/stats/aggregate";
import type { LeagueEntryDto, SummonerDto } from "@/lib/riot/types";
import type { RuneCatalog } from "@/lib/ddragon";
import { encodeRiotId } from "@/lib/format";
import type { MatchHistoryRow } from "@/lib/db/persist";
import type { DayLpSummary } from "@/lib/stats/lpLedger";
import type { PoolPick } from "@/lib/stats/contextualPool";
import { SummonerHeader } from "./SummonerHeader";
import { ChampionRecommendations } from "./ChampionRecommendations";
import { BuildLeaderboard } from "./BuildLeaderboard";
import { RuneLeaderboard } from "./RuneLeaderboard";
import { MatchupTable } from "./MatchupTable";
import { RoleBreakdown } from "./RoleBreakdown";
import { SaveProfileButton } from "./SaveProfileButton";
import { MetaComparePanel } from "./MetaComparePanel";
import { PerformanceAlerts } from "./PerformanceAlerts";
import { PerformanceInsights } from "./PerformanceInsights";
import { MatchHistoryPanel } from "./MatchHistoryPanel";
import { ReferencePlayersPanel } from "./ReferencePlayersPanel";
import { LiveGamePanel } from "./LiveGamePanel";
import { DayLpCard } from "./DayLpCard";
import { SessionPlanCard } from "./SessionPlanCard";
import { TodayPoolPanel } from "./TodayPoolPanel";
import { Modal } from "./Modal";
import { Button, Menu, MenuItem, Panel, Tabs } from "@/components/ui";

type ModeId = "prep" | "live";
type PrepTab = "play" | "timing" | "history" | "matchups";
type ChampModalTab = "refs" | "meta" | "more-builds" | "more-runes";

const PREP_TABS: { id: PrepTab; label: string; hint: string }[] = [
  { id: "play", label: "O que jogar", hint: "Picks, builds e runas" },
  { id: "timing", label: "Quando jogar", hint: "Horário, dia e alertas" },
  { id: "history", label: "Histórico", hint: "Partidas salvas" },
  { id: "matchups", label: "Matchups", hint: "Lanes e roles" },
];

type Props = {
  gameName: string;
  tagLine: string;
  platform: string;
  puuid: string;
  summoner: SummonerDto | null;
  ranked: LeagueEntryDto[];
  analysis: AggregateResult;
  matchHistory: MatchHistoryRow[];
  ddragonVersion: string;
  idToKey: Record<number, string>;
  runeCatalog: RuneCatalog;
  cached: boolean;
  source?: "db" | "riot" | "redis";
  queue?: string;
  count?: number;
  isCurrentProfile?: boolean;
  initialMode?: ModeId;
  dayLp?: DayLpSummary | null;
  todayPool?: PoolPick[];
};

export function CoachDashboard({
  gameName,
  tagLine,
  platform,
  puuid,
  summoner,
  ranked,
  analysis,
  matchHistory,
  ddragonVersion,
  idToKey,
  runeCatalog,
  cached,
  source,
  queue = "ranked",
  count = 50,
  isCurrentProfile = false,
  initialMode = "prep",
  dayLp = null,
  todayPool = [],
}: Props) {
  const initialId =
    analysis.topRecommendations[0]?.championId ??
    analysis.champions[0]?.championId ??
    null;
  const [selectedId, setSelectedId] = useState<number | null>(initialId);
  const [mode, setMode] = useState<ModeId>(initialMode);
  const [prepTab, setPrepTab] = useState<PrepTab>("play");
  const [champModalOpen, setChampModalOpen] = useState(false);
  const [champModalTab, setChampModalTab] = useState<ChampModalTab>("refs");
  const [liveDetected, setLiveDetected] = useState(false);

  const selected = useMemo(
    () => analysis.champions.find((c) => c.championId === selectedId) ?? null,
    [analysis.champions, selectedId],
  );

  const alertCount = analysis.temporal?.alerts?.length ?? 0;
  const slug = encodeRiotId(gameName, tagLine);
  const draftHref = `/summoner/${platform}/${slug}/draft?queue=${queue}&count=${count}`;
  const sourceLabel =
    source === "db"
      ? "Banco local"
      : source === "redis"
        ? "Cache rápido"
        : cached
          ? "Cache"
          : "Riot API";

  return (
    <div className="space-y-4">
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
        dayLpDelta={dayLp?.lpDelta ?? null}
      />

      <DayLpCard summary={dayLp} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          ariaLabel="Modo do companion"
          value={mode}
          onChange={setMode}
          items={[
            { id: "prep", label: "Preparar" },
            {
              id: "live",
              label: "Em partida",
              badge: liveDetected ? "AO VIVO" : undefined,
            },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button href={draftHref} variant="secondary" size="sm">
            Seleção
          </Button>
          {alertCount > 0 ? (
            <Button
              variant="warn"
              size="sm"
              onClick={() => {
                setMode("prep");
                setPrepTab("timing");
              }}
            >
              {alertCount} alerta{alertCount > 1 ? "s" : ""}
            </Button>
          ) : null}
          <Menu label="Perfil">
            <SaveProfileButton
              region={platform}
              riotId={`${gameName}#${tagLine}`}
              queue={queue}
              matchCount={count}
              isCurrentProfile={isCurrentProfile}
              variant="menu"
            />
            <MenuItem
              href={`/summoner/${platform}/${slug}?queue=${queue}&count=${count}&refresh=1`}
            >
              Atualizar da Riot
            </MenuItem>
            <MenuItem href="/referencias">Referências</MenuItem>
            <MenuItem href="/config">Configuração</MenuItem>
            <div className="border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--muted)]">
              Fonte: {sourceLabel}
            </div>
          </Menu>
        </div>
      </div>

      {liveDetected && mode === "prep" ? (
        <Panel className="flex flex-wrap items-center justify-between gap-3 border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3">
          <p className="text-sm text-emerald-50">
            Partida detectada. Abra o modo Em partida para builds e itens.
          </p>
          <Button size="sm" onClick={() => setMode("live")}>
            Ir para Em partida
          </Button>
        </Panel>
      ) : null}

      {analysis.analyzedGames < 10 ? (
        <Panel className="border-[var(--warn)]/30 bg-[var(--warn)]/10 px-4 py-3 text-sm text-amber-50">
          Amostra pequena ({analysis.analyzedGames} partidas). Em Config,
          sincronize 200–500 para recomendações mais firmes.
        </Panel>
      ) : null}

      <section className={mode === "live" ? "space-y-3" : "hidden"}>
        <div>
          <h2 className="text-lg font-semibold text-white">Em partida</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Build e itens primeiro. KDA e time em seguida.
          </p>
        </div>
        <LiveGamePanel
          platform={platform}
          puuid={puuid}
          ddragonVersion={ddragonVersion}
          idToKey={idToKey}
          runeCatalog={runeCatalog}
          active={mode === "live"}
          draftHref={draftHref}
          onInGameChange={setLiveDetected}
        />
      </section>

      {mode === "prep" ? (
        <div className="space-y-4">
          <nav
            aria-label="Seções de preparação"
            className="sticky top-0 z-20 -mx-1 overflow-x-auto bg-[var(--background)]/90 px-1 py-2 backdrop-blur-md"
          >
            <Tabs
              ariaLabel="Preparar"
              value={prepTab}
              onChange={setPrepTab}
              size="sm"
              items={PREP_TABS.map((t) => ({
                id: t.id,
                label: t.label,
                hint: t.hint,
                badge: t.id === "timing" && alertCount > 0 ? alertCount : undefined,
              }))}
            />
          </nav>

          {prepTab === "play" ? (
            <div className="space-y-4">
              <SessionPlanCard platform={platform} puuid={puuid} />
              <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-4">
                <TodayPoolPanel
                  picks={todayPool}
                  ddragonVersion={ddragonVersion}
                  idToKey={idToKey}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
                <Panel className="space-y-3 p-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Ranking geral
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Escolha o champ — a build principal aparece ao lado.
                  </p>
                </div>
                <ChampionRecommendations
                  champions={analysis.topRecommendations}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  ddragonVersion={ddragonVersion}
                  idToKey={idToKey}
                />
                {analysis.champions.length >
                analysis.topRecommendations.length ? (
                  <details className="pt-1">
                    <summary className="cursor-pointer text-sm text-[var(--muted)] hover:text-white">
                      Ver mais campeões ({analysis.champions.length})
                    </summary>
                    <div className="mt-3">
                      <ChampionRecommendations
                        champions={analysis.champions.slice(0, 12)}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        ddragonVersion={ddragonVersion}
                        idToKey={idToKey}
                      />
                    </div>
                  </details>
                ) : null}
              </Panel>
              </div>

              <Panel className="space-y-4 p-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selected ? selected.championName : "Build do champ"}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Ordem de itens e runa mais estáveis no seu histórico.
                  </p>
                </div>
                {selected ? (
                  <>
                    <div>
                      <p className="data-label mb-2">Build principal</p>
                      <BuildLeaderboard
                        builds={selected.topBuilds.slice(0, 2)}
                        championName={selected.championName}
                        ddragonVersion={ddragonVersion}
                        large
                      />
                    </div>
                    <div>
                      <p className="data-label mb-2">Runas</p>
                      <RuneLeaderboard
                        runes={(selected.topRunes ?? []).slice(0, 1)}
                        championName={selected.championName}
                        runeCatalog={runeCatalog}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setChampModalTab("refs");
                          setChampModalOpen(true);
                        }}
                      >
                        Referências e meta
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setChampModalTab("more-builds");
                          setChampModalOpen(true);
                        }}
                      >
                        Mais builds
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--muted)]">
                    Selecione um campeão na lista.
                  </p>
                )}
              </Panel>
            </section>
            </div>
          ) : null}

          {prepTab === "timing" ? (
            <div className="space-y-4">
              {analysis.temporal?.alerts?.length ? (
                <PerformanceAlerts alerts={analysis.temporal.alerts} />
              ) : null}
              {analysis.temporal ? (
                <PerformanceInsights
                  temporal={analysis.temporal}
                  overallWr={analysis.overallWr}
                />
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  Sem dados temporais ainda.
                </p>
              )}
            </div>
          ) : null}

          {prepTab === "history" ? (
            <MatchHistoryPanel
              matches={matchHistory}
              ddragonVersion={ddragonVersion}
              idToKey={idToKey}
            />
          ) : null}

          {prepTab === "matchups" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
                <p className="text-sm text-[var(--muted)]">Por role</p>
                <RoleBreakdown roles={analysis.roles} />
              </div>
              <section className="grid gap-4 lg:grid-cols-2">
                <Panel className="p-4">
                  <MatchupTable
                    title="Melhores matchups"
                    matchups={analysis.bestMatchups}
                    ddragonVersion={ddragonVersion}
                    idToKey={idToKey}
                    emptyText="Sem matchups repetidos ainda (mín. 2 jogos no mesmo confronto)."
                  />
                </Panel>
                <Panel className="p-4">
                  <MatchupTable
                    title="Piores matchups"
                    matchups={analysis.worstMatchups}
                    ddragonVersion={ddragonVersion}
                    idToKey={idToKey}
                    emptyText="Sem matchups fracos repetidos ainda (mín. 2 jogos)."
                  />
                </Panel>
              </section>
            </div>
          ) : null}
        </div>
      ) : null}

      <Modal
        open={champModalOpen && !!selected}
        title={selected ? selected.championName : "Campeão"}
        onClose={() => setChampModalOpen(false)}
        wide
      >
        {selected ? (
          <div className="space-y-4">
            <Tabs
              ariaLabel="Detalhes do campeão"
              value={champModalTab}
              onChange={setChampModalTab}
              size="sm"
              items={[
                { id: "refs", label: "Referências" },
                { id: "meta", label: "Meta" },
                { id: "more-builds", label: "Builds" },
                { id: "more-runes", label: "Runas" },
              ]}
            />

            {champModalTab === "more-builds" ? (
              <BuildLeaderboard
                builds={selected.topBuilds}
                championName={selected.championName}
                ddragonVersion={ddragonVersion}
                large
              />
            ) : null}

            {champModalTab === "more-runes" ? (
              <RuneLeaderboard
                runes={selected.topRunes ?? []}
                championName={selected.championName}
                runeCatalog={runeCatalog}
              />
            ) : null}

            {champModalTab === "refs" ? (
              <ReferencePlayersPanel
                championId={selected.championId}
                championName={selected.championName}
                ddragonVersion={ddragonVersion}
                runeCatalog={runeCatalog}
              />
            ) : null}

            {champModalTab === "meta" ? (
              <MetaComparePanel
                championId={selected.championId}
                championName={selected.championName}
                platform={platform}
                ranked={ranked}
                ddragonVersion={ddragonVersion}
                runeCatalog={runeCatalog}
              />
            ) : null}
          </div>
        ) : null}
      </Modal>

      <p className="pt-2">
        <Link
          href="/"
          className="text-sm text-[var(--alttab-soft)] hover:underline"
        >
          ← Início
        </Link>
      </p>
    </div>
  );
}

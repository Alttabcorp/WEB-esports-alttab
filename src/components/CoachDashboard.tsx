"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AggregateResult } from "@/lib/stats/aggregate";
import type { LeagueEntryDto, SummonerDto } from "@/lib/riot/types";
import type { RuneCatalog } from "@/lib/ddragon";
import { encodeRiotId, pct } from "@/lib/format";
import type { MatchHistoryRow } from "@/lib/db/persist";
import type { DayLpSummary } from "@/lib/stats/lpLedger";
import type { PoolPick } from "@/lib/stats/contextualPool";
import { SummonerHeader } from "./SummonerHeader";
import { ChampionRecommendations } from "./ChampionRecommendations";
import { ChampionDetailPanel } from "./ChampionDetailPanel";
import { BuildLeaderboard } from "./BuildLeaderboard";
import { RuneLeaderboard } from "./RuneLeaderboard";
import { MatchupTable } from "./MatchupTable";
import { RoleBreakdown } from "./RoleBreakdown";
import { SaveProfileButton } from "./SaveProfileButton";
import { MetaComparePanel } from "./MetaComparePanel";
import { PerformanceAlerts } from "./PerformanceAlerts";
import { TimingDecisionPanel } from "./TimingDecisionPanel";
import { MatchHistoryPanel } from "./MatchHistoryPanel";
import { ReferencePlayersPanel } from "./ReferencePlayersPanel";
import { DayLpCard } from "./DayLpCard";
import { DayGoalCard } from "./DayGoalCard";
import { TodayPoolPanel } from "./TodayPoolPanel";
import { DecisionCard } from "./DecisionCard";
import { Modal } from "./Modal";
import { Button, Menu, MenuItem, Panel, Stat, Tabs } from "@/components/ui";
import type { DayGoalProgress } from "@/lib/stats/dayGoal";
import type { MatchLpInsights } from "@/lib/stats/matchLpLedger";
import type { DayLpCalendarEntry } from "@/lib/stats/lpCalendar";
import type { ChampEndgameBaseline } from "@/lib/stats/endgameMetrics";
import type { SessionEvResult } from "@/lib/stats/sessionEv";
import type { DecisionModel } from "@/lib/alerts/decision";

type PrepTab = "play" | "timing" | "history";
type ChampModalTab = "refs" | "meta" | "more-builds" | "more-runes";

const PREP_TABS: { id: PrepTab; label: string; hint: string }[] = [
  { id: "play", label: "O que jogar", hint: "Picks, builds e matchups" },
  { id: "timing", label: "Quando", hint: "PDL, horário e calendário" },
  { id: "history", label: "Histórico", hint: "Partidas com páginas" },
];

function parsePrepTab(raw: string | null | undefined): PrepTab {
  if (raw === "timing" || raw === "history" || raw === "play") return raw;
  return "play";
}

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
  initialMode?: "prep" | "live";
  initialTab?: PrepTab;
  dayLp?: DayLpSummary | null;
  todayPool?: PoolPick[];
  dayGoal?: DayGoalProgress | null;
  sessionEv?: SessionEvResult | null;
  lpInsights?: MatchLpInsights | null;
  lpCalendar?: DayLpCalendarEntry[];
  endgameBaselines?: ChampEndgameBaseline[];
  currentPatch?: string | null;
  patchNote?: string | null;
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
  initialTab = "play",
  dayLp = null,
  todayPool = [],
  dayGoal = null,
  sessionEv = null,
  lpInsights = null,
  lpCalendar = [],
  endgameBaselines = [],
  currentPatch = null,
  patchNote = null,
}: Props) {
  const initialId =
    todayPool[0]?.championId ??
    analysis.topRecommendations[0]?.championId ??
    analysis.champions[0]?.championId ??
    null;
  /** Ranking + painel de detalhe (independente do pool). */
  const [selectedId, setSelectedId] = useState<number | null>(initialId);
  /** Pick em destaque no quadro "Agora" (não sequestra o ranking). */
  const [poolFeaturedId, setPoolFeaturedId] = useState<number | null>(
    todayPool[0]?.championId ?? null,
  );
  const [prepTab, setPrepTab] = useState<PrepTab>(
    initialMode === "live" ? "play" : parsePrepTab(initialTab),
  );
  const [champModalOpen, setChampModalOpen] = useState(false);
  const [champModalTab, setChampModalTab] = useState<ChampModalTab>("refs");
  const [liveDetected, setLiveDetected] = useState(false);

  // Só estado local — NÃO alterar a URL (replaceState/router.replace
  // no App Router dispara loading.tsx e faz a tela “piscar”).
  const changeTab = useCallback((id: PrepTab) => {
    setPrepTab(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/live/client?puuid=${encodeURIComponent(puuid)}`,
        );
        const data = (await res.json()) as {
          bridgeOnline?: boolean;
          phase?: string | null;
        };
        if (cancelled) return;
        const phase = data.phase;
        const next = Boolean(
          data.bridgeOnline &&
            (phase === "inGame" || phase === "draft" || phase === "loading"),
        );
        setLiveDetected((prev) => (prev === next ? prev : next));
      } catch {
        if (!cancelled) {
          setLiveDetected((prev) => (prev === false ? prev : false));
        }
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [puuid]);

  const selected = useMemo(
    () => analysis.champions.find((c) => c.championId === selectedId) ?? null,
    [analysis.champions, selectedId],
  );

  const alertCount = analysis.temporal?.alerts?.length ?? 0;
  const slug = encodeRiotId(gameName, tagLine);
  const prepHref = `/summoner/${platform}/${slug}?queue=${queue}&count=${count}`;
  const timingHref = `${prepHref}&tab=timing`;
  const draftHref = `/summoner/${platform}/${slug}/draft?queue=${queue}&count=${count}`;
  const syncHref = `${prepHref}&refresh=1`;
  const sourceLabel =
    source === "db"
      ? "Banco local"
      : source === "redis"
        ? "Cache rápido"
        : cached
          ? "Cache"
          : "Riot API";
  const bestWindow = analysis.temporal?.bestPlayWindow?.label ?? null;
  const topPick = todayPool[0] ?? null;
  const hasAlerts = Boolean(analysis.temporal?.alerts?.length);
  const playDecision: DecisionModel | null =
    !hasAlerts && sessionEv
      ? {
          id: "prep-session-ev",
          tone:
            sessionEv.label === "stop"
              ? "stop"
              : sessionEv.label === "go"
                ? "go"
                : "warn",
          verb: sessionEv.verb,
          detail: sessionEv.reasons[0]
            ? `${sessionEv.detail} · ${sessionEv.reasons[0]}`
            : sessionEv.detail,
          actions: [
            { label: "Abrir Coach", href: "/coach", kind: "primary" },
            { label: "Ver horários", kind: "secondary" },
          ],
        }
      : null;

  return (
    <div className="space-y-3">
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

      <div className="grid gap-2 sm:grid-cols-3">
        <Stat
          label="WR amostra"
          value={pct(analysis.overallWr)}
          hint={`${analysis.analyzedGames} jogos`}
        />
        <Stat
          label="PDL hoje"
          value={
            dayLp?.lpDelta == null
              ? "—"
              : dayLp.lpDelta > 0
                ? `+${dayLp.lpDelta}`
                : String(dayLp.lpDelta)
          }
        />
        <Stat
          label="Melhor horário"
          value={bestWindow ?? "—"}
          hint={bestWindow ? "ver aba Quando" : "precisa de mais dados"}
        />
      </div>

      {dayGoal ? (
        <DayGoalCard goal={dayGoal} sessionEv={sessionEv} />
      ) : (
        <DayLpCard summary={dayLp} />
      )}

      {hasAlerts && analysis.temporal?.alerts?.length ? (
        <PerformanceAlerts
          alerts={analysis.temporal.alerts}
          prepHref={prepHref}
          timingHref={timingHref}
          onGoTiming={() => changeTab("timing")}
        />
      ) : playDecision && prepTab !== "timing" ? (
        <DecisionCard
          decision={playDecision}
          onAction={(label) => {
            if (label === "Ver horários") changeTab("timing");
          }}
        />
      ) : null}

      <Panel
        strong
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
      >
        <div className="min-w-0 flex-1">
          <p className="data-label">Próximo passo</p>
          <p className="text-sm text-[var(--muted-strong)]">
            {liveDetected
              ? "Bridge detectou atividade — abra o Coach no 2º monitor."
              : topPick
                ? `Estude ${topPick.championName} abaixo, depois abra o Coach na fila.`
                : "Escolha um champ, revise build/runas e abra o Coach na fila."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/coach" size="sm">
            Abrir Coach
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => changeTab("timing")}
          >
            Ver horários
          </Button>
          <Button href={syncHref} variant="ghost" size="sm">
            Sync Riot
          </Button>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Seções de preparação"
          className="min-w-0 flex-1 overflow-x-auto"
        >
          <Tabs
            ariaLabel="Preparar"
            value={prepTab}
            onChange={changeTab}
            size="sm"
            items={PREP_TABS.map((t) => ({
              id: t.id,
              label: t.label,
              hint: t.hint,
              badge:
                t.id === "timing" && alertCount > 0 ? alertCount : undefined,
            }))}
          />
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Button href={draftHref} variant="ghost" size="sm">
            Seleção manual
          </Button>
          <Menu label="Mais">
            <SaveProfileButton
              region={platform}
              riotId={`${gameName}#${tagLine}`}
              queue={queue}
              matchCount={count}
              isCurrentProfile={isCurrentProfile}
              variant="menu"
            />
            <MenuItem href={syncHref}>Atualizar da Riot</MenuItem>
            <MenuItem href="/estatisticas">Estatísticas</MenuItem>
            <MenuItem href="/referencias">Referências</MenuItem>
            <MenuItem href="/config">Configuração</MenuItem>
            <MenuItem href="/">Hub</MenuItem>
            <div className="border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--muted)]">
              Fonte: {sourceLabel}
            </div>
          </Menu>
        </div>
      </div>

      {analysis.analyzedGames < 10 ? (
        <Panel className="border-[var(--warn)]/30 bg-[var(--warn)]/10 px-4 py-3 text-sm text-[var(--warn)]">
          Amostra pequena ({analysis.analyzedGames} partidas). Em Config,
          sincronize 200–500 para recomendações mais firmes.
        </Panel>
      ) : null}

      {prepTab === "play" ? (
        <div className="space-y-4">
          <TodayPoolPanel
            picks={todayPool}
            champions={analysis.champions}
            ddragonVersion={ddragonVersion}
            idToKey={idToKey}
            runeCatalog={runeCatalog}
            featuredId={poolFeaturedId}
            onFeature={(id) => {
              setPoolFeaturedId(id);
            }}
            champHref="/ranking"
            rankingHref="/ranking"
            statsHref="/estatisticas"
            coachHref="/coach"
          />

          <section className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <Panel className="min-w-0 space-y-3 p-3 sm:p-4">
              <div>
                <h2 className="type-title text-base">Ranking geral</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Clique num champ para atualizar o painel ao lado. O pool acima
                  é independente.
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
                  <summary className="cursor-pointer text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
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
              <Button href="/estatisticas" variant="ghost" size="sm">
                Abrir página de estatísticas →
              </Button>
            </Panel>

            <div className="min-w-0">
              {selected ? (
                <ChampionDetailPanel
                  champion={selected}
                  champions={analysis.champions}
                  onSelect={setSelectedId}
                  matchHistory={matchHistory}
                  ddragonVersion={ddragonVersion}
                  idToKey={idToKey}
                  runeCatalog={runeCatalog}
                  platform={platform}
                  ranked={ranked}
                  lpAvg={
                    lpInsights?.byChampion.find(
                      (r) => r.label === selected.championName,
                    )?.lpAvg ?? null
                  }
                  lpGames={
                    lpInsights?.byChampion.find(
                      (r) => r.label === selected.championName,
                    )?.games ?? null
                  }
                  onOpenModal={(t) => {
                    setChampModalTab(t);
                    setChampModalOpen(true);
                  }}
                />
              ) : (
                <Panel className="space-y-3 p-3 sm:p-4">
                  <h2 className="type-title text-base">Dados do campeão</h2>
                  <p className="text-sm text-[var(--muted)]">
                    Clique num campeão no ranking à esquerda.
                  </p>
                </Panel>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
              <h2 className="type-title text-base">Matchups</h2>
              <RoleBreakdown roles={analysis.roles} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
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
            </div>
          </section>
        </div>
      ) : null}

      {prepTab === "timing" ? (
        <div className="space-y-4">
          {analysis.temporal ? (
            <TimingDecisionPanel
              temporal={analysis.temporal}
              overallWr={analysis.overallWr}
              sessionEv={sessionEv}
              lpInsights={lpInsights}
              calendar={lpCalendar}
              currentPatch={currentPatch}
              patchNote={patchNote}
              prepHref={prepHref}
              timingHref={timingHref}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Sem dados temporais ainda.
            </p>
          )}
          {endgameBaselines.length > 0 ? (
            <details className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--foreground)] marker:content-none [&::-webkit-details-marker]:hidden">
                Baseline de farm (fim de jogo)
              </summary>
              <div className="space-y-2 border-t border-[var(--border)] px-4 pb-4 pt-2">
                <p className="text-sm text-[var(--muted)]">
                  CS/min e gold/min médios — proxy sem timeline Riot.
                </p>
                <ul className="space-y-2">
                  {endgameBaselines.slice(0, 6).map((b) => (
                    <li
                      key={b.championId}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span className="font-medium text-[var(--foreground)]">
                        {b.championName}
                      </span>
                      <span className="tabular text-[var(--muted)]">
                        {b.avgCsPerMin} CS/min · {b.avgGoldPerMin} g/min
                        {b.wrWhenBehindCs != null
                          ? ` · atrás em CS: ${Math.round(b.wrWhenBehindCs * 100)}% WR (${b.behindCsGames})`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

      {prepTab === "history" ? (
        <MatchHistoryPanel
          matches={matchHistory}
          ddragonVersion={ddragonVersion}
          idToKey={idToKey}
        />
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

"use client";

import { useEffect, useState } from "react";
import type { AggregateResult } from "@/lib/stats/aggregate";
import type { LeagueEntryDto, SummonerDto } from "@/lib/riot/types";
import type { RuneCatalog } from "@/lib/ddragon";
import type { PoolPick } from "@/lib/stats/contextualPool";
import type { DayGoalProgress } from "@/lib/stats/dayGoal";
import type { DayLpSummary } from "@/lib/stats/lpLedger";
import type { SessionEvResult } from "@/lib/stats/sessionEv";
import type { DecisionModel } from "@/lib/alerts/decision";
import { withPracticeHint } from "@/lib/alerts/decision";
import type { PracticeCandidate } from "@/lib/stats/practiceCandidates";
import type { RoleKey } from "@/lib/stats/roles";
import { pct } from "@/lib/format";
import { SummonerHeader } from "./SummonerHeader";
import { TodayPoolPanel } from "./TodayPoolPanel";
import { DayGoalCard } from "./DayGoalCard";
import { DayLpCard } from "./DayLpCard";
import { DecisionCard } from "./DecisionCard";
import { PerformanceAlerts } from "./PerformanceAlerts";
import { PracticeNormalsPanel } from "./PracticeNormalsPanel";
import { PrepSubnav } from "./PrepSubnav";
import { Button, Panel, Stat } from "@/components/ui";

type Props = {
  gameName: string;
  tagLine: string;
  platform: string;
  puuid: string;
  summoner: SummonerDto | null;
  ranked: LeagueEntryDto[];
  analysis: AggregateResult;
  ddragonVersion: string;
  idToKey: Record<number, string>;
  runeCatalog: RuneCatalog;
  dayLp?: DayLpSummary | null;
  dayLpSolo?: DayLpSummary | null;
  dayLpFlex?: DayLpSummary | null;
  trackQueue?: string | null;
  todayPool?: PoolPick[];
  preferredRole?: RoleKey | null;
  dayGoal?: DayGoalProgress | null;
  sessionEv?: SessionEvResult | null;
  practiceCandidates?: PracticeCandidate[];
  queue?: string;
  count?: number;
  source?: "db" | "riot" | "redis";
  cached?: boolean;
};

export function PrepDecisionView({
  gameName,
  tagLine,
  platform,
  puuid,
  summoner,
  ranked,
  analysis,
  ddragonVersion,
  idToKey,
  runeCatalog,
  dayLp = null,
  dayLpSolo = null,
  dayLpFlex = null,
  trackQueue = null,
  todayPool = [],
  preferredRole = null,
  dayGoal = null,
  sessionEv = null,
  practiceCandidates = [],
  queue = "ranked",
  count = 50,
  source,
  cached = false,
}: Props) {
  const [poolFeaturedId, setPoolFeaturedId] = useState<number | null>(
    todayPool[0]?.championId ?? null,
  );
  const [liveDetected, setLiveDetected] = useState(false);

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
        if (!cancelled) setLiveDetected(false);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [puuid]);

  const alertCount = analysis.temporal?.alerts?.length ?? 0;
  const hasAlerts = alertCount > 0;
  const topPick = todayPool[0] ?? null;
  const bestWindow = analysis.temporal?.bestPlayWindow?.label ?? null;
  const syncHref = `/preparar?refresh=1&queue=${queue}&count=${count}`;
  const featuredHref = "/ranking";

  const playDecisionRaw: DecisionModel | null =
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
          detail: [
            sessionEv.detail,
            ...sessionEv.reasons.slice(0, 3),
          ]
            .filter(Boolean)
            .join(" · "),
          actions: [
            { label: "Abrir Coach", href: "/coach", kind: "primary" },
            { label: "Ver horários", href: "/timing", kind: "secondary" },
          ],
          secondary: sessionEv.reasons.slice(3).map((r, i) => ({
            id: `ev-reason-${i}`,
            severity: "info" as const,
            title: "Motivo",
            detail: r,
          })),
        }
      : null;
  const playDecision = playDecisionRaw
    ? withPracticeHint(playDecisionRaw, practiceCandidates)
    : null;

  const sourceLabel =
    source === "db"
      ? "Banco local"
      : source === "redis"
        ? "Cache rápido"
        : cached
          ? "Cache"
          : "Riot API";

  return (
    <div className="space-y-3 pb-8">
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
          label="Melhor horário"
          value={bestWindow ?? "—"}
          hint={bestWindow ? "ver Quando" : "precisa de mais dados"}
        />
        <Stat
          label="Fila ativa"
          value={
            dayLpSolo && dayLpFlex
              ? (dayLpFlex.gamesToday > dayLpSolo.gamesToday
                  ? "Flex"
                  : dayLpSolo.gamesToday > 0
                    ? "Solo"
                    : dayLpFlex.gamesToday > 0
                      ? "Flex"
                      : "—")
              : "—"
          }
          hint="PDL separado abaixo"
        />
      </div>

      <DayLpCard
        solo={dayLpSolo}
        flex={dayLpFlex}
        summary={dayLp}
        trackQueue={trackQueue ?? queue}
      />

      {dayGoal ? <DayGoalCard goal={dayGoal} sessionEv={sessionEv} /> : null}

      {hasAlerts && analysis.temporal?.alerts?.length ? (
        <PerformanceAlerts
          alerts={analysis.temporal.alerts}
          prepHref="/preparar"
          timingHref="/timing"
          practiceCandidates={practiceCandidates}
        />
      ) : playDecision ? (
        <DecisionCard decision={playDecision} />
      ) : null}

      <PrepSubnav alertCount={alertCount} />

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
                ? `Estude ${topPick.championName}, depois abra o Coach na fila.`
                : "Escolha um pick no pool e abra o Coach na fila."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/coach" size="sm">
            Abrir Coach
          </Button>
          <Button href="/timing" variant="secondary" size="sm">
            Quando jogar
          </Button>
          <Button href={syncHref} variant="ghost" size="sm">
            Sync Riot
          </Button>
        </div>
      </Panel>

      {analysis.analyzedGames < 10 ? (
        <Panel className="border-[var(--warn)]/30 bg-[var(--warn)]/10 px-4 py-3 text-sm text-[var(--warn)]">
          Amostra pequena ({analysis.analyzedGames} partidas). Em Config,
          sincronize 200–500 para recomendações mais firmes.
        </Panel>
      ) : null}

      <TodayPoolPanel
        picks={todayPool}
        champions={analysis.champions}
        ddragonVersion={ddragonVersion}
        idToKey={idToKey}
        runeCatalog={runeCatalog}
        preferredRole={preferredRole}
        featuredId={poolFeaturedId}
        onFeature={setPoolFeaturedId}
        champHref={featuredHref}
        rankingHref="/ranking"
        statsHref="/estatisticas"
        coachHref="/coach"
      />

      {practiceCandidates.length > 0 ? (
        <PracticeNormalsPanel
          candidates={practiceCandidates}
          ddragonVersion={ddragonVersion}
          idToKey={idToKey}
          compact
        />
      ) : null}

      <p className="pt-1 text-center text-[11px] text-[var(--muted)]">
        Fonte: {sourceLabel} · {gameName}#{tagLine} · {platform.toUpperCase()}
      </p>
    </div>
  );
}

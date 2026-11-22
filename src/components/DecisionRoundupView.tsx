"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { AggregateResult } from "@/lib/stats/aggregate";
import type { RuneCatalog } from "@/lib/ddragon";
import { championIconUrl, profileIconUrl } from "@/lib/ddragon";
import {
  groupPoolByRole,
  type PoolPick,
} from "@/lib/stats/contextualPool";
import type { DayGoalProgress } from "@/lib/stats/dayGoal";
import { dayGoalVerb } from "@/lib/stats/dayGoal";
import { buildDecisionComments } from "@/lib/stats/decisionComments";
import type { DayLpSummary } from "@/lib/stats/lpLedger";
import { QUEUE_LABEL, FLEX_QUEUE, SOLO_QUEUE } from "@/lib/stats/lpLedger";
import type { PracticeCandidate } from "@/lib/stats/practiceCandidates";
import type { SessionEvResult } from "@/lib/stats/sessionEv";
import { ROLE_LABELS, type RoleKey } from "@/lib/stats/roles";
import { pct } from "@/lib/format";
import { PracticeNormalsPanel } from "./PracticeNormalsPanel";
import { QueueTrackSwitch } from "./QueueTrackSwitch";
import { SessionFlowStrip } from "./SessionFlowStrip";
import { StatsDecisionComments } from "./StatsDecisionComments";
import { TodayPoolPanel } from "./TodayPoolPanel";
import { Button, Panel } from "@/components/ui";

type Props = {
  gameName: string;
  tagLine: string;
  platform: string;
  profileIconId: number | null;
  analysis: AggregateResult;
  ddragonVersion: string;
  idToKey: Record<number, string>;
  runeCatalog: RuneCatalog;
  dayLpSolo: DayLpSummary | null;
  dayLpFlex: DayLpSummary | null;
  trackQueue: string;
  todayPool: PoolPick[];
  preferredRole: RoleKey;
  dayGoal: DayGoalProgress | null;
  sessionEv: SessionEvResult | null;
  practiceCandidates: PracticeCandidate[];
  alertCount?: number;
  matchCount?: number;
};

function QueueScorecard({
  summary,
  emphasize,
}: {
  summary: DayLpSummary | null;
  emphasize?: boolean;
}) {
  if (!summary) {
    return (
      <div className="rounded-[var(--radius)] bg-[var(--surface-2)] px-3 py-3">
        <p className="data-label">—</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Sem dados hoje</p>
      </div>
    );
  }
  const label = QUEUE_LABEL[summary.queueType] ?? summary.queueType;
  const delta = summary.lpDelta;
  const deltaLabel =
    delta == null ? "—" : delta > 0 ? `+${delta}` : String(delta);
  const deltaColor =
    delta == null
      ? "text-[var(--foreground)]"
      : delta > 0
        ? "text-[var(--success)]"
        : delta < 0
          ? "text-[var(--danger)]"
          : "text-[var(--foreground)]";

  return (
    <div
      className={`rounded-[var(--radius)] px-3 py-3 ${
        emphasize
          ? "bg-[var(--alttab)]/8 ring-1 ring-[var(--alttab)]/25"
          : "bg-[var(--surface-2)]"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="data-label">{label}</p>
        {emphasize ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--alttab)]">
            Acompanhando
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-4">
        <p className="text-3xl font-bold tabular-nums text-[var(--success)]">
          {summary.winsToday}
          <span className="ml-1 text-sm font-medium text-[var(--muted)]">W</span>
        </p>
        <p className="text-3xl font-bold tabular-nums text-[var(--danger)]">
          {summary.lossesToday}
          <span className="ml-1 text-sm font-medium text-[var(--muted)]">L</span>
        </p>
        <p className={`text-xl font-semibold tabular-nums ${deltaColor}`}>
          {deltaLabel}
          <span className="ml-1 text-xs font-medium text-[var(--muted)]">
            PDL
          </span>
        </p>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {summary.gamesToday} jogos hoje
        {summary.current
          ? ` · ${summary.current.tier} ${summary.current.rank} ${summary.current.lp} LP`
          : ""}
      </p>
    </div>
  );
}

function pickRankedRecommendation(
  pool: PoolPick[],
  preferredRole: RoleKey,
): PoolPick | null {
  if (!pool.length) return null;
  const byLane = groupPoolByRole(pool, preferredRole);
  const preferred = byLane.find((l) => l.role === preferredRole)?.picks[0];
  return preferred ?? pool[0] ?? null;
}

export function DecisionRoundupView({
  gameName,
  tagLine,
  platform,
  profileIconId,
  analysis,
  ddragonVersion,
  idToKey,
  runeCatalog,
  dayLpSolo,
  dayLpFlex,
  trackQueue,
  todayPool,
  preferredRole,
  dayGoal,
  sessionEv,
  practiceCandidates,
  alertCount = 0,
  matchCount = 50,
}: Props) {
  const [poolFeaturedId, setPoolFeaturedId] = useState<number | null>(
    todayPool[0]?.championId ?? null,
  );

  const rankedPick = useMemo(
    () => pickRankedRecommendation(todayPool, preferredRole),
    [todayPool, preferredRole],
  );

  const comments = useMemo(
    () =>
      buildDecisionComments({
        sessionEv,
        dayGoal,
        dayLpSolo,
        dayLpFlex,
        trackQueue,
        todayPool,
        analysis,
        practiceCandidates,
      }),
    [
      sessionEv,
      dayGoal,
      dayLpSolo,
      dayLpFlex,
      trackQueue,
      todayPool,
      analysis,
      practiceCandidates,
    ],
  );

  const activeSolo =
    trackQueue === "solo" ||
    (trackQueue !== "flex" &&
      (dayLpSolo?.gamesToday ?? 0) >= (dayLpFlex?.gamesToday ?? 0));

  const bestWindow = analysis.temporal?.bestPlayWindow?.label ?? null;
  const syncHref = `/config`;
  const primaryHref =
    sessionEv?.label === "stop"
      ? "/analise?tab=quando"
      : sessionEv?.label === "caution"
        ? "/analise?tab=quando"
        : "/coach";
  const primaryLabel =
    sessionEv?.label === "stop"
      ? "Ver padrões"
      : sessionEv?.label === "caution"
        ? "Revisar horário"
        : "Abrir Coach";

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src={profileIconUrl(ddragonVersion, profileIconId ?? 29)}
            alt=""
            width={48}
            height={48}
            className="rounded-[var(--radius)] ring-1 ring-[var(--border)]"
          />
          <div className="min-w-0">
            <p className="data-label">Hoje</p>
            <h1 className="truncate text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
              {gameName}
              <span className="font-medium text-[var(--alttab)]">#{tagLine}</span>
            </h1>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {platform.toUpperCase()} ·{" "}
              {ROLE_LABELS[preferredRole] ?? preferredRole}
            </p>
          </div>
        </div>
        <QueueTrackSwitch current={trackQueue} />
      </div>

      <SessionFlowStrip />

      {sessionEv ? (
        <Panel
          strong
          className={`space-y-3 px-4 py-4 ${
            sessionEv.label === "stop"
              ? "border-[var(--danger)]/30 bg-[var(--danger)]/10"
              : sessionEv.label === "go"
                ? "border-[var(--success)]/30 bg-[var(--success)]/10"
                : "border-[var(--warn)]/30 bg-[var(--warn)]/10"
          }`}
        >
          <div>
            <p className="data-label">1 · Decisão da fila</p>
            <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
              {sessionEv.verb}
            </p>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">
              {[sessionEv.detail, ...sessionEv.reasons.slice(0, 2)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href={primaryHref} size="sm">
              {primaryLabel}
            </Button>
            <Button href={syncHref} variant="ghost" size="sm">
              Sync / Config
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel strong className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="data-label">1 · Decisão da fila</p>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">
              Sem sinal ainda — sincronize o histórico se estiver vazio.
            </p>
          </div>
          <Button href="/coach" size="sm">
            Abrir Coach
          </Button>
        </Panel>
      )}

      <section className="space-y-2">
        <p className="data-label">2 · Placar do dia</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <QueueScorecard
            summary={dayLpSolo}
            emphasize={
              trackQueue === "solo" ||
              (trackQueue !== "flex" &&
                (dayLpSolo?.queueType === SOLO_QUEUE || activeSolo))
            }
          />
          <QueueScorecard
            summary={dayLpFlex}
            emphasize={
              trackQueue === "flex" ||
              (trackQueue !== "solo" &&
                dayLpFlex?.queueType === FLEX_QUEUE &&
                !activeSolo)
            }
          />
        </div>
      </section>

      <section>
        <Panel strong className="space-y-3 p-4">
          <div>
            <p className="data-label">3 · Pick ranked</p>
            <h2 className="mt-0.5 text-base font-semibold text-[var(--foreground)]">
              O que jogar agora
            </h2>
          </div>
          {rankedPick ? (
            <div className="flex flex-wrap items-center gap-4">
              <Image
                src={championIconUrl(
                  ddragonVersion,
                  idToKey[rankedPick.championId] ?? rankedPick.championName,
                )}
                alt={rankedPick.championName}
                width={64}
                height={64}
                className="rounded-[var(--radius)] ring-2 ring-[var(--alttab)]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold text-[var(--foreground)]">
                  {rankedPick.championName}
                  <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                    {ROLE_LABELS[rankedPick.role] ?? rankedPick.role}
                  </span>
                </p>
                <p className="mt-1 text-sm tabular-nums text-[var(--muted-strong)]">
                  {pct(rankedPick.wr)} WR · {rankedPick.games}j · PDL{" "}
                  {rankedPick.expectedLp >= 0 ? "+" : ""}
                  {rankedPick.expectedLp}
                </p>
                {rankedPick.reasons[0] ? (
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {rankedPick.reasons.slice(0, 2).join(" · ")}
                  </p>
                ) : null}
              </div>
              <Button href="/coach" size="sm">
                Ir para o Coach
              </Button>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Sem pick contextual ainda — sincronize mais partidas em Config.
            </p>
          )}
          {dayGoal ? (
            <p className="border-t border-[var(--border)] pt-3 text-sm text-[var(--muted-strong)]">
              Meta: {dayGoalVerb(dayGoal)}
              {dayGoal.delta != null
                ? ` · agora ${dayGoal.delta > 0 ? "+" : ""}${dayGoal.delta}`
                : ""}
            </p>
          ) : null}
        </Panel>
      </section>

      <TodayPoolPanel
        picks={todayPool}
        champions={analysis.champions}
        ddragonVersion={ddragonVersion}
        idToKey={idToKey}
        runeCatalog={runeCatalog}
        preferredRole={preferredRole}
        featuredId={poolFeaturedId}
        onFeature={setPoolFeaturedId}
        champHref="/analise?tab=ranking"
        rankingHref="/analise?tab=ranking"
        statsHref="/analise?tab=stats"
        coachHref="/coach"
      />

      <PracticeNormalsPanel
        candidates={practiceCandidates}
        ddragonVersion={ddragonVersion}
        idToKey={idToKey}
      />

      {practiceCandidates.length === 0 ? (
        <Panel className="px-4 py-3">
          <p className="data-label">Normais para avaliar</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Nenhum champ marcado para treino agora.
          </p>
        </Panel>
      ) : null}

      <section className="space-y-2">
        <p className="data-label">Comentários da decisão</p>
        <StatsDecisionComments daily={comments.daily} general={comments.general} />
      </section>

      <Panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="data-label">Quando jogar</p>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">
            {bestWindow
              ? `Melhor janela: ${bestWindow}`
              : "Ainda sem janela clara no histórico"}
            {alertCount > 0 ? ` · ${alertCount} alerta(s)` : ""}
          </p>
        </div>
        <Button href="/analise?tab=quando" variant="secondary" size="sm">
          Ver padrões →
        </Button>
      </Panel>

      <p className="text-center text-[11px] text-[var(--muted)]">
        Sync de partidas em Config · amostra {analysis.analyzedGames}j · até{" "}
        {matchCount}
      </p>
    </div>
  );
}

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
import {
  goalAnchorLabel,
  sortAlertsByPriority,
} from "@/lib/stats/playerRhythm";
import { PracticeNormalsPanel } from "./PracticeNormalsPanel";
import { QueueTrackSwitch } from "./QueueTrackSwitch";
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
            Ativa
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
        {summary.gamesToday} jogos
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

  const bestWindow = analysis.temporal?.bestPlayWindow ?? null;
  const recentForm = analysis.temporal?.recentForm ?? null;
  const topAlerts = sortAlertsByPriority(
    analysis.temporal?.alerts ?? [],
  ).slice(0, 3);
  const goalAnchor = goalAnchorLabel(dayGoal);
  const primaryHref =
    sessionEv?.label === "stop" || sessionEv?.label === "caution"
      ? "/quando"
      : "/coach";
  const primaryLabel =
    sessionEv?.label === "stop"
      ? "Abrir Quando"
      : sessionEv?.label === "caution"
        ? "Ver horário"
        : "Abrir Coach";

  return (
    <div className="space-y-5 pb-8">
      {/* Identidade */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src={profileIconUrl(ddragonVersion, profileIconId ?? 29)}
            alt=""
            width={44}
            height={44}
            className="rounded-[var(--radius)] ring-1 ring-[var(--border)]"
            priority
          />
          <div className="min-w-0">
            <h1 className="truncate text-pretty text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
              {gameName}
              <span className="font-medium text-[var(--alttab)]">#{tagLine}</span>
            </h1>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {platform.toUpperCase()} ·{" "}
              {ROLE_LABELS[preferredRole] ?? preferredRole}
              {bestWindow ? ` · melhor ${bestWindow.label}` : ""}
            </p>
          </div>
        </div>
        <QueueTrackSwitch current={trackQueue} />
      </div>

      {/* Decisão — primeiro viewport */}
      <Panel
        strong
        className={`space-y-3 px-4 py-4 ${
          sessionEv?.label === "stop"
            ? "border-[var(--danger)]/30 bg-[var(--danger)]/10"
            : sessionEv?.label === "go"
              ? "border-[var(--success)]/30 bg-[var(--success)]/10"
              : sessionEv?.label === "caution"
                ? "border-[var(--warn)]/30 bg-[var(--warn)]/10"
                : ""
        }`}
      >
        <div>
          <p className="data-label">Fila agora</p>
          <p className="mt-1 text-pretty text-2xl font-semibold text-[var(--foreground)]">
            {sessionEv?.verb ?? "Sem sinal ainda"}
          </p>
          <p className="mt-1 max-w-prose text-sm text-[var(--muted-strong)]">
            {sessionEv
              ? [sessionEv.detail, ...sessionEv.reasons.slice(0, 2)]
                  .filter(Boolean)
                  .join(" · ")
              : "Sincronize o histórico em Config se estiver vazio."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href={primaryHref}>{primaryLabel}</Button>
          <Button href="/quando" variant="secondary">
            Quando
          </Button>
          <Button href="/config" variant="ghost">
            Sync
          </Button>
        </div>
      </Panel>

      {/* Avisos */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Avisos
          </h2>
          <Button href="/quando" variant="ghost" size="sm">
            Ver todos em Quando
          </Button>
        </div>
        {topAlerts.length ? (
          <ul className="space-y-2">
            {topAlerts.map((a) => {
              const tone =
                a.severity === "warn"
                  ? "border-[var(--warn)]/30 bg-[var(--warn)]/8"
                  : a.severity === "good"
                    ? "border-[var(--success)]/30 bg-[var(--success)]/8"
                    : "border-[var(--border)] bg-[var(--surface-2)]";
              return (
                <li
                  key={a.id}
                  className={`rounded-[var(--radius)] border px-3 py-2.5 ${tone}`}
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted-strong)]">
                    {a.detail}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Sem avisos de padrão agora
            {alertCount > 0 ? ` · ${alertCount} no histórico` : ""}.
          </p>
        )}
      </section>

      {/* Âncoras do jogador */}
      <div className="grid gap-2 sm:grid-cols-3">
        <Panel className="space-y-1 p-3">
          <p className="data-label">Melhor horário</p>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {bestWindow?.label ?? "Ainda sem bloco"}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {bestWindow
              ? `${pct(bestWindow.wr)} WR · ${bestWindow.games}j`
              : "Precisa de mais partidas"}
          </p>
        </Panel>
        <Panel className="space-y-1 p-3">
          <p className="data-label">Forma recente</p>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {recentForm ? pct(recentForm.wr) : "—"}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {recentForm
              ? `${recentForm.games} jogos · ${pct(recentForm.lift)} vs média`
              : "Sem amostra recente"}
          </p>
        </Panel>
        <Panel className="space-y-1 p-3">
          <p className="data-label">Meta PDL</p>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {goalAnchor.verb}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {goalAnchor.metric} · {goalAnchor.hint}
          </p>
        </Panel>
      </div>

      {/* Comentários estatísticos — logo após avisos/âncoras */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Por que essa decisão
        </h2>
        <StatsDecisionComments
          daily={comments.daily}
          general={comments.general}
        />
      </section>

      {/* Placar + pick */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Placar do dia
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
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

        <Panel strong className="flex flex-col justify-between gap-3 p-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              O que jogar
            </h2>
            {rankedPick ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Image
                  src={championIconUrl(
                    ddragonVersion,
                    idToKey[rankedPick.championId] ?? rankedPick.championName,
                  )}
                  alt={rankedPick.championName}
                  width={56}
                  height={56}
                  className="rounded-[var(--radius)] ring-2 ring-[var(--alttab)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-[var(--foreground)]">
                    {rankedPick.championName}
                    <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                      {ROLE_LABELS[rankedPick.role] ?? rankedPick.role}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm tabular-nums text-[var(--muted-strong)]">
                    {pct(rankedPick.wr)} WR · {rankedPick.games}j · PDL{" "}
                    {rankedPick.expectedLp >= 0 ? "+" : ""}
                    {rankedPick.expectedLp}
                  </p>
                  {rankedPick.reasons[0] ? (
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                      {rankedPick.reasons.slice(0, 2).join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">
                Sem pick contextual — sincronize mais partidas.
              </p>
            )}
            {dayGoal ? (
              <p className="mt-3 text-sm text-[var(--muted-strong)]">
                {dayGoalVerb(dayGoal)}
                {dayGoal.delta != null
                  ? ` · ${dayGoal.delta > 0 ? "+" : ""}${dayGoal.delta} PDL`
                  : ""}
              </p>
            ) : null}
          </div>
          {rankedPick ? (
            <Button href="/coach" className="w-full sm:w-auto">
              Ir para o Coach
            </Button>
          ) : null}
        </Panel>
      </div>

      {/* Detalhes sob demanda */}
      <details className="group rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] open:shadow-[var(--shadow-sm)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--foreground)] marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            Pool por lane e normais
            <span className="text-xs font-normal text-[var(--muted)] group-open:hidden">
              expandir
            </span>
          </span>
        </summary>
        <div className="space-y-4 border-t border-[var(--border)] px-3 pb-4 pt-3 sm:px-4">
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
            <p className="text-sm text-[var(--muted)]">
              Nenhum champ marcado para treino em normais agora.
            </p>
          ) : null}
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-[var(--muted-strong)]">
          {topAlerts.length
            ? `${topAlerts.length} aviso(s) em destaque`
            : "Sem avisos em destaque"}
          {bestWindow ? ` · janela ${bestWindow.label}` : ""}
        </p>
        <Button href="/quando" variant="secondary" size="sm">
          Abrir Quando
        </Button>
      </div>

      <p className="text-center text-[11px] text-[var(--muted)]">
        Amostra {analysis.analyzedGames}j no banco · bootstrap {matchCount} ·
        sync recentes em Config
      </p>
    </div>
  );
}

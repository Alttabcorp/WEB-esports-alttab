"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { AggregateResult } from "@/lib/stats/aggregate";
import type { RuneCatalog } from "@/lib/ddragon";
import { championIconUrl } from "@/lib/ddragon";
import type { CoachNotesView } from "@/lib/db/persist";
import {
  groupPoolByRole,
  type PoolPick,
} from "@/lib/stats/contextualPool";
import type { DayGoalProgress } from "@/lib/stats/dayGoal";
import type { DayLpSummary } from "@/lib/stats/lpLedger";
import { QUEUE_LABEL, FLEX_QUEUE, SOLO_QUEUE } from "@/lib/stats/lpLedger";
import type { PracticeCandidate } from "@/lib/stats/practiceCandidates";
import type { SessionEvResult } from "@/lib/stats/sessionEv";
import { ROLE_LABELS, type RoleKey } from "@/lib/stats/roles";
import { pct } from "@/lib/format";
import { CoachNotesPanel } from "./CoachNotesPanel";
import { DayGoalCard } from "./DayGoalCard";
import { PracticeNormalsPanel } from "./PracticeNormalsPanel";
import { PrepSubnav } from "./PrepSubnav";
import { TodayPoolPanel } from "./TodayPoolPanel";
import { Button, Panel } from "@/components/ui";

type Props = {
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
  notes: CoachNotesView;
  alertCount?: number;
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
  notes,
  alertCount = 0,
}: Props) {
  const [poolFeaturedId, setPoolFeaturedId] = useState<number | null>(
    todayPool[0]?.championId ?? null,
  );

  const rankedPick = useMemo(
    () => pickRankedRecommendation(todayPool, preferredRole),
    [todayPool, preferredRole],
  );

  const activeSolo =
    trackQueue === "solo" ||
    (trackQueue !== "flex" &&
      (dayLpSolo?.gamesToday ?? 0) >= (dayLpFlex?.gamesToday ?? 0));

  const queueLabel =
    trackQueue === "solo"
      ? "Solo/Duo"
      : trackQueue === "flex"
        ? "Flex"
        : activeSolo
          ? "Solo/Duo"
          : "Flex";

  return (
    <div className="space-y-4 pb-8">
      <div>
        <p className="data-label">Decisão do dia</p>
        <h1 className="mt-0.5 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
          Rodada de decisão
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Placar Solo/Flex, pick ranked, pool por lane e o que avaliar em
          normais · acompanhando {queueLabel}
        </p>
      </div>

      <PrepSubnav alertCount={alertCount} />

      {sessionEv ? (
        <Panel
          className={`px-4 py-3 ${
            sessionEv.label === "stop"
              ? "border-[var(--danger)]/30 bg-[var(--danger)]/10"
              : sessionEv.label === "go"
                ? "border-[var(--success)]/30 bg-[var(--success)]/10"
                : "border-[var(--warn)]/30 bg-[var(--warn)]/10"
          }`}
        >
          <p className="data-label">Fila agora</p>
          <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
            {sessionEv.verb}
          </p>
          <p className="mt-0.5 text-sm text-[var(--muted-strong)]">
            {[sessionEv.detail, ...sessionEv.reasons.slice(0, 2)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </Panel>
      ) : null}

      <section className="space-y-2">
        <p className="data-label">Placar do dia</p>
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
                (dayLpFlex?.queueType === FLEX_QUEUE && !activeSolo))
            }
          />
        </div>
      </section>

      {dayGoal ? <DayGoalCard goal={dayGoal} sessionEv={sessionEv} /> : null}

      <section className="space-y-2">
        <p className="data-label">Comentários</p>
        <CoachNotesPanel
          initial={{
            dailyNote: notes.dailyNote,
            generalNote: notes.generalNote,
            dailyStale: notes.dailyStale,
            todayKey: notes.todayKey,
          }}
        />
      </section>

      <section>
        <Panel strong className="space-y-3 p-4">
          <div>
            <p className="data-label">Recomendação ranked</p>
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
              <div className="flex flex-wrap gap-2">
                <Button href="/coach" size="sm">
                  Abrir Coach
                </Button>
                <Button href="/builds" variant="secondary" size="sm">
                  Builds
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Sem pick contextual ainda — sincronize mais partidas em Config.
            </p>
          )}
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
        champHref="/ranking"
        rankingHref="/ranking"
        statsHref="/estatisticas"
        coachHref="/coach"
      />

      <PracticeNormalsPanel
        candidates={practiceCandidates}
        ddragonVersion={ddragonVersion}
        idToKey={idToKey}
      />

      {practiceCandidates.length === 0 ? (
        <Panel className="px-4 py-3">
          <p className="data-label">Normal para avaliação</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Nenhum champ marcado para treino agora — o pool ranked está ok ou a
            amostra ainda é pequena.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}

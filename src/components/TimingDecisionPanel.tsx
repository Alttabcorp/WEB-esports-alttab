"use client";

import { useMemo } from "react";
import type { DecisionModel } from "@/lib/alerts/decision";
import { toDecisionFromAlerts } from "@/lib/alerts/decision";
import { pct } from "@/lib/format";
import type { SessionEvResult } from "@/lib/stats/sessionEv";
import type { TemporalInsights } from "@/lib/stats/temporal";
import type { MatchLpInsights } from "@/lib/stats/matchLpLedger";
import type { DayLpCalendarEntry } from "@/lib/stats/lpCalendar";
import { DecisionCard } from "./DecisionCard";
import { LpInsightsPanel } from "./LpInsightsPanel";
import { LpCalendarGrid } from "./LpCalendarGrid";
import { PerformanceInsights } from "./PerformanceInsights";
import { Panel } from "@/components/ui";

type Props = {
  temporal: TemporalInsights;
  overallWr: number;
  sessionEv?: SessionEvResult | null;
  lpInsights?: MatchLpInsights | null;
  calendar?: DayLpCalendarEntry[];
  currentPatch?: string | null;
  patchNote?: string | null;
  prepHref?: string;
  timingHref?: string;
};

function timingDecision(
  temporal: TemporalInsights,
  sessionEv: SessionEvResult | null | undefined,
  prepHref?: string,
  timingHref?: string,
): DecisionModel {
  if (sessionEv) {
    const tone =
      sessionEv.label === "stop"
        ? "stop"
        : sessionEv.label === "go"
          ? "go"
          : "warn";
    const reason = sessionEv.reasons[0];
    return {
      id: "timing-session-ev",
      tone,
      verb: sessionEv.verb,
      detail: reason
        ? `${sessionEv.detail} · ${reason}`
        : sessionEv.detail,
      actions: [],
    };
  }

  const fromAlerts = toDecisionFromAlerts(temporal.alerts ?? [], {
    prepHref,
    timingHref,
  });
  if (fromAlerts) return fromAlerts;

  if (temporal.bestPlayWindow) {
    return {
      id: "timing-best-window",
      tone: "go",
      verb: `Melhor bloco: ${temporal.bestPlayWindow.label}`,
      detail: `${pct(temporal.bestPlayWindow.wr)} WR em ${temporal.bestPlayWindow.games} jogos nesse horário.`,
      actions: [],
    };
  }

  return {
    id: "timing-neutral",
    tone: "info",
    verb: "Sem sinal forte agora",
    detail: "Sincronize mais partidas para horários e dias mais claros.",
    actions: [],
  };
}

function StopCard({ temporal }: { temporal: TemporalInsights }) {
  const lossTrap = (temporal.afterLossStreaks ?? []).find(
    (s) => s.games >= 3 && s.lift <= -0.08,
  );
  const longSession = (temporal.bySessionLength ?? []).find(
    (s) => s.games >= 5 && s.lift <= -0.08,
  );
  const sessionDecay = (temporal.sessionIndex ?? []).find(
    (s) => s.index >= 4 && s.games >= 5 && s.lift <= -0.1,
  );

  if (lossTrap) {
    return (
      <BigCard
        title="Pare se…"
        verb={`Após ${lossTrap.afterLosses} derrotas`}
        metric={`${pct(lossTrap.wr)} WR na próxima`}
        hint={`${lossTrap.games} vezes no histórico`}
        tone="warn"
      />
    );
  }
  if (sessionDecay) {
    return (
      <BigCard
        title="Pare se…"
        verb={`${sessionDecay.index}ª+ da sessão`}
        metric={`${pct(sessionDecay.wr)} WR`}
        hint="Sessão longa costuma sangrar"
        tone="warn"
      />
    );
  }
  if (longSession) {
    return (
      <BigCard
        title="Pare se…"
        verb={longSession.label}
        metric={`${pct(longSession.wr)} WR`}
        hint="Sessão longa no histórico"
        tone="warn"
      />
    );
  }
  return (
    <BigCard
      title="Pare se…"
      verb="Tilt ou meta batida"
      metric="—"
      hint="Use a meta diária / stop-loss na Config"
      tone="neutral"
    />
  );
}

function BigCard({
  title,
  verb,
  metric,
  hint,
  tone,
}: {
  title: string;
  verb: string;
  metric: string;
  hint: string;
  tone: "go" | "warn" | "neutral";
}) {
  const border =
    tone === "go"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/5"
        : "border-[var(--border)] bg-[var(--surface)]";
  return (
    <Panel className={`space-y-2 p-4 ${border}`}>
      <p className="data-label">{title}</p>
      <p className="text-lg font-semibold text-[var(--foreground)] sm:text-xl">
        {verb}
      </p>
      <p className="text-2xl font-semibold tabular text-[var(--alttab)]">
        {metric}
      </p>
      <p className="text-sm text-[var(--muted)]">{hint}</p>
    </Panel>
  );
}

export function TimingDecisionPanel({
  temporal,
  overallWr,
  sessionEv = null,
  lpInsights = null,
  calendar = [],
  currentPatch = null,
  patchNote = null,
  prepHref,
  timingHref,
}: Props) {
  const decision = useMemo(
    () => timingDecision(temporal, sessionEv, prepHref, timingHref),
    [temporal, sessionEv, prepHref, timingHref],
  );

  const bestHour = temporal.bestPlayWindow;
  const bestDay = temporal.bestDay;

  return (
    <div className="space-y-4">
      <DecisionCard decision={decision} />

      <div className="grid gap-3 sm:grid-cols-3">
        <BigCard
          title="Melhor horário"
          verb={bestHour ? bestHour.label : "Ainda sem bloco"}
          metric={bestHour ? pct(bestHour.wr) : "—"}
          hint={
            bestHour
              ? `${bestHour.games} jogos nesse horário`
              : "Precisa de mais partidas por hora"
          }
          tone={bestHour ? "go" : "neutral"}
        />
        <BigCard
          title="Melhor dia"
          verb={bestDay ? bestDay.label : "Ainda sem dia"}
          metric={bestDay ? pct(bestDay.wr) : "—"}
          hint={
            bestDay
              ? `${bestDay.games} jogos nesse dia`
              : "Precisa de mais partidas por dia"
          }
          tone={bestDay ? "go" : "neutral"}
        />
        <StopCard temporal={temporal} />
      </div>

      {calendar.length > 0 ? <LpCalendarGrid calendar={calendar} /> : null}

      {lpInsights ? (
        <LpInsightsPanel
          insights={lpInsights}
          calendar={calendar}
          currentPatch={currentPatch}
          patchNote={patchNote}
          simpleLabels
          hideCalendar
        />
      ) : null}

      <details className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--foreground)] marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            WR detalhado, gaps e streaks
            <span className="text-xs text-[var(--muted)]">abrir</span>
          </span>
        </summary>
        <div className="space-y-3 border-t border-[var(--border)] px-2 pb-3 pt-1">
          <p className="px-2 pt-2 text-xs text-[var(--muted)]">
            Winrate por horário/dia, pausas entre filas e o que acontece após
            sequências de vitória ou derrota — complemento às barras de PDL
            acima.
          </p>
          <PerformanceInsights temporal={temporal} overallWr={overallWr} />
        </div>
      </details>
    </div>
  );
}

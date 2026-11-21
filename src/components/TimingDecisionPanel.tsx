"use client";

import { useMemo } from "react";
import type { DecisionModel } from "@/lib/alerts/decision";
import {
  toDecisionFromAlerts,
  withPracticeHint,
} from "@/lib/alerts/decision";
import { pct } from "@/lib/format";
import type { SessionEvResult } from "@/lib/stats/sessionEv";
import type { TemporalInsights } from "@/lib/stats/temporal";
import type { MatchLpInsights } from "@/lib/stats/matchLpLedger";
import type { DayLpCalendarEntry } from "@/lib/stats/lpCalendar";
import type { PracticeCandidate } from "@/lib/stats/practiceCandidates";
import { DecisionCard } from "./DecisionCard";
import { LpInsightsPanel } from "./LpInsightsPanel";
import { LpCalendarGrid } from "./LpCalendarGrid";
import { PerformanceInsights } from "./PerformanceInsights";
import { PracticeNormalsPanel } from "./PracticeNormalsPanel";
import { Button, Panel } from "@/components/ui";

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
  practiceCandidates?: PracticeCandidate[];
  ddragonVersion?: string;
  idToKey?: Record<number, string>;
};

function timingDecision(
  temporal: TemporalInsights,
  sessionEv: SessionEvResult | null | undefined,
  prepHref?: string,
  timingHref?: string,
  practiceCandidates: PracticeCandidate[] = [],
): DecisionModel {
  let base: DecisionModel;
  if (sessionEv) {
    const tone =
      sessionEv.label === "stop"
        ? "stop"
        : sessionEv.label === "go"
          ? "go"
          : "warn";
    const reason = sessionEv.reasons[0];
    base = {
      id: "timing-session-ev",
      tone,
      verb: sessionEv.verb,
      detail: reason
        ? `${sessionEv.detail} · ${reason}`
        : sessionEv.detail,
      actions: [
        { label: "Abrir Coach", href: "/coach", kind: "primary" },
        {
          label: "Preparar pick",
          href: prepHref ?? "/preparar",
          kind: "secondary",
        },
      ],
    };
  } else {
    const fromAlerts = toDecisionFromAlerts(temporal.alerts ?? [], {
      prepHref,
      timingHref,
    });
    if (fromAlerts) {
      const hasCoach = fromAlerts.actions.some((a) => a.href === "/coach");
      base = {
        ...fromAlerts,
        actions: [
          ...(hasCoach
            ? fromAlerts.actions
            : [
                {
                  label: "Abrir Coach",
                  href: "/coach",
                  kind: "primary" as const,
                },
                ...fromAlerts.actions,
              ]),
          {
            label: "Preparar pick",
            href: prepHref ?? "/preparar",
            kind: "ghost" as const,
          },
        ].filter(
          (a, i, arr) => arr.findIndex((x) => x.label === a.label) === i,
        ),
      };
    } else if (temporal.bestPlayWindow) {
      base = {
        id: "timing-best-window",
        tone: "go",
        verb: `Melhor bloco: ${temporal.bestPlayWindow.label}`,
        detail: `${pct(temporal.bestPlayWindow.wr)} WR em ${temporal.bestPlayWindow.games} jogos nesse horário.`,
        actions: [
          { label: "Abrir Coach", href: "/coach", kind: "primary" },
          {
            label: "Preparar pick",
            href: prepHref ?? "/preparar",
            kind: "secondary",
          },
        ],
      };
    } else {
      base = {
        id: "timing-neutral",
        tone: "info",
        verb: "Sem sinal forte agora",
        detail: "Sincronize mais partidas para horários e dias mais claros.",
        actions: [
          {
            label: "Preparar pick",
            href: prepHref ?? "/preparar",
            kind: "primary",
          },
        ],
      };
    }
  }
  return withPracticeHint(base, practiceCandidates);
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
    <Panel className={`space-y-1.5 p-3 sm:p-4 ${border}`}>
      <p className="data-label">{title}</p>
      <p className="text-base font-semibold text-[var(--foreground)] sm:text-lg">
        {verb}
      </p>
      <p className="text-xl font-semibold tabular text-[var(--alttab)] sm:text-2xl">
        {metric}
      </p>
      <p className="text-xs text-[var(--muted)] sm:text-sm">{hint}</p>
    </Panel>
  );
}

function SectionHead({
  eyebrow,
  title,
  hint,
}: {
  eyebrow: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="mb-3">
      <p className="data-label">{eyebrow}</p>
      <h2 className="mt-0.5 text-lg font-semibold text-[var(--foreground)] sm:text-xl">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>
    </div>
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
  prepHref = "/preparar",
  timingHref = "/timing",
  practiceCandidates = [],
  ddragonVersion = "",
  idToKey = {},
}: Props) {
  const decision = useMemo(
    () =>
      timingDecision(
        temporal,
        sessionEv,
        prepHref,
        timingHref,
        practiceCandidates,
      ),
    [temporal, sessionEv, prepHref, timingHref, practiceCandidates],
  );

  const bestHour = temporal.bestPlayWindow;
  const bestDay = temporal.bestDay;

  return (
    <div className="space-y-8">
      {/* 1. Agora */}
      <section className="space-y-3">
        <SectionHead
          eyebrow="1 · Agora"
          title="Tomada de decisão"
          hint="Sinal da sessão + âncoras do histórico."
        />
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
        <div className="flex flex-wrap gap-2">
          <Button href="/coach" size="sm">
            Abrir Coach
          </Button>
          <Button href={prepHref} variant="secondary" size="sm">
            Preparar pick
          </Button>
        </div>
        {practiceCandidates.length > 0 && ddragonVersion ? (
          <PracticeNormalsPanel
            candidates={practiceCandidates}
            ddragonVersion={ddragonVersion}
            idToKey={idToKey}
            compact
          />
        ) : null}
      </section>

      {/* 2. Seu grind */}
      <section>
        <SectionHead
          eyebrow="2 · Seu grind"
          title="PDL no histórico"
          hint="Calendário dos últimos 28 dias e onde você ganha ou perde PDL."
        />
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="min-w-0">
            {calendar.length > 0 ? (
              <LpCalendarGrid calendar={calendar} />
            ) : (
              <Panel className="p-3 text-sm text-[var(--muted)]">
                Sem snapshots de elo ainda — sincronize ranked para montar o
                calendário.
              </Panel>
            )}
          </div>
          <div className="min-w-0">
            {lpInsights ? (
              <LpInsightsPanel
                insights={lpInsights}
                currentPatch={currentPatch}
                patchNote={patchNote}
                simpleLabels
                hideCalendar
                barsOnly
              />
            ) : (
              <Panel className="p-3 text-sm text-[var(--muted)]">
                Sem ledger de PDL ainda.
              </Panel>
            )}
          </div>
        </div>
      </section>

      {/* 3. Padrões */}
      <section>
        <SectionHead
          eyebrow="3 · Padrões"
          title="O que o histórico mostra"
          hint="WR por horário, dia, pausas e sequências — complementar ao PDL."
        />
        <Panel className="p-3 sm:p-4">
          <PerformanceInsights
            temporal={temporal}
            overallWr={overallWr}
            embedded
          />
        </Panel>
      </section>
    </div>
  );
}

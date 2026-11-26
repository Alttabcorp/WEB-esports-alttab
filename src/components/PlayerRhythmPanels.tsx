"use client";

import { pct } from "@/lib/format";
import type { DayLpCalendarEntry } from "@/lib/stats/lpCalendar";
import type { TemporalInsights } from "@/lib/stats/temporal";
import {
  avoidNowInsights,
  buildHourDowHeatmap,
  buildPlayerScorecard,
  streakInsight,
  suggestPauseRule,
  suggestSessionLimit,
  type ActionableInsight,
} from "@/lib/stats/playerRhythm";
import { Panel } from "@/components/ui";

const DOW_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];

function InsightCard({ item }: { item: ActionableInsight }) {
  const border =
    item.tone === "go"
      ? "border-[var(--success)]/30 bg-[var(--success)]/5"
      : item.tone === "warn"
        ? "border-[var(--warn)]/30 bg-[var(--warn)]/5"
        : "border-[var(--border)] bg-[var(--surface)]";
  return (
    <Panel className={`space-y-1 p-3 ${border}`}>
      <p className="data-label">{item.title}</p>
      <p className="text-sm font-semibold text-[var(--foreground)]">
        {item.verb}
      </p>
      <p className="text-xs text-[var(--muted)]">{item.detail}</p>
    </Panel>
  );
}

type Props = {
  temporal: TemporalInsights;
  calendar?: DayLpCalendarEntry[];
};

export function PlayerScorecardCard({
  temporal,
  calendar = [],
  days = 7,
}: {
  temporal: TemporalInsights;
  calendar?: DayLpCalendarEntry[];
  days?: 7 | 28;
}) {
  const card = buildPlayerScorecard({ calendar, temporal, days });
  const lp =
    card.lpDelta == null
      ? "—"
      : card.lpDelta > 0
        ? `+${card.lpDelta}`
        : String(card.lpDelta);
  return (
    <Panel strong className="space-y-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="data-label">Scorecard · {card.days} dias</p>
        <p className="text-xs text-[var(--muted)]">
          {card.daysWithData} dia(s) com PDL
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
            ΔPDL
          </p>
          <p className="text-lg font-semibold tabular-nums text-[var(--foreground)]">
            {lp}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
            Forma
          </p>
          <p className="text-lg font-semibold tabular-nums text-[var(--foreground)]">
            {card.recentFormWr != null ? pct(card.recentFormWr) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
            Amostra
          </p>
          <p className="text-lg font-semibold tabular-nums text-[var(--foreground)]">
            {card.recentFormGames ?? "—"}
            {card.recentFormGames != null ? "j" : ""}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
            Melhor bloco
          </p>
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {card.bestWindowLabel ?? "—"}
          </p>
        </div>
      </div>
    </Panel>
  );
}

export function ActionablePatternGrid({
  temporal,
}: {
  temporal: TemporalInsights;
}) {
  const session = suggestSessionLimit(temporal);
  const pause = suggestPauseRule(temporal);
  const streak = streakInsight(temporal);
  const avoids = avoidNowInsights(temporal);

  const cards: ActionableInsight[] = [
    ...(session ? [session] : []),
    ...(pause ? [pause] : []),
    ...(streak ? [streak] : []),
    ...avoids.slice(0, 2),
  ];

  if (!cards.length) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Ainda sem padrões acionáveis — precisa de mais partidas syncadas.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map((c) => (
        <InsightCard key={c.id} item={c} />
      ))}
    </div>
  );
}

export function HourDowHeatmap({ temporal }: { temporal: TemporalInsights }) {
  const cells = buildHourDowHeatmap(temporal);
  if (!cells.length) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Heatmap precisa de partidas por dia e por horário.
      </p>
    );
  }

  const hours = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[20rem] gap-0.5"
        style={{
          gridTemplateColumns: `1.5rem repeat(${hours.length}, minmax(0, 1fr))`,
        }}
      >
        <div />
        {hours.map((h) => (
          <div
            key={`h-${h}`}
            className="text-center text-[9px] text-[var(--muted)]"
          >
            {h}h
          </div>
        ))}
        {DOW_SHORT.map((label, dow) => (
          <div key={`row-${dow}`} className="contents">
            <div className="flex items-center text-[10px] text-[var(--muted)]">
              {label}
            </div>
            {hours.map((h) => {
              const cell = cells.find(
                (c) => c.dow === dow && c.hourWindow === h,
              );
              const intensity = cell?.intensity;
              const bg =
                intensity == null
                  ? "bg-[var(--surface-2)]"
                  : intensity >= 0.25
                    ? "bg-[var(--success)]/45"
                    : intensity <= -0.25
                      ? "bg-[var(--danger)]/40"
                      : "bg-[var(--alttab)]/20";
              return (
                <div
                  key={`${dow}-${h}`}
                  title={
                    cell && cell.games > 0
                      ? `${cell.label}: ${cell.wr != null ? pct(cell.wr) : "—"}`
                      : "Sem dado"
                  }
                  className={`aspect-square rounded-sm ${bg}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-[var(--muted)]">
        Verde = dia e horário acima da média · vermelho = abaixo (aproximação
        pelos lifts separados).
      </p>
    </div>
  );
}

export function PlayerRhythmPanels({ temporal, calendar = [] }: Props) {
  return (
    <div className="space-y-4">
      <PlayerScorecardCard temporal={temporal} calendar={calendar} days={7} />
      <ActionablePatternGrid temporal={temporal} />
      <Panel className="p-3 sm:p-4">
        <p className="data-label mb-2">Mapa dia × horário</p>
        <HourDowHeatmap temporal={temporal} />
      </Panel>
    </div>
  );
}

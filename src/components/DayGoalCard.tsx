import type { DayGoalProgress } from "@/lib/stats/dayGoal";
import { dayGoalVerb } from "@/lib/stats/dayGoal";
import type { SessionEvResult } from "@/lib/stats/sessionEv";
import { Panel } from "@/components/ui";

type Props = {
  goal: DayGoalProgress;
  sessionEv?: SessionEvResult | null;
  className?: string;
};

export function DayGoalCard({ goal, sessionEv = null, className = "" }: Props) {
  const deltaLabel =
    goal.delta == null
      ? "—"
      : goal.delta > 0
        ? `+${goal.delta}`
        : String(goal.delta);
  const pct = goal.progressPct ?? 0;
  const barColor =
    goal.status === "stopHit"
      ? "bg-rose-500"
      : goal.status === "goalHit"
        ? "bg-emerald-500"
        : goal.status === "behind"
          ? "bg-amber-500"
          : "bg-[var(--alttab)]";

  return (
    <Panel strong className={`space-y-3 p-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="data-label">Meta de PDL hoje</p>
          <p className="mt-1 text-2xl font-bold tabular text-[var(--foreground)]">
            {deltaLabel}
            <span className="text-base font-medium text-[var(--muted)]">
              {" "}
              / +{goal.target}
            </span>
          </p>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">
            {dayGoalVerb(goal)}
          </p>
        </div>
        <div className="text-right text-xs text-[var(--muted)]">
          {goal.perHour != null ? (
            <p className="tabular">
              {goal.perHour >= 0 ? "+" : ""}
              {goal.perHour.toFixed(0)} PDL/h
            </p>
          ) : null}
          {goal.gamesRemainingEst != null && !goal.goalHit ? (
            <p className="mt-1">~{goal.gamesRemainingEst} win(s)</p>
          ) : null}
          <p className="mt-1">Stop {goal.stopLoss}</p>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-inset)]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
        />
      </div>
      {sessionEv ? (
        <p className="text-sm text-[var(--muted-strong)]">
          Fila agora:{" "}
          <span className="font-medium text-[var(--foreground)]">{sessionEv.verb}</span>
          {sessionEv.reasons[0] ? ` · ${sessionEv.reasons[0]}` : ""}
        </p>
      ) : null}
    </Panel>
  );
}

import type { DayLpSummary } from "@/lib/stats/lpLedger";
import { Panel, Stat } from "@/components/ui";

type Props = {
  summary: DayLpSummary | null;
  className?: string;
};

export function DayLpCard({ summary, className = "" }: Props) {
  if (!summary) {
    return (
      <Panel className={`px-4 py-3 ${className}`}>
        <p className="data-label">PDL do dia</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Sem snapshots ainda — sincronize o perfil ou jogue uma ranked.
        </p>
      </Panel>
    );
  }

  const delta = summary.lpDelta;
  const deltaLabel =
    delta == null ? "—" : delta > 0 ? `+${delta}` : String(delta);
  const deltaColor =
    delta == null
      ? "text-white"
      : delta > 0
        ? "text-emerald-300"
        : delta < 0
          ? "text-rose-300"
          : "text-white";

  return (
    <Panel strong className={`px-4 py-3 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="data-label">PDL do dia</p>
          <p className={`mt-1 text-2xl font-bold tabular ${deltaColor}`}>
            {deltaLabel}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {summary.winsToday}W {summary.lossesToday}L ·{" "}
            {summary.gamesToday} jogos
            {summary.current
              ? ` · ${summary.current.tier} ${summary.current.rank} ${summary.current.lp} LP`
              : ""}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:min-w-[200px]">
          <Stat
            label="LP/h"
            value={
              summary.lpPerHour != null
                ? `${summary.lpPerHour >= 0 ? "+" : ""}${summary.lpPerHour.toFixed(0)}`
                : "—"
            }
          />
          <Stat label="Snapshots" value={String(summary.sampleSnapshots)} />
        </div>
      </div>
    </Panel>
  );
}

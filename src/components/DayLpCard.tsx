import type { DayLpSummary } from "@/lib/stats/lpLedger";
import { QUEUE_LABEL, FLEX_QUEUE, SOLO_QUEUE } from "@/lib/stats/lpLedger";
import type { QueueFilter } from "@/lib/riot/types";
import { Panel, Stat } from "@/components/ui";

type Props = {
  summary?: DayLpSummary | null;
  /** Quando passado, mostra Solo e Flex lado a lado. */
  solo?: DayLpSummary | null;
  flex?: DayLpSummary | null;
  /** Fila escolhida no seletor (solo/flex/ranked). */
  trackQueue?: QueueFilter | string | null;
  className?: string;
};

function QueueBlock({
  summary,
  emphasize,
  badge,
}: {
  summary: DayLpSummary;
  emphasize?: boolean;
  badge?: string;
}) {
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
  const label = QUEUE_LABEL[summary.queueType] ?? summary.queueType;

  return (
    <div
      className={`min-w-0 rounded-[var(--radius)] px-3 py-2 ${
        emphasize
          ? "bg-[var(--alttab)]/8 ring-1 ring-[var(--alttab)]/25"
          : "bg-[var(--surface-2)]"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="data-label">{label}</p>
        {emphasize && badge ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--alttab)]">
            {badge}
          </span>
        ) : null}
      </div>
      <p className={`mt-0.5 text-2xl font-bold tabular ${deltaColor}`}>
        {deltaLabel}
        <span className="ml-1 text-xs font-medium text-[var(--muted)]">PDL</span>
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {summary.winsToday}W {summary.lossesToday}L · {summary.gamesToday} jogos
        {summary.current
          ? ` · ${summary.current.tier} ${summary.current.rank} ${summary.current.lp} LP`
          : ""}
      </p>
    </div>
  );
}

export function DayLpCard({
  summary = null,
  solo = null,
  flex = null,
  trackQueue = null,
  className = "",
}: Props) {
  const dual = solo != null || flex != null;
  const soloSum = solo ?? (summary?.queueType === SOLO_QUEUE ? summary : null);
  const flexSum = flex ?? (summary?.queueType === FLEX_QUEUE ? summary : null);

  if (!dual && !summary) {
    return (
      <Panel className={`px-4 py-3 ${className}`}>
        <p className="data-label">PDL do dia</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Sem snapshots ainda — sincronize o perfil ou jogue uma ranked.
        </p>
      </Panel>
    );
  }

  if (dual && (soloSum || flexSum)) {
    const track = trackQueue === "solo" || trackQueue === "flex" || trackQueue === "ranked"
      ? trackQueue
      : "ranked";
    const activeType =
      track === "solo"
        ? SOLO_QUEUE
        : track === "flex"
          ? FLEX_QUEUE
          : (flexSum?.gamesToday ?? 0) > (soloSum?.gamesToday ?? 0)
            ? FLEX_QUEUE
            : SOLO_QUEUE;
    const active = activeType === FLEX_QUEUE ? flexSum : soloSum;
    const badge =
      track === "solo" || track === "flex" ? "acompanhando" : "ativa hoje";

    return (
      <Panel strong className={`space-y-3 px-4 py-3 ${className}`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="data-label">PDL do dia</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Solo/Duo e Flex separados — use o seletor no topo para acompanhar
              uma fila.
            </p>
          </div>
          {active?.lpPerHour != null ? (
            <Stat
              label={`LP/h · ${QUEUE_LABEL[active.queueType] ?? ""}`}
              value={`${active.lpPerHour >= 0 ? "+" : ""}${active.lpPerHour.toFixed(0)}`}
            />
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {soloSum ? (
            <QueueBlock
              summary={soloSum}
              emphasize={activeType === SOLO_QUEUE}
              badge={badge}
            />
          ) : null}
          {flexSum ? (
            <QueueBlock
              summary={flexSum}
              emphasize={activeType === FLEX_QUEUE}
              badge={badge}
            />
          ) : null}
        </div>
      </Panel>
    );
  }

  // Fallback single summary
  const single = summary!;
  const delta = single.lpDelta;
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
    <Panel strong className={`px-4 py-3 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="data-label">
            PDL do dia · {QUEUE_LABEL[single.queueType] ?? "Ranked"}
          </p>
          <p className={`mt-1 text-2xl font-bold tabular ${deltaColor}`}>
            {deltaLabel}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {single.winsToday}W {single.lossesToday}L · {single.gamesToday} jogos
            {single.current
              ? ` · ${single.current.tier} ${single.current.rank} ${single.current.lp} LP`
              : ""}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:min-w-[200px]">
          <Stat
            label="LP/h"
            value={
              single.lpPerHour != null
                ? `${single.lpPerHour >= 0 ? "+" : ""}${single.lpPerHour.toFixed(0)}`
                : "—"
            }
          />
          <Stat label="Snapshots" value={String(single.sampleSnapshots)} />
        </div>
      </div>
    </Panel>
  );
}

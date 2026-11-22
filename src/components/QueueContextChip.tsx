import type { QueueFilter } from "@/lib/riot/types";
import { QUEUE_LABEL, FLEX_QUEUE, SOLO_QUEUE } from "@/lib/stats/lpLedger";

type Props = {
  trackQueue: QueueFilter | string;
  queueType: string | null;
  lpDelta: number | null;
  winsToday: number;
  lossesToday: number;
  className?: string;
};

function fmtDelta(n: number | null): string {
  if (n == null) return "—";
  return n > 0 ? `+${n}` : String(n);
}

/**
 * Selo compacto: fila acompanhada + PDL + W/L do dia.
 */
export function QueueContextChip({
  trackQueue,
  queueType,
  lpDelta,
  winsToday,
  lossesToday,
  className = "",
}: Props) {
  const trackLabel =
    trackQueue === "solo"
      ? "Solo"
      : trackQueue === "flex"
        ? "Flex"
        : trackQueue === "ranked"
          ? "Ambas"
          : "Ranked";
  const activeLabel =
    queueType === SOLO_QUEUE
      ? QUEUE_LABEL[SOLO_QUEUE]
      : queueType === FLEX_QUEUE
        ? QUEUE_LABEL[FLEX_QUEUE]
        : trackLabel;
  const deltaColor =
    lpDelta == null
      ? "text-[var(--muted-strong)]"
      : lpDelta > 0
        ? "text-[var(--success)]"
        : lpDelta < 0
          ? "text-[var(--danger)]"
          : "text-[var(--muted-strong)]";

  return (
    <div
      className={`hidden max-w-[14rem] items-center gap-1.5 rounded-[var(--radius)] bg-[var(--surface-2)] px-2 py-1 text-[11px] ring-1 ring-[var(--border)] md:flex ${className}`}
      title={`Acompanhando ${trackLabel}${
        trackQueue === "ranked" && queueType
          ? ` · PDL ativo: ${activeLabel}`
          : ""
      }`}
    >
      <span className="font-semibold text-[var(--foreground)]">
        {trackQueue === "ranked" ? activeLabel : trackLabel}
      </span>
      <span className={`tabular font-bold ${deltaColor}`}>
        {fmtDelta(lpDelta)}
      </span>
      <span className="tabular text-[var(--muted)]">
        {winsToday}W {lossesToday}L
      </span>
    </div>
  );
}

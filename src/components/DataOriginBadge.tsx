type Origin = "self" | "meta";

const LABEL: Record<Origin, string> = {
  self: "Seus dados",
  meta: "externo · meta",
};

const TONE: Record<Origin, string> = {
  self: "bg-[var(--alttab)]/12 text-[var(--alttab)] ring-[var(--alttab)]/25",
  meta: "bg-amber-500/10 text-[var(--warn)] ring-amber-500/25",
};

type Props = {
  origin: Origin;
  className?: string;
};

/** Badge de origem para não misturar histórico do eu com dados externos. */
export function DataOriginBadge({ origin, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${TONE[origin]} ${className}`}
    >
      {LABEL[origin]}
    </span>
  );
}

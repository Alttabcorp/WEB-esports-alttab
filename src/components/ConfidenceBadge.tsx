import type { ConfidenceLevel } from "@/lib/stats/wilson";

const LABELS: Record<ConfidenceLevel, string> = {
  high: "Alta confiança",
  medium: "Média confiança",
  low: "Baixa confiança",
};

const STYLES: Record<ConfidenceLevel, string> = {
  high: "bg-emerald-50 text-[var(--success)] ring-emerald-600/25",
  medium: "bg-amber-50 text-[var(--warn)] ring-amber-600/25",
  low: "bg-rose-50 text-[var(--danger)] ring-rose-600/25",
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[level]}`}
    >
      {LABELS[level]}
    </span>
  );
}

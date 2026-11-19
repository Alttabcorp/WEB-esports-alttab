import type { ConfidenceLevel } from "@/lib/stats/wilson";

const LABELS: Record<ConfidenceLevel, string> = {
  high: "Alta confiança",
  medium: "Média confiança",
  low: "Baixa confiança",
};

const STYLES: Record<ConfidenceLevel, string> = {
  high: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  low: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
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

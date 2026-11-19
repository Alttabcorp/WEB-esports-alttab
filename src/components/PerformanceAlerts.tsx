import type { PerformanceAlert } from "@/lib/stats/temporal";

type Props = {
  alerts: PerformanceAlert[];
};

export function PerformanceAlerts({ alerts }: Props) {
  if (!alerts.length) return null;

  return (
    <section className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`rounded-lg border px-4 py-3 text-sm ${
            a.severity === "good"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-50"
              : a.severity === "warn"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-50"
                : "border-[#0596aa]/30 bg-[#0596aa]/10 text-[#c7eef2]"
          }`}
        >
          <p className="font-semibold">{a.title}</p>
          <p className="mt-1 opacity-90">{a.detail}</p>
        </div>
      ))}
    </section>
  );
}

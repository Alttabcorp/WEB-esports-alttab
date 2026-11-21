import type { DayLpCalendarEntry } from "@/lib/stats/lpCalendar";
import { Panel } from "@/components/ui";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

type Props = {
  calendar: DayLpCalendarEntry[];
  /** Título curto acima do grid. */
  title?: string;
};

function dayOfWeekIndex(day: string): number {
  // day = YYYY-MM-DD — usar meio-dia UTC evita shift de fuso na data civil
  const d = new Date(`${day}T12:00:00`);
  return d.getDay(); // 0=dom
}

function formatDayLabel(day: string): string {
  const [, , dd] = day.split("-");
  return String(Number(dd));
}

function cellTone(lpDelta: number | null): string {
  if (lpDelta == null) return "bg-[var(--surface-2)] text-[var(--muted)]";
  if (lpDelta > 12) return "bg-emerald-500/55 text-emerald-950";
  if (lpDelta > 0) return "bg-emerald-500/30 text-emerald-900";
  if (lpDelta < -12) return "bg-rose-500/55 text-rose-950";
  if (lpDelta < 0) return "bg-rose-500/30 text-rose-900";
  return "bg-[var(--surface-2)] text-[var(--muted-strong)]";
}

function formatDelta(lpDelta: number | null): string {
  if (lpDelta == null) return "·";
  if (lpDelta === 0) return "0";
  return `${lpDelta > 0 ? "+" : ""}${lpDelta}`;
}

/**
 * Calendário de PDL dos últimos N dias — compacto (largura limitada).
 */
export function LpCalendarGrid({
  calendar,
  title = "Calendário PDL (28 dias)",
}: Props) {
  if (!calendar.length) return null;

  const firstDow = dayOfWeekIndex(calendar[0].day);
  const pads = Array.from({ length: firstDow }, (_, i) => i);

  const withData = calendar.filter((d) => d.lpDelta != null);
  const sum = withData.reduce((acc, d) => acc + (d.lpDelta ?? 0), 0);
  const best = withData.reduce<(typeof withData)[0] | null>(
    (acc, d) =>
      !acc || (d.lpDelta ?? -Infinity) > (acc.lpDelta ?? -Infinity) ? d : acc,
    null,
  );
  const worst = withData.reduce<(typeof withData)[0] | null>(
    (acc, d) =>
      !acc || (d.lpDelta ?? Infinity) < (acc.lpDelta ?? Infinity) ? d : acc,
    null,
  );

  return (
    <Panel className="max-w-sm space-y-2 p-3 sm:max-w-md sm:p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="data-label">{title}</p>
        {withData.length > 0 ? (
          <p className="tabular text-xs font-medium text-[var(--foreground)]">
            Soma {sum >= 0 ? "+" : ""}
            {sum}
            <span className="ml-1 font-normal text-[var(--muted)]">
              · {withData.length}d
            </span>
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w, i) => (
          <div
            key={`${w}-${i}`}
            className="pb-0.5 text-center text-[9px] font-medium uppercase tracking-wide text-[var(--muted)]"
          >
            {w}
          </div>
        ))}
        {pads.map((i) => (
          <div key={`pad-${i}`} className="h-8" aria-hidden />
        ))}
        {calendar.map((d) => {
          const label = formatDayLabel(d.day);
          const delta = formatDelta(d.lpDelta);
          return (
            <div
              key={d.day}
              title={
                d.lpDelta == null
                  ? `${d.day}: sem snapshot`
                  : `${d.day}: ${d.lpDelta >= 0 ? "+" : ""}${d.lpDelta} PDL`
              }
              className={`flex h-8 flex-col items-center justify-center rounded-sm px-0.5 ${cellTone(d.lpDelta)}`}
            >
              <span className="text-[8px] leading-none opacity-65">{label}</span>
              <span className="text-[10px] font-semibold tabular leading-none">
                {delta}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--muted)]">
        {best?.lpDelta != null ? (
          <span className="text-[var(--success)]">
            Melhor {formatDayLabel(best.day)} ({formatDelta(best.lpDelta)})
          </span>
        ) : null}
        {worst?.lpDelta != null && worst.lpDelta < 0 ? (
          <span className="text-[var(--danger)]">
            Pior {formatDayLabel(worst.day)} ({formatDelta(worst.lpDelta)})
          </span>
        ) : null}
      </div>
    </Panel>
  );
}

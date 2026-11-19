type Props = {
  label: string;
  value: string;
  hint?: string;
  className?: string;
};

export function Stat({ label, value, hint, className = "" }: Props) {
  return (
    <div
      className={`rounded-lg bg-black/25 px-3 py-2 text-center ${className}`}
    >
      <p className="data-label">{label}</p>
      <p className="tabular text-lg font-semibold text-white">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

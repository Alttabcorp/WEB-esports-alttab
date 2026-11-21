type Props = {
  label: string;
  value: string;
  hint?: string;
  className?: string;
};

export function Stat({ label, value, hint, className = "" }: Props) {
  return (
    <div
      className={`rounded-[var(--radius)] bg-[var(--surface)] px-2.5 py-1.5 text-center ring-1 ring-[var(--border)] ${className}`}
    >
      <p className="data-label">{label}</p>
      <p className="tabular text-base font-semibold text-[var(--foreground)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

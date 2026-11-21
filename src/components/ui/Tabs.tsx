"use client";

type TabItem<T extends string> = {
  id: T;
  label: string;
  hint?: string;
  badge?: number | string;
};

type Props<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
};

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  size = "md",
  className = "",
}: Props<T>) {
  const pad = size === "sm" ? "px-2.5 py-1.5 text-sm" : "px-3 py-2 text-sm";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex min-w-max gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-1 ${className}`}
    >
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={item.hint}
            onClick={() => onChange(item.id)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-[calc(var(--radius)-2px)] font-medium transition ${pad} ${
              active
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
            {item.badge != null && item.badge !== 0 ? (
              <span
                className={`rounded-md px-1.5 text-[11px] font-semibold ${
                  active
                    ? "bg-[var(--alttab)]/12 text-[var(--alttab)]"
                    : "bg-[var(--warn)]/15 text-[var(--warn)]"
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

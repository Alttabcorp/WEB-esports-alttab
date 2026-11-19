import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  className = "",
}: Props) {
  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-xl border border-dashed border-[var(--border)] bg-black/20 px-4 py-6 ${className}`}
    >
      <div>
        <p className="font-semibold text-white">{title}</p>
        {description ? (
          <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

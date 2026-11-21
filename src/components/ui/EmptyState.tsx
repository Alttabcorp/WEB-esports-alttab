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
      className={`flex flex-col items-start gap-3 rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface-inset)] px-4 py-6 ${className}`}
    >
      <div>
        <p className="type-title text-base">{title}</p>
        {description ? (
          <p className="mt-1 max-w-md type-body text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

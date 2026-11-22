"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { QueueFilter } from "@/lib/riot/types";

const OPTIONS: { id: Exclude<QueueFilter, "all">; label: string; short: string }[] =
  [
    { id: "solo", label: "Solo/Duo", short: "Solo" },
    { id: "flex", label: "Flex", short: "Flex" },
    { id: "ranked", label: "Ambas", short: "Ambas" },
  ];

type Props = {
  current: string;
  className?: string;
};

/**
 * Seletor de fila de acompanhamento (persiste no perfil).
 */
export function QueueTrackSwitch({ current, className = "" }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<Exclude<QueueFilter, "all">>(
    current === "flex" || current === "solo" || current === "ranked"
      ? current
      : "ranked",
  );
  const [error, setError] = useState<string | null>(null);

  function select(next: Exclude<QueueFilter, "all">) {
    if (next === value || pending) return;
    setError(null);
    const prev = value;
    setValue(next);
    startTransition(async () => {
      try {
        const res = await fetch("/api/profile/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queue: next }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setValue(prev);
          setError(data.error ?? "Falha ao salvar");
          return;
        }
        router.refresh();
      } catch {
        setValue(prev);
        setError("Erro de rede");
      }
    });
  }

  return (
    <div className={`flex flex-col items-end gap-0.5 ${className}`}>
      <div
        role="group"
        aria-label="Fila de acompanhamento"
        className="inline-flex rounded-[var(--radius)] bg-[var(--surface-2)] p-0.5 ring-1 ring-[var(--border)]"
      >
        {OPTIONS.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={pending}
              title={`Acompanhar ${opt.label}`}
              onClick={() => select(opt.id)}
              className={`min-h-8 rounded-[calc(var(--radius)-2px)] px-2.5 text-xs font-semibold transition disabled:opacity-60 ${
                active
                  ? "bg-[var(--alttab)] text-white"
                  : "text-[var(--muted-strong)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="sm:hidden">{opt.short}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-[10px] text-[var(--danger)]">{error}</p>
      ) : (
        <p className="text-[10px] text-[var(--muted)]">
          {pending ? "Salvando…" : "Acompanhar"}
        </p>
      )}
    </div>
  );
}

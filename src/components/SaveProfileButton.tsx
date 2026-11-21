"use client";

import { useState, useTransition } from "react";
import type { RoleKey } from "@/lib/stats/roles";

type Props = {
  region: string;
  riotId: string;
  queue: string;
  matchCount: number;
  preferredRole?: RoleKey;
  isCurrentProfile?: boolean;
  /** Estilo para item de menu dropdown. */
  variant?: "button" | "menu";
  onDone?: () => void;
};

export function SaveProfileButton({
  region,
  riotId,
  queue,
  matchCount,
  preferredRole = "MIDDLE",
  isCurrentProfile = false,
  variant = "button",
  onDone,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(isCurrentProfile);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            region,
            riotId,
            queue,
            matchCount,
            preferredRole,
            analyze: false,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Falha ao salvar");
          return;
        }
        setSaved(true);
        onDone?.();
      } catch {
        setError("Erro de rede");
      }
    });
  }

  const label = pending
    ? "Salvando…"
    : saved
      ? "Perfil salvo ✓"
      : "Salvar como meu perfil";

  if (variant === "menu") {
    return (
      <div>
        <button
          type="button"
          onClick={save}
          disabled={pending || saved}
          className="block w-full px-3 py-2.5 text-left text-sm text-[var(--muted-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] disabled:cursor-default disabled:opacity-70"
        >
          {label}
        </button>
        {error ? (
          <p className="px-3 pb-1 text-xs text-[var(--danger)]">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={save}
        disabled={pending || saved}
        className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--border-strong)] hover:bg-[var(--alttab)]/15 disabled:opacity-60"
      >
        {label}
      </button>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

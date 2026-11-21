"use client";

import { useEffect, useState } from "react";

export function BridgeStatusChip({ puuid }: { puuid: string }) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/live/client?puuid=${encodeURIComponent(puuid)}`,
        );
        const data = (await res.json()) as {
          bridgeOnline?: boolean;
          phase?: string | null;
          snapshot?: { phase?: string } | null;
        };
        if (cancelled) return;
        setOnline(Boolean(data.bridgeOnline));
        setPhase(data.phase ?? data.snapshot?.phase ?? null);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [puuid]);

  const label =
    online == null
      ? "Bridge…"
      : online
        ? phase && phase !== "idle"
          ? `Bridge · ${phase}`
          : "Bridge online"
        : "Bridge offline";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-1 text-xs ${
        online
          ? "bg-[var(--success)]/15 text-[var(--success)]"
          : online === false
            ? "bg-[var(--surface-2)] text-[var(--muted)]"
            : "bg-[var(--surface-2)] text-[var(--muted)]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online ? "bg-[var(--success)] animate-pulse" : "bg-[var(--muted)]"
        }`}
      />
      {label}
    </span>
  );
}

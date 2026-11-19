"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PLATFORM_REGIONS, type PlatformRegion } from "@/lib/riot/regions";
import type { QueueFilter } from "@/lib/riot/types";
import { encodeRiotId } from "@/lib/format";
import { MATCH_COUNT_OPTIONS } from "@/lib/stats/limits";
import { Button } from "@/components/ui";

type Props = {
  defaultRegion?: PlatformRegion;
  defaultQueue?: QueueFilter;
  defaultRiotId?: string;
};

const fieldClass =
  "min-h-11 w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2.5 text-white outline-none placeholder:text-[var(--muted)] focus:border-[var(--border-strong)]";

export function SearchForm({
  defaultRegion = "br1",
  defaultQueue = "ranked",
  defaultRiotId = "",
}: Props) {
  const router = useRouter();
  const [riotId, setRiotId] = useState(defaultRiotId);
  const [region, setRegion] = useState<PlatformRegion>(defaultRegion);
  const [queue, setQueue] = useState<QueueFilter>(defaultQueue);
  const [count, setCount] = useState(200);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = riotId.trim();
    if (!trimmed.includes("#")) {
      setError("Use o formato Nome#TAG (ex.: Faker#KR1)");
      return;
    }
    const [gameName, tagLine] = [
      trimmed.slice(0, trimmed.lastIndexOf("#")),
      trimmed.slice(trimmed.lastIndexOf("#") + 1),
    ];
    if (!gameName || !tagLine) {
      setError("Riot ID incompleto");
      return;
    }
    setError(null);
    const slug = encodeRiotId(gameName.trim(), tagLine.trim());
    router.push(
      `/summoner/${region}/${slug}?queue=${queue}&count=${count}`,
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-4">
      <div>
        <label
          htmlFor="riotId"
          className="mb-1.5 block text-sm text-[var(--muted-strong)]"
        >
          Riot ID
        </label>
        <input
          id="riotId"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          placeholder="Nome#TAG"
          className={`${fieldClass} text-lg`}
          autoComplete="off"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="region"
            className="mb-1.5 block text-sm text-[var(--muted-strong)]"
          >
            Região
          </label>
          <select
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value as PlatformRegion)}
            className={fieldClass}
          >
            {PLATFORM_REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="queue"
            className="mb-1.5 block text-sm text-[var(--muted-strong)]"
          >
            Modo
          </label>
          <select
            id="queue"
            value={queue}
            onChange={(e) => setQueue(e.target.value as QueueFilter)}
            className={fieldClass}
          >
            <option value="ranked">Ranked (Solo + Flex)</option>
            <option value="solo">Ranked Solo/Duo</option>
            <option value="flex">Ranked Flex</option>
            <option value="all">Todas as filas</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="count"
            className="mb-1.5 block text-sm text-[var(--muted-strong)]"
          >
            Partidas
          </label>
          <select
            id="count"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className={fieldClass}
          >
            {MATCH_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full">
        Analisar histórico
      </Button>
    </form>
  );
}

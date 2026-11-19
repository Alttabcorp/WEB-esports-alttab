"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PLATFORM_REGIONS, type PlatformRegion } from "@/lib/riot/regions";
import type { QueueFilter } from "@/lib/riot/types";
import { encodeRiotId } from "@/lib/format";

type Props = {
  defaultRegion?: PlatformRegion;
  defaultQueue?: QueueFilter;
  defaultRiotId?: string;
};

export function SearchForm({
  defaultRegion = "br1",
  defaultQueue = "ranked",
  defaultRiotId = "",
}: Props) {
  const router = useRouter();
  const [riotId, setRiotId] = useState(defaultRiotId);
  const [region, setRegion] = useState<PlatformRegion>(defaultRegion);
  const [queue, setQueue] = useState<QueueFilter>(defaultQueue);
  const [count, setCount] = useState(50);
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
    <form
      onSubmit={onSubmit}
      className="w-full max-w-2xl space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur"
    >
      <div>
        <label htmlFor="riotId" className="mb-1.5 block text-sm text-zinc-300">
          Riot ID
        </label>
        <input
          id="riotId"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          placeholder="Nome#TAG"
          className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-lg text-white outline-none ring-[#0596aa]/40 placeholder:text-zinc-500 focus:ring-2"
          autoComplete="off"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="region" className="mb-1.5 block text-sm text-zinc-300">
            Região
          </label>
          <select
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value as PlatformRegion)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-3 text-white outline-none focus:ring-2 focus:ring-[#0596aa]/40"
          >
            {PLATFORM_REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="queue" className="mb-1.5 block text-sm text-zinc-300">
            Modo
          </label>
          <select
            id="queue"
            value={queue}
            onChange={(e) => setQueue(e.target.value as QueueFilter)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-3 text-white outline-none focus:ring-2 focus:ring-[#0596aa]/40"
          >
            <option value="ranked">Ranked (Solo + Flex)</option>
            <option value="solo">Ranked Solo/Duo</option>
            <option value="flex">Ranked Flex</option>
            <option value="all">Todas as filas</option>
          </select>
        </div>

        <div>
          <label htmlFor="count" className="mb-1.5 block text-sm text-zinc-300">
            Partidas
          </label>
          <select
            id="count"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-3 text-white outline-none focus:ring-2 focus:ring-[#0596aa]/40"
          >
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={80}>80</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <button
        type="submit"
        className="w-full rounded-xl bg-[#0596aa] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#047a8a] focus:outline-none focus:ring-2 focus:ring-[#0596aa]/50"
      >
        Analisar histórico
      </button>
    </form>
  );
}

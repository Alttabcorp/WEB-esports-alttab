"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { AppProfileView } from "@/lib/db/persist";
import { encodeRiotId } from "@/lib/format";
import { PLATFORM_REGIONS, type PlatformRegion } from "@/lib/riot/regions";
import type { QueueFilter } from "@/lib/riot/types";
import { MATCH_COUNT_OPTIONS } from "@/lib/stats/limits";
import { ROLE_LABELS, type RoleKey } from "@/lib/stats/roles";

const ROLES: RoleKey[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

type Props = {
  initial?: AppProfileView | null;
};

export function ProfileSettingsForm({ initial = null }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);

  const [riotId, setRiotId] = useState(
    initial ? `${initial.gameName}#${initial.tagLine}` : "",
  );
  const [region, setRegion] = useState<PlatformRegion>(
    (initial?.platform as PlatformRegion) ?? "br1",
  );
  const [queue, setQueue] = useState<QueueFilter>(
    (initial?.queue as QueueFilter) ?? "ranked",
  );
  const [matchCount, setMatchCount] = useState(initial?.matchCount ?? 200);
  const [preferredRole, setPreferredRole] = useState<RoleKey>(
    (initial?.preferredRole as RoleKey) ?? "MIDDLE",
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [stats, setStats] = useState({
    stored: initial?.storedMatchCount ?? 0,
    lastSyncedAt: initial?.lastSyncedAt ?? null,
  });

  function save(e: FormEvent, sync: boolean) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!riotId.includes("#")) {
      setError("Use o formato Nome#TAG");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            region,
            riotId: riotId.trim(),
            queue,
            matchCount,
            preferredRole,
            analyze: sync,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          profile?: AppProfileView;
        };
        if (!res.ok) {
          setError(data.error ?? "Falha ao salvar");
          return;
        }
        if (data.profile) {
          setStats({
            stored: data.profile.storedMatchCount,
            lastSyncedAt: data.profile.lastSyncedAt,
          });
        }
        setMessage(
          sync
            ? "Perfil salvo e histórico sincronizado no banco."
            : "Perfil salvo. Coach e draft usam o banco daqui pra frente.",
        );
        router.refresh();
        if (data.profile) {
          const slug = encodeRiotId(
            data.profile.gameName,
            data.profile.tagLine,
          );
          router.push(
            `/summoner/${data.profile.platform}/${slug}?queue=${data.profile.queue}&count=${data.profile.matchCount}`,
          );
        }
      } catch {
        setError("Erro de rede");
      }
    });
  }

  function syncOnly() {
    setError(null);
    setMessage(null);
    setSyncing(true);
    startTransition(async () => {
      try {
        const res = await fetch("/api/profile/sync", { method: "POST" });
        const data = (await res.json()) as {
          error?: string;
          profile?: AppProfileView;
          analysis?: { analyzedGames: number };
        };
        if (!res.ok) {
          setError(data.error ?? "Falha na sincronização");
          return;
        }
        if (data.profile) {
          setStats({
            stored: data.profile.storedMatchCount,
            lastSyncedAt: data.profile.lastSyncedAt,
          });
        }
        setMessage(
          `Histórico atualizado: ${data.analysis?.analyzedGames ?? "?"} partidas no banco.`,
        );
        router.refresh();
      } catch {
        setError("Erro de rede");
      } finally {
        setSyncing(false);
      }
    });
  }

  const busy = pending || syncing;

  return (
    <form className="panel w-full max-w-2xl space-y-5 p-5" onSubmit={(e) => save(e, !initial)}>
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-white">
          Meu perfil
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Salve uma vez e o coach lê as estatísticas do Postgres — sem buscar
          partidas na Riot a cada abertura.
        </p>
      </div>

      {initial || stats.stored > 0 ? (
        <div className="rounded-lg border border-white/8 bg-black/25 px-3 py-2 text-sm text-zinc-300">
          <p>
            {stats.stored} partidas no banco
            {stats.lastSyncedAt
              ? ` · última sync ${new Date(stats.lastSyncedAt).toLocaleString("pt-BR")}`
              : ""}
          </p>
        </div>
      ) : null}

      <div>
        <label htmlFor="cfg-riotId" className="mb-1.5 block text-sm text-zinc-300">
          Riot ID
        </label>
        <input
          id="cfg-riotId"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          placeholder="Nome#TAG"
          className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-lg text-white outline-none ring-[#0596aa]/40 placeholder:text-zinc-500 focus:ring-2"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cfg-region" className="mb-1.5 block text-sm text-zinc-300">
            Região
          </label>
          <select
            id="cfg-region"
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
          <label htmlFor="cfg-role" className="mb-1.5 block text-sm text-zinc-300">
            Lane preferida
          </label>
          <select
            id="cfg-role"
            value={preferredRole}
            onChange={(e) => setPreferredRole(e.target.value as RoleKey)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-3 text-white outline-none focus:ring-2 focus:ring-[#0596aa]/40"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cfg-queue" className="mb-1.5 block text-sm text-zinc-300">
            Modo
          </label>
          <select
            id="cfg-queue"
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
          <label htmlFor="cfg-count" className="mb-1.5 block text-sm text-zinc-300">
            Partidas a sincronizar
          </label>
          <select
            id="cfg-count"
            value={matchCount}
            onChange={(e) => setMatchCount(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-3 text-white outline-none focus:ring-2 focus:ring-[#0596aa]/40"
          >
            {MATCH_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
                {n >= 200 ? " (recomendado)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-[#7dd3de]">{message}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-xl bg-[#0596aa] px-4 py-3 text-sm font-semibold text-white hover:bg-[#047a8a] disabled:opacity-60"
        >
          {busy
            ? "Salvando…"
            : initial
              ? "Salvar configuração"
              : "Salvar e sincronizar histórico"}
        </button>

        {initial ? (
          <button
            type="button"
            onClick={syncOnly}
            disabled={busy}
            className="rounded-xl border border-[#0596aa]/40 bg-[#0596aa]/10 px-4 py-3 text-sm font-semibold text-[#7dd3de] hover:bg-[#0596aa]/20 disabled:opacity-60"
          >
            {syncing ? "Sincronizando…" : "Atualizar histórico (Riot)"}
          </button>
        ) : null}
      </div>

      {initial ? (
        <button
          type="button"
          disabled={busy}
          onClick={(e) => save(e, true)}
          className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline disabled:opacity-50"
        >
          Salvar e sincronizar agora
        </button>
      ) : null}
    </form>
  );
}

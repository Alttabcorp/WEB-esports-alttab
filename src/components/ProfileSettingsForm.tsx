"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { AppProfileView } from "@/lib/db/persist";
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
  const [dailyLpTarget, setDailyLpTarget] = useState(
    initial?.dailyLpTarget ?? 30,
  );
  const [dailyLpStop, setDailyLpStop] = useState(initial?.dailyLpStop ?? -40);
  const [dailyLpTargetFlex, setDailyLpTargetFlex] = useState<string>(
    initial?.dailyLpTargetFlex != null
      ? String(initial.dailyLpTargetFlex)
      : "",
  );
  const [dailyLpStopFlex, setDailyLpStopFlex] = useState<string>(
    initial?.dailyLpStopFlex != null ? String(initial.dailyLpStopFlex) : "",
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
            dailyLpTarget,
            dailyLpStop,
            dailyLpTargetFlex:
              dailyLpTargetFlex.trim() === ""
                ? null
                : Number(dailyLpTargetFlex),
            dailyLpStopFlex:
              dailyLpStopFlex.trim() === "" ? null : Number(dailyLpStopFlex),
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
          router.push("/");
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
        <h2 className="text-lg text-[var(--foreground)]">
          Meu perfil
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Salve uma vez e o coach lê as estatísticas do Postgres — sem buscar
          partidas na Riot a cada abertura.
        </p>
      </div>

      {initial || stats.stored > 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted-strong)]">
          <p>
            {stats.stored} partidas no banco
            {stats.lastSyncedAt
              ? ` · última sync ${new Date(stats.lastSyncedAt).toLocaleString("pt-BR")}`
              : ""}
          </p>
        </div>
      ) : null}

      <div>
        <label htmlFor="cfg-riotId" className="mb-1.5 block text-sm text-[var(--muted-strong)]">
          Riot ID
        </label>
        <input
          id="cfg-riotId"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          placeholder="Nome#TAG"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-lg text-[var(--foreground)] outline-none ring-[var(--focus-ring)] placeholder:text-[var(--muted)] focus:ring-2"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cfg-region" className="mb-1.5 block text-sm text-[var(--muted-strong)]">
            Região
          </label>
          <select
            id="cfg-region"
            value={region}
            onChange={(e) => setRegion(e.target.value as PlatformRegion)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            {PLATFORM_REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cfg-role" className="mb-1.5 block text-sm text-[var(--muted-strong)]">
            Lane preferida
          </label>
          <select
            id="cfg-role"
            value={preferredRole}
            onChange={(e) => setPreferredRole(e.target.value as RoleKey)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="cfg-lp-target"
            className="mb-1.5 block text-sm text-[var(--muted-strong)]"
          >
            Meta Solo / dia
          </label>
          <input
            id="cfg-lp-target"
            type="number"
            min={5}
            max={100}
            value={dailyLpTarget}
            onChange={(e) => setDailyLpTarget(Number(e.target.value))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        </div>

        <div>
          <label
            htmlFor="cfg-lp-stop"
            className="mb-1.5 block text-sm text-[var(--muted-strong)]"
          >
            Stop Solo
          </label>
          <input
            id="cfg-lp-stop"
            type="number"
            min={-100}
            max={-5}
            value={dailyLpStop}
            onChange={(e) => setDailyLpStop(Number(e.target.value))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        </div>

        <div>
          <label
            htmlFor="cfg-lp-target-flex"
            className="mb-1.5 block text-sm text-[var(--muted-strong)]"
          >
            Meta Flex / dia{" "}
            <span className="text-[var(--muted)]">(opcional)</span>
          </label>
          <input
            id="cfg-lp-target-flex"
            type="number"
            min={5}
            max={100}
            placeholder="Herda Solo"
            value={dailyLpTargetFlex}
            onChange={(e) => setDailyLpTargetFlex(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        </div>

        <div>
          <label
            htmlFor="cfg-lp-stop-flex"
            className="mb-1.5 block text-sm text-[var(--muted-strong)]"
          >
            Stop Flex{" "}
            <span className="text-[var(--muted)]">(opcional)</span>
          </label>
          <input
            id="cfg-lp-stop-flex"
            type="number"
            min={-100}
            max={-5}
            placeholder="Herda Solo"
            value={dailyLpStopFlex}
            onChange={(e) => setDailyLpStopFlex(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        </div>

        <div>
          <label htmlFor="cfg-queue" className="mb-1.5 block text-sm text-[var(--muted-strong)]">
            Fila de acompanhamento
          </label>
          <select
            id="cfg-queue"
            value={queue}
            onChange={(e) => setQueue(e.target.value as QueueFilter)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            <option value="solo">Solo/Duo</option>
            <option value="flex">Flex</option>
            <option value="ranked">Ambas (Solo + Flex)</option>
            <option value="all">Todas as filas</option>
          </select>
        </div>

        <div>
          <label htmlFor="cfg-count" className="mb-1.5 block text-sm text-[var(--muted-strong)]">
            Partidas a sincronizar
          </label>
          <select
            id="cfg-count"
            value={matchCount}
            onChange={(e) => setMatchCount(Number(e.target.value))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
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

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--alttab)]">{message}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-xl bg-[var(--alttab)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--alttab-deep)] disabled:opacity-60"
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
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--alttab)]/10 px-4 py-3 text-sm font-semibold text-[var(--alttab)] hover:bg-[var(--alttab)]/20 disabled:opacity-60"
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
          className="text-xs text-[var(--muted)] underline-offset-2 hover:text-[var(--muted-strong)] hover:underline disabled:opacity-50"
        >
          Salvar e sincronizar agora
        </button>
      ) : null}
    </form>
  );
}

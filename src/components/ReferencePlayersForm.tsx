"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { profileIconUrl } from "@/lib/ddragon";
import type { ReferencePlayerView } from "@/lib/db/persist";
import { PLATFORM_REGIONS, type PlatformRegion } from "@/lib/riot/regions";
import { MATCH_COUNT_OPTIONS } from "@/lib/stats/limits";

type Props = {
  initial: ReferencePlayerView[];
  ddragonVersion: string;
  defaultRegion: PlatformRegion;
};

export function ReferencePlayersForm({
  initial,
  ddragonVersion,
  defaultRegion,
}: Props) {
  const router = useRouter();
  const [refs, setRefs] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState<PlatformRegion>(defaultRegion);
  const [label, setLabel] = useState("");
  const [matchCount, setMatchCount] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/references", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            region,
            riotId: riotId.trim(),
            label: label.trim() || undefined,
            matchCount,
            sync: true,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          references?: ReferencePlayerView[];
        };
        if (!res.ok) {
          setError(data.error ?? "Falha ao adicionar");
          return;
        }
        setRefs(data.references ?? []);
        setRiotId("");
        setLabel("");
        setMessage(
          "Referência adicionada e histórico sincronizado (dados externos — não altera seu PDL/Coach).",
        );
        router.refresh();
      } catch {
        setError("Erro de rede");
      }
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/references?id=${id}`, { method: "DELETE" });
      const data = (await res.json()) as {
        error?: string;
        references?: ReferencePlayerView[];
      };
      if (!res.ok) {
        setError(data.error ?? "Falha ao remover");
        return;
      }
      setRefs(data.references ?? []);
      router.refresh();
    });
  }

  function syncAll() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/references/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        error?: string;
        references?: ReferencePlayerView[];
      };
      if (!res.ok) {
        setError(data.error ?? "Falha na sync");
        return;
      }
      setRefs(data.references ?? []);
      setMessage("Referências sincronizadas.");
      router.refresh();
    });
  }

  return (
    <section className="panel w-full space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">
          {refs.length === 0
            ? "Nenhuma referência cadastrada ainda."
            : `${refs.length} referência${refs.length > 1 ? "s" : ""}`}
        </p>
        {refs.length > 0 ? (
          <button
            type="button"
            disabled={pending}
            onClick={syncAll}
            className="rounded-lg border border-[var(--border-strong)] bg-[var(--alttab)]/10 px-3 py-1.5 text-sm font-semibold text-[var(--alttab-soft)] disabled:opacity-60"
          >
            Atualizar todos
          </button>
        ) : null}
      </div>

      {refs.length > 0 ? (
        <ul className="space-y-2">
          {refs.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
            >
              <Image
                src={profileIconUrl(ddragonVersion, r.profileIconId ?? 29)}
                alt=""
                width={36}
                height={36}
                className="rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--foreground)]">
                  {r.gameName}
                  <span className="text-[#0596aa]">#{r.tagLine}</span>
                  {r.label ? (
                    <span className="ml-2 text-xs text-[var(--muted)]">{r.label}</span>
                  ) : null}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {r.storedMatchCount} partidas · {r.platform.toUpperCase()}
                  {r.lastSyncedAt
                    ? ` · sync ${new Date(r.lastSyncedAt).toLocaleString("pt-BR")}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(r.id)}
                className="text-xs text-[var(--muted)] hover:text-[var(--danger)]"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={add} className="space-y-3 border-t border-[var(--border)] pt-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">Adicionar referência</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-[var(--muted-strong)]">
              Riot ID
            </label>
            <input
              value={riotId}
              onChange={(e) => setRiotId(e.target.value)}
              placeholder="MonoTop#BR1"
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)] outline-none focus:border-[var(--border-strong)]"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted-strong)]">
              Região
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as PlatformRegion)}
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)]"
            >
              {PLATFORM_REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted-strong)]">
              Partidas
            </label>
            <select
              value={matchCount}
              onChange={(e) => setMatchCount(Number(e.target.value))}
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)]"
            >
              {MATCH_COUNT_OPTIONS.filter((n) => n <= 200).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-[var(--muted-strong)]">
              Apelido (opcional)
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex.: mono Ornn, coach top"
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)] outline-none focus:border-[var(--border-strong)]"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        {message ? (
          <p className="text-sm text-[var(--alttab-soft)]">{message}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-[var(--alttab)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--alttab-deep)] disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Adicionar e sincronizar"}
        </button>
      </form>
    </section>
  );
}

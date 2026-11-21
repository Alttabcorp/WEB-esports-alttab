"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { itemIconUrl } from "@/lib/ddragon";
import type { RuneCatalog } from "@/lib/ddragon";
import { pct } from "@/lib/format";
import type { MetaBand, MetaChampionResult } from "@/lib/meta/types";
import type { LeagueEntryDto } from "@/lib/riot/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { DataOriginBadge } from "./DataOriginBadge";
import { RunePageIcons } from "./RunePageIcons";

type Props = {
  championId: number;
  championName: string;
  platform: string;
  ranked: LeagueEntryDto[];
  ddragonVersion: string;
  runeCatalog: RuneCatalog;
  /** Sem panel externo (ex.: aba Comparar). */
  embedded?: boolean;
};

export function MetaComparePanel({
  championId,
  championName,
  platform,
  ranked,
  ddragonVersion,
  runeCatalog,
  embedded = false,
}: Props) {
  const [band, setBand] = useState<MetaBand>("HIGH");
  const [meta, setMeta] = useState<MetaChampionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rankedKey = JSON.stringify(ranked);

  useEffect(() => {
    setMeta(null);
    setError(null);
    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          championId: String(championId),
          region: platform,
          band,
        });
        if (band === "PEER") {
          params.set("ranked", rankedKey);
        }
        const res = await fetch(`/api/meta/champion?${params}`);
        const data = (await res.json()) as {
          error?: string;
          meta?: MetaChampionResult;
        };
        if (!res.ok) {
          setError(data.error ?? "Falha ao carregar meta");
          return;
        }
        setMeta(data.meta ?? null);
      } catch {
        setError("Erro de rede ao carregar meta");
      }
    });
  }, [championId, platform, band, rankedKey]);

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg text-[var(--foreground)]">
              Meta · {championName}
            </h2>
            <DataOriginBadge origin="meta" />
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Amostra anônima do ladder Riot (cache 12h) — não grava no seu
            histórico nem altera PDL/Coach.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-[var(--surface-inset)] p-1">
          <BandBtn
            active={band === "HIGH"}
            onClick={() => setBand("HIGH")}
            label="Altos elos"
          />
          <BandBtn
            active={band === "PEER"}
            onClick={() => setBand("PEER")}
            label="Mesmo elo"
          />
        </div>
      </div>

      {pending ? (
        <p className="text-sm text-[var(--alttab)]">
          Coletando amostra no ladder… (pode levar ~1 min na 1ª vez)
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      {meta && !pending ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
            <span>
              {meta.sampleGames} jogos · {meta.samplePlayers} players
            </span>
            <span>
              {meta.tier}
              {meta.division && meta.division !== "-"
                ? ` ${meta.division}`
                : ""}
            </span>
            <span>{pct(meta.overallWr)} WR amostra</span>
            {meta.cached ? <span>cache</span> : null}
            {meta.partial ? (
              <span className="text-amber-300/90">parcial</span>
            ) : null}
          </div>
          <p className="text-xs text-[var(--muted)]">{meta.note}</p>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="data-label mb-2">Builds mais comuns</p>
              {meta.builds.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Sem builds na amostra</p>
              ) : (
                <ul className="space-y-2">
                  {meta.builds.map((b) => (
                    <li
                      key={b.fingerprint}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm text-[var(--muted-strong)]">
                          {pct(b.wr)} · {b.games} jogos
                        </span>
                        <ConfidenceBadge level={b.confidence} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {b.items.map((id) => (
                          <Image
                            key={`${b.fingerprint}-${id}`}
                            src={itemIconUrl(ddragonVersion, id)}
                            alt={`Item ${id}`}
                            width={32}
                            height={32}
                            className="rounded-md"
                          />
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="data-label mb-2">Runas mais comuns</p>
              {meta.runes.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Sem runas na amostra</p>
              ) : (
                <ul className="space-y-2">
                  {meta.runes.map((r) => (
                    <li
                      key={r.fingerprint}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm text-[var(--muted-strong)]">
                          {pct(r.wr)} · {r.games} jogos
                        </span>
                        <ConfidenceBadge level={r.confidence} />
                      </div>
                      <RunePageIcons
                        primaryStyle={r.primaryStyle}
                        subStyle={r.subStyle}
                        keystone={r.keystone}
                        primaryPerkIds={r.primaryPerkIds}
                        subPerkIds={r.subPerkIds}
                        perkIds={r.perkIds}
                        runeCatalog={runeCatalog}
                        size="sm"
                        showLabels={false}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <p className="data-label mb-2">
              Monos / one-tricks na amostra (≥{4} jogos do champ)
            </p>
            {meta.monos.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Nenhum mono claro nesta amostra. Tente altos elos ou aguarde
                mais cache.
              </p>
            ) : (
              <ul className="space-y-2">
                {meta.monos.map((m) => (
                  <li
                    key={m.puuid}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-[var(--foreground)]">
                        {m.tier}{" "}
                        <span className="text-[var(--muted)]">
                          · {m.games} jogos · {pct(m.wr)} WR
                        </span>
                      </p>
                    </div>
                    {m.topBuild ? (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {m.topBuild.items.map((id) => (
                          <Image
                            key={`${m.puuid}-${id}`}
                            src={itemIconUrl(ddragonVersion, id)}
                            alt={`Item ${id}`}
                            width={28}
                            height={28}
                            className="rounded-md"
                          />
                        ))}
                      </div>
                    ) : null}
                    {m.topRune ? (
                      <RunePageIcons
                        primaryStyle={m.topRune.primaryStyle}
                        subStyle={m.topRune.subStyle}
                        keystone={m.topRune.keystone}
                        primaryPerkIds={m.topRune.primaryPerkIds}
                        subPerkIds={m.topRune.subPerkIds}
                        perkIds={m.topRune.perkIds}
                        runeCatalog={runeCatalog}
                        size="sm"
                        showLabels={false}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{body}</div>;
  }

  return <section className="panel space-y-4 p-4">{body}</section>;
}

function BandBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-[var(--alttab)] text-white"
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
    </button>
  );
}

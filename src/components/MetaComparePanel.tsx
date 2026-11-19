"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { itemIconUrl } from "@/lib/ddragon";
import type { RuneCatalog } from "@/lib/ddragon";
import { pct } from "@/lib/format";
import type { MetaBand, MetaChampionResult } from "@/lib/meta/types";
import type { LeagueEntryDto } from "@/lib/riot/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { RunePageIcons } from "./RunePageIcons";

type Props = {
  championId: number;
  championName: string;
  platform: string;
  ranked: LeagueEntryDto[];
  ddragonVersion: string;
  runeCatalog: RuneCatalog;
};

export function MetaComparePanel({
  championId,
  championName,
  platform,
  ranked,
  ddragonVersion,
  runeCatalog,
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

  return (
    <section className="panel space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg text-white">
            Comparativo · {championName}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Builds e runas amostradas no ladder Riot (cache 12h)
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-black/30 p-1">
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
        <p className="text-sm text-[#7dd3de]">
          Coletando amostra no ladder… (pode levar ~1 min na 1ª vez)
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      {meta && !pending ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
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
            {meta.partial ? <span className="text-amber-300/90">parcial</span> : null}
          </div>
          <p className="text-xs text-zinc-600">{meta.note}</p>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="data-label mb-2">Builds mais comuns</p>
              {meta.builds.length === 0 ? (
                <p className="text-sm text-zinc-500">Sem builds na amostra</p>
              ) : (
                <ul className="space-y-2">
                  {meta.builds.map((b) => (
                    <li
                      key={b.fingerprint}
                      className="rounded-lg border border-white/8 bg-black/25 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm text-zinc-300">
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
                <p className="text-sm text-zinc-500">Sem runas na amostra</p>
              ) : (
                <ul className="space-y-2">
                  {meta.runes.map((r) => (
                    <li
                      key={r.fingerprint}
                      className="rounded-lg border border-white/8 bg-black/25 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm text-zinc-300">
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
              <p className="text-sm text-zinc-500">
                Nenhum mono claro nesta amostra. Tente altos elos ou aguarde
                mais cache.
              </p>
            ) : (
              <ul className="space-y-2">
                {meta.monos.map((m) => (
                  <li
                    key={m.puuid}
                    className="rounded-lg border border-white/8 bg-black/25 p-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-white">
                        {m.tier}{" "}
                        <span className="text-zinc-500">
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
    </section>
  );
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
          ? "bg-[#0596aa] text-white"
          : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}

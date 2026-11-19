"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { itemIconUrl, type RuneCatalog } from "@/lib/ddragon";
import type { ReferenceChampionInsight } from "@/lib/db/persist";
import { pct } from "@/lib/format";
import { RunePageIcons } from "./RunePageIcons";

type Props = {
  championId: number | null;
  championName: string | null;
  ddragonVersion: string;
  runeCatalog: RuneCatalog;
};

export function ReferencePlayersPanel({
  championId,
  championName,
  ddragonVersion,
  runeCatalog,
}: Props) {
  const [insights, setInsights] = useState<ReferenceChampionInsight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!championId) {
      setInsights([]);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/references/champion?championId=${championId}`,
        );
        const data = (await res.json()) as {
          error?: string;
          insights?: ReferenceChampionInsight[];
        };
        if (!res.ok) {
          setError(data.error ?? "Falha ao carregar referências");
          return;
        }
        setInsights(data.insights ?? []);
      } catch {
        setError("Erro de rede");
      }
    });
  }, [championId]);

  if (!championId) return null;

  return (
    <section className="panel space-y-3 p-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-white">
          Referências · {championName}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Builds e runas dos monos que você cadastrou em Referências
        </p>
      </div>

      {pending ? (
        <p className="text-sm text-[var(--alttab-soft)]">Carregando referências…</p>
      ) : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {!pending && !error && insights.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Nenhuma referência com jogos de {championName}. Adicione monos em{" "}
          <a href="/referencias" className="text-[var(--alttab-soft)] hover:underline">
            Referências
          </a>{" "}
          e sincronize o histórico deles.
        </p>
      ) : null}

      <ul className="space-y-3">
        {insights.map((ins) => (
          <li
            key={ins.referenceId}
            className="rounded-lg border border-white/8 bg-black/25 p-3"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-white">
                  {ins.gameName}
                  <span className="text-[#0596aa]">#{ins.tagLine}</span>
                  {ins.label ? (
                    <span className="ml-2 text-xs text-zinc-500">
                      · {ins.label}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-zinc-500">
                  {ins.games} jogos · {pct(ins.wr)} WR neste champ
                </p>
              </div>
            </div>

            {ins.topBuild ? (
              <div className="mb-2">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-zinc-600">
                  Build mais usada · {pct(ins.topBuild.wr)} · {ins.topBuild.games}x
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ins.topBuild.items.map((id) => (
                    <Image
                      key={`${ins.referenceId}-${id}`}
                      src={itemIconUrl(ddragonVersion, id)}
                      alt=""
                      width={28}
                      height={28}
                      className="rounded-md"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {ins.topRune ? (
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-zinc-600">
                  Runas · {pct(ins.topRune.wr)} · {ins.topRune.games}x
                </p>
                <RunePageIcons
                  primaryStyle={ins.topRune.primaryStyle}
                  subStyle={ins.topRune.subStyle}
                  keystone={ins.topRune.keystone}
                  primaryPerkIds={ins.topRune.primaryPerkIds}
                  subPerkIds={ins.topRune.subPerkIds}
                  perkIds={ins.topRune.perkIds}
                  runeCatalog={runeCatalog}
                  size="sm"
                  showLabels={false}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

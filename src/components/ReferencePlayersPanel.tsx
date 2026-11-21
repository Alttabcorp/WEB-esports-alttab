"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { itemIconUrl, type RuneCatalog } from "@/lib/ddragon";
import type { ReferenceChampionInsight } from "@/lib/db/persist";
import { pct } from "@/lib/format";
import { DataOriginBadge } from "./DataOriginBadge";
import { RunePageIcons } from "./RunePageIcons";

type Props = {
  championId: number | null;
  championName: string | null;
  ddragonVersion: string;
  runeCatalog: RuneCatalog;
  /** Sem panel externo (ex.: aba Comparar). */
  embedded?: boolean;
};

export function ReferencePlayersPanel({
  championId,
  championName,
  ddragonVersion,
  runeCatalog,
  embedded = false,
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

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg text-[var(--foreground)]">
              Referências · {championName}
            </h2>
            <DataOriginBadge origin="reference" />
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Builds e runas dos monos que você cadastrou — não entram no seu WR,
            PDL nem Coach.
          </p>
        </div>
      </div>

      {pending ? (
        <p className="text-sm text-[var(--alttab-soft)]">
          Carregando referências…
        </p>
      ) : null}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {!pending && !error && insights.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Nenhuma referência com jogos de {championName}. Adicione monos em{" "}
          <Link
            href="/referencias"
            className="text-[var(--alttab-soft)] hover:underline"
          >
            Referências
          </Link>{" "}
          e sincronize o histórico deles.
        </p>
      ) : null}

      <ul className="space-y-3">
        {insights.map((ins) => (
          <li
            key={ins.referenceId}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-[var(--foreground)]">
                  {ins.gameName}
                  <span className="text-[#0596aa]">#{ins.tagLine}</span>
                  {ins.label ? (
                    <span className="ml-2 text-xs text-[var(--muted)]">
                      · {ins.label}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {ins.games} jogos · {pct(ins.wr)} WR neste champ
                </p>
              </div>
            </div>

            {ins.topBuild ? (
              <div className="mb-2">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  Build mais usada · {pct(ins.topBuild.wr)} ·{" "}
                  {ins.topBuild.games} jogos
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
                <p className="mb-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  Runas · {pct(ins.topRune.wr)} · {ins.topRune.games} jogos
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
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{body}</div>;
  }

  return <section className="panel space-y-3 p-4">{body}</section>;
}

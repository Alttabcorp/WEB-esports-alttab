"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { championIconUrl, itemIconUrl } from "@/lib/ddragon";
import type { MatchHistoryRow } from "@/lib/db/persist";
import { ROLE_LABELS } from "@/lib/stats/roles";
import { Button } from "@/components/ui";

type Props = {
  matches: MatchHistoryRow[];
  ddragonVersion: string;
  idToKey: Record<number, string>;
  pageSize?: number;
};

const QUEUE_LABEL: Record<number, string> = {
  420: "Solo/Duo",
  440: "Flex",
  450: "ARAM",
  400: "Normal",
  430: "Blind",
};

const DEFAULT_PAGE_SIZE = 10;

export function MatchHistoryPanel({
  matches,
  ddragonVersion,
  idToKey,
  pageSize = DEFAULT_PAGE_SIZE,
}: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  const slice = useMemo(() => {
    const start = safePage * pageSize;
    return matches.slice(start, start + pageSize);
  }, [matches, safePage, pageSize]);

  const from = matches.length === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min(matches.length, (safePage + 1) * pageSize);

  return (
    <section className="panel space-y-3 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg text-[var(--foreground)]">
            Histórico de partidas
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {matches.length > 0
              ? `Mostrando ${from}–${to} de ${matches.length} partidas salvas`
              : "Nenhuma partida no banco — sincronize em Config"}
          </p>
        </div>
        {matches.length > pageSize ? (
          <p className="text-xs text-[var(--muted)]">
            Página {safePage + 1} / {totalPages}
          </p>
        ) : null}
      </div>

      {matches.length === 0 ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-[var(--warn)]">
          Vá em Config → Atualizar histórico para gravar as partidas aqui.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-white/5">
            {slice.map((m) => {
              const champKey = idToKey[m.championId] ?? m.championName;
              const enemyKey =
                m.enemyChampionId != null
                  ? idToKey[m.enemyChampionId] ?? m.enemyChampionName
                  : null;
              const when = new Date(m.gameCreation).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
              const mins = Math.max(1, Math.round(m.gameDuration / 60));

              return (
                <li
                  key={m.matchId}
                  className={`flex flex-wrap items-center gap-3 py-3 ${
                    m.win ? "bg-emerald-500/[0.04]" : "bg-rose-500/[0.04]"
                  }`}
                >
                  <div
                    className={`w-1 self-stretch rounded-full ${
                      m.win ? "bg-[var(--success)]" : "bg-rose-400"
                    }`}
                  />
                  <Image
                    src={championIconUrl(ddragonVersion, champKey)}
                    alt={m.championName}
                    width={40}
                    height={40}
                    className="rounded-md"
                  />
                  <div className="min-w-[7rem] flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {m.championName}
                      <span
                        className={`ml-2 text-xs ${
                          m.win
                            ? "text-[var(--success)]"
                            : "text-[var(--danger)]"
                        }`}
                      >
                        {m.win ? "Vitória" : "Derrota"}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {ROLE_LABELS[m.role] ?? m.role} ·{" "}
                      {QUEUE_LABEL[m.queueId] ?? `Q${m.queueId}`} · {mins} min ·{" "}
                      {m.patch !== "desconhecido" ? `p${m.patch}` : when}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{when}</p>
                  </div>

                  <p className="tabular-nums text-sm text-[var(--foreground)]">
                    {m.kills}/{m.deaths}/{m.assists}
                    <span className="ml-2 text-xs text-[var(--muted)]">
                      {m.cs} CS
                    </span>
                  </p>

                  {enemyKey ? (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                      <span>vs</span>
                      <Image
                        src={championIconUrl(ddragonVersion, enemyKey)}
                        alt={m.enemyChampionName ?? ""}
                        width={28}
                        height={28}
                        className="rounded"
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-1">
                    {m.items.map((id) => (
                      <Image
                        key={`${m.matchId}-${id}`}
                        src={itemIconUrl(ddragonVersion, id)}
                        alt=""
                        width={22}
                        height={22}
                        className="rounded"
                      />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>

          {matches.length > pageSize ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Anterior
              </Button>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    className={`min-w-8 rounded-[var(--radius)] px-2 py-1 text-xs font-medium tabular ${
                      i === safePage
                        ? "bg-[var(--alttab)] text-white"
                        : "bg-[var(--surface-2)] text-[var(--muted-strong)] hover:text-[var(--foreground)]"
                    }`}
                    aria-label={`Página ${i + 1}`}
                    aria-current={i === safePage ? "page" : undefined}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage >= totalPages - 1}
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
              >
                Próxima →
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

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

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchDetailBody({
  m,
  ddragonVersion,
  idToKey,
}: {
  m: MatchHistoryRow;
  ddragonVersion: string;
  idToKey: Record<number, string>;
}) {
  const mins = Math.max(1, Math.round(m.gameDuration / 60));
  const csPerMin = (m.cs / mins).toFixed(1);
  const goldPerMin =
    m.goldEarned > 0 ? Math.round(m.goldEarned / mins).toLocaleString("pt-BR") : "—";
  const enemyKey =
    m.enemyChampionId != null
      ? idToKey[m.enemyChampionId] ?? m.enemyChampionName
      : null;

  return (
    <div className="space-y-3 border-t border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <DetailStat
          label="KDA"
          value={`${m.kills}/${m.deaths}/${m.assists}`}
        />
        <DetailStat label="CS" value={`${m.cs} (${csPerMin}/min)`} />
        <DetailStat
          label="Dano a champs"
          value={m.damageToChamps.toLocaleString("pt-BR")}
        />
        <DetailStat
          label="Ouro"
          value={`${m.goldEarned.toLocaleString("pt-BR")} (${goldPerMin}/min)`}
        />
        <DetailStat label="Visão" value={String(m.visionScore)} />
        <DetailStat label="Nível" value={String(m.champLevel || "—")} />
        <DetailStat
          label="KP"
          value={
            m.killParticipation != null ? `${m.killParticipation}%` : "—"
          }
        />
        <DetailStat
          label="Fila"
          value={QUEUE_LABEL[m.queueId] ?? `Q${m.queueId}`}
        />
        <DetailStat
          label="ΔPDL"
          value={
            m.lpDelta == null
              ? "—"
              : `${m.lpDelta > 0 ? "+" : ""}${Math.round(m.lpDelta)}${
                  m.lpDeltaSource === "estimate" ? " (est.)" : ""
                }`
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="data-label mb-1">Itens</p>
          <div className="flex flex-wrap gap-1">
            {m.items.length ? (
              m.items.map((id, idx) => (
                <Image
                  key={`${m.matchId}-d-${id}-${idx}`}
                  src={itemIconUrl(ddragonVersion, id)}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded ring-1 ring-[var(--border)]"
                />
              ))
            ) : (
              <span className="text-xs text-[var(--muted)]">Sem itens</span>
            )}
          </div>
        </div>
        {enemyKey ? (
          <div>
            <p className="data-label mb-1">Lane adversária</p>
            <div className="flex items-center gap-2">
              <Image
                src={championIconUrl(ddragonVersion, enemyKey)}
                alt={m.enemyChampionName ?? ""}
                width={28}
                height={28}
                className="rounded"
              />
              <span className="text-[var(--muted-strong)]">
                {m.enemyChampionName}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-[var(--muted)]">
        {formatWhen(m.gameCreation)} · {mins} min · patch{" "}
        {m.patch !== "desconhecido" ? m.patch : "—"} · {m.matchId}
      </p>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] bg-[var(--surface)] px-2.5 py-2 ring-1 ring-[var(--border)]">
      <p className="data-label">{label}</p>
      <p className="mt-0.5 tabular font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

export function MatchHistoryPanel({
  matches,
  ddragonVersion,
  idToKey,
  pageSize = DEFAULT_PAGE_SIZE,
}: Props) {
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
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
              ? `Mostrando ${from}–${to} de ${matches.length} · clique para detalhes`
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
          <ul className="divide-y divide-[var(--border)]">
            {slice.map((m) => {
              const champKey = idToKey[m.championId] ?? m.championName;
              const enemyKey =
                m.enemyChampionId != null
                  ? idToKey[m.enemyChampionId] ?? m.enemyChampionName
                  : null;
              const when = formatWhen(m.gameCreation);
              const mins = Math.max(1, Math.round(m.gameDuration / 60));
              const open = openId === m.matchId;

              return (
                <li key={m.matchId}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenId((prev) =>
                        prev === m.matchId ? null : m.matchId,
                      )
                    }
                    className={`flex w-full flex-wrap items-center gap-3 px-1 py-3 text-left transition hover:bg-[var(--surface-2)] ${
                      m.win ? "bg-emerald-500/[0.04]" : "bg-rose-500/[0.04]"
                    }`}
                    aria-expanded={open}
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
                        {QUEUE_LABEL[m.queueId] ?? `Q${m.queueId}`} · {mins}{" "}
                        min · {when}
                      </p>
                    </div>

                    <p className="tabular-nums text-sm text-[var(--foreground)]">
                      {m.kills}/{m.deaths}/{m.assists}
                      <span className="ml-2 text-xs text-[var(--muted)]">
                        {m.cs} CS
                      </span>
                    </p>

                    {m.lpDelta != null ? (
                      <p
                        className={`min-w-[3.25rem] text-right text-sm font-semibold tabular-nums ${
                          m.lpDelta > 0
                            ? "text-[var(--success)]"
                            : m.lpDelta < 0
                              ? "text-[var(--danger)]"
                              : "text-[var(--muted)]"
                        }`}
                        title={
                          m.lpDeltaSource === "snapshot"
                            ? "ΔPDL medido entre snapshots de elo"
                            : "ΔPDL estimado (média win/loss)"
                        }
                      >
                        {m.lpDelta > 0 ? "+" : ""}
                        {Math.round(m.lpDelta)}
                        <span className="ml-0.5 text-[9px] font-normal text-[var(--muted)]">
                          {m.lpDeltaSource === "snapshot" ? "PDL" : "~PDL"}
                        </span>
                      </p>
                    ) : (
                      <p className="min-w-[3.25rem] text-right text-xs text-[var(--muted)]">
                        —
                      </p>
                    )}

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
                      {m.items.slice(0, 6).map((id, idx) => (
                        <Image
                          key={`${m.matchId}-${id}-${idx}`}
                          src={itemIconUrl(ddragonVersion, id)}
                          alt=""
                          width={22}
                          height={22}
                          className="rounded"
                        />
                      ))}
                    </div>

                    <span className="ml-auto text-xs text-[var(--muted)]">
                      {open ? "Fechar" : "Detalhes"}
                    </span>
                  </button>
                  {open ? (
                    <MatchDetailBody
                      m={m}
                      ddragonVersion={ddragonVersion}
                      idToKey={idToKey}
                    />
                  ) : null}
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

"use client";

import Image from "next/image";
import type { ChampionInsight } from "@/lib/stats/aggregate";
import type { PoolPick } from "@/lib/stats/contextualPool";
import type { RuneCatalog } from "@/lib/ddragon";
import { itemIconUrl } from "@/lib/ddragon";
import { pct } from "@/lib/format";
import { ChampionIcon } from "./ChampionIcon";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { RunePageIcons } from "./RunePageIcons";
import { Button, Panel } from "@/components/ui";

type Props = {
  picks: PoolPick[];
  champions: ChampionInsight[];
  ddragonVersion: string;
  idToKey: Record<number, string>;
  runeCatalog: RuneCatalog;
  onSelect?: (championId: number) => void;
  selectedId?: number | null;
  statsHref?: string;
  coachHref?: string;
};

/**
 * Quadro de decisão do momento: 1 pick em destaque + alternativas.
 * Não usa lista+painel lateral — a informação útil já aparece no card.
 */
export function TodayPoolPanel({
  picks,
  champions,
  ddragonVersion,
  idToKey,
  runeCatalog,
  onSelect,
  selectedId,
  statsHref = "/estatisticas",
  coachHref = "/coach",
}: Props) {
  if (picks.length === 0) {
    return (
      <Panel className="p-5">
        <p className="data-label">Agora</p>
        <h2 className="mt-1 type-title">O que jogar</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Amostra insuficiente para montar o pool do momento. Sincronize mais
          partidas em Config.
        </p>
      </Panel>
    );
  }

  const featuredId =
    selectedId && picks.some((p) => p.championId === selectedId)
      ? selectedId
      : picks[0].championId;
  const featured =
    picks.find((p) => p.championId === featuredId) ?? picks[0];
  const featuredChamp = champions.find(
    (c) => c.championId === featured.championId,
  );
  const topBuild = featuredChamp?.topBuilds[0] ?? null;
  const topRune = featuredChamp?.topRunes?.[0] ?? null;
  const alternatives = picks.filter((p) => p.championId !== featured.championId);
  const evPositive = featured.expectedLp >= 0;

  return (
    <Panel strong className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="data-label">Agora</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
              O que jogar neste horário
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
              Ranking do momento (horário, forma e EV de PDL) — escolha o pick
              principal ou uma alternativa abaixo.
            </p>
          </div>
          <p className="text-xs text-[var(--muted)]">
            {picks.length} opções · atualiza com o contexto do dia
          </p>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Pick principal */}
        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start gap-4">
            <ChampionIcon
              ddragonVersion={ddragonVersion}
              championId={featured.championId}
              nameOrKey={featured.championName}
              idToKey={idToKey}
              alt={featured.championName}
              width={80}
              height={80}
              className="rounded-[var(--radius)] ring-2 ring-[var(--alttab)]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--alttab)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Pick #1
                </span>
                <ConfidenceBadge level={featured.confidence} />
              </div>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                {featured.championName}
              </h3>
              <p className="mt-1 text-sm text-[var(--muted-strong)]">
                {pct(featured.wr)} WR · {featured.games} jogos no histórico
              </p>
            </div>
            <div
              className={`min-w-[7.5rem] rounded-[var(--radius)] px-4 py-3 text-center ring-1 ${
                evPositive
                  ? "bg-emerald-500/10 ring-emerald-500/25"
                  : "bg-rose-500/10 ring-rose-500/25"
              }`}
            >
              <p className="data-label">EV / fila</p>
              <p
                className={`mt-1 text-3xl font-semibold tabular ${
                  evPositive ? "text-[var(--success)]" : "text-[var(--danger)]"
                }`}
              >
                {featured.expectedLp >= 0 ? "+" : ""}
                {featured.expectedLp}
              </p>
              <p className="text-[11px] text-[var(--muted)]">PDL estimado</p>
            </div>
          </div>

          <div>
            <p className="data-label mb-2">Por que este pick</p>
            <ul className="space-y-2">
              {featured.reasons.map((reason) => (
                <li
                  key={reason}
                  className="flex gap-2 text-sm text-[var(--foreground)]"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--alttab)]" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {(topBuild || topRune) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {topBuild ? (
                <div>
                  <p className="data-label mb-2">
                    Build estável · {pct(topBuild.wr)} · {topBuild.games} jogos
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {topBuild.items.map((id, idx) => (
                      <Image
                        key={`pool-build-${id}-${idx}`}
                        src={itemIconUrl(ddragonVersion, id)}
                        alt=""
                        width={36}
                        height={36}
                        className="rounded-md ring-1 ring-[var(--border)]"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {topRune ? (
                <div>
                  <p className="data-label mb-2">
                    Runas · {pct(topRune.wr)} · {topRune.games} jogos
                  </p>
                  <RunePageIcons
                    primaryStyle={topRune.primaryStyle}
                    subStyle={topRune.subStyle}
                    keystone={topRune.keystone}
                    primaryPerkIds={topRune.primaryPerkIds}
                    subPerkIds={topRune.subPerkIds}
                    perkIds={topRune.perkIds}
                    runeCatalog={runeCatalog}
                    size="sm"
                    showLabels={false}
                  />
                </div>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button href={coachHref} size="sm">
              Abrir Coach
            </Button>
            <Button href={statsHref} variant="secondary" size="sm">
              Ver estatísticas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect?.(featured.championId)}
            >
              Usar no ranking abaixo
            </Button>
          </div>
        </div>

        {/* Alternativas */}
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-5 lg:border-l lg:border-t-0 sm:px-5">
          <p className="data-label mb-3">Alternativas agora</p>
          {alternatives.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Só um pick passou no filtro deste horário.
            </p>
          ) : (
            <ul className="space-y-2">
              {alternatives.map((p, i) => {
                const active = featured.championId === p.championId;
                return (
                  <li key={p.championId}>
                    <button
                      type="button"
                      onClick={() => onSelect?.(p.championId)}
                      className={`flex w-full items-center gap-3 rounded-[var(--radius)] border px-3 py-3 text-left transition ${
                        active
                          ? "border-[var(--alttab)] bg-[var(--alttab)]/10"
                          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      <span className="w-5 text-sm font-bold text-[var(--muted)]">
                        {i + 2}
                      </span>
                      <ChampionIcon
                        ddragonVersion={ddragonVersion}
                        championId={p.championId}
                        nameOrKey={p.championName}
                        idToKey={idToKey}
                        alt={p.championName}
                        width={40}
                        height={40}
                        className="rounded-lg"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[var(--foreground)]">
                          {p.championName}
                        </p>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {p.reasons[0] ?? `${pct(p.wr)} WR`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`tabular text-sm font-semibold ${
                            p.expectedLp >= 0
                              ? "text-[var(--success)]"
                              : "text-[var(--danger)]"
                          }`}
                        >
                          {p.expectedLp >= 0 ? "+" : ""}
                          {p.expectedLp}
                        </p>
                        <p className="text-[10px] text-[var(--muted)]">PDL EV</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-[11px] leading-relaxed text-[var(--muted)]">
            Clique numa alternativa para torná-la o pick principal e ver build /
            runas. O ranking geral continua abaixo se quiser explorar mais
            campeões.
          </p>
        </div>
      </div>
    </Panel>
  );
}

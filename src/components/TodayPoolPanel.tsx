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
  /** Champ em destaque neste quadro (estado próprio). */
  featuredId?: number | null;
  onFeature?: (championId: number) => void;
  /** Link para o dossiê do pick em destaque. */
  champHref?: string;
  rankingHref?: string;
  statsHref?: string;
  coachHref?: string;
};

/**
 * Quadro de decisão do momento: 1 pick em destaque + alternativas.
 * Estado independente do ranking geral.
 */
export function TodayPoolPanel({
  picks,
  champions,
  ddragonVersion,
  idToKey,
  runeCatalog,
  featuredId = null,
  onFeature,
  champHref,
  rankingHref = "/ranking",
  statsHref = "/estatisticas",
  coachHref = "/coach",
}: Props) {
  if (picks.length === 0) {
    return (
      <Panel className="p-4">
        <p className="data-label">Agora</p>
        <h2 className="mt-1 type-title text-base">O que jogar</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Amostra insuficiente para montar o pool do momento. Sincronize mais
          partidas em Config.
        </p>
      </Panel>
    );
  }

  const activeFeaturedId =
    featuredId && picks.some((p) => p.championId === featuredId)
      ? featuredId
      : picks[0].championId;
  const featured =
    picks.find((p) => p.championId === activeFeaturedId) ?? picks[0];
  const featuredChamp = champions.find(
    (c) => c.championId === featured.championId,
  );
  const topBuild = featuredChamp?.topBuilds[0] ?? null;
  const topRune = featuredChamp?.topRunes?.[0] ?? null;
  const alternatives = picks.filter((p) => p.championId !== featured.championId);
  const evPositive = featured.expectedLp >= 0;

  return (
    <Panel strong className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="data-label">Agora</p>
            <h2 className="mt-0.5 text-lg font-semibold text-[var(--foreground)] sm:text-xl">
              O que jogar neste horário
            </h2>
            <p className="mt-0.5 max-w-xl text-xs text-[var(--muted)] sm:text-sm">
              Clique numa alternativa para destacar. Abra o ranking para ver
              suas estatísticas com o campeão.
            </p>
          </div>
          <p className="text-[11px] text-[var(--muted)]">
            {picks.length} opções
          </p>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="min-w-0 space-y-4 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start gap-3">
            <ChampionIcon
              ddragonVersion={ddragonVersion}
              championId={featured.championId}
              nameOrKey={featured.championName}
              idToKey={idToKey}
              alt={featured.championName}
              width={64}
              height={64}
              className="rounded-[var(--radius)] ring-2 ring-[var(--alttab)]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--alttab)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Destaque
                </span>
                <ConfidenceBadge level={featured.confidence} />
              </div>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                {featured.championName}
              </h3>
              <p className="mt-0.5 text-sm text-[var(--muted-strong)]">
                {pct(featured.wr)} WR · {featured.games} jogos
              </p>
            </div>
            <div
              className={`min-w-[6.5rem] rounded-[var(--radius)] px-3 py-2 text-center ring-1 ${
                evPositive
                  ? "bg-emerald-500/10 ring-emerald-500/25"
                  : "bg-rose-500/10 ring-rose-500/25"
              }`}
            >
              <p className="data-label">PDL esperado</p>
              <p
                className={`mt-0.5 text-2xl font-semibold tabular ${
                  evPositive ? "text-[var(--success)]" : "text-[var(--danger)]"
                }`}
              >
                {featured.expectedLp >= 0 ? "+" : ""}
                {featured.expectedLp}
              </p>
              <p className="text-[10px] text-[var(--muted)]">nesta fila</p>
            </div>
          </div>

          <div>
            <p className="data-label mb-1.5">Por que este pick</p>
            <ul className="space-y-1.5">
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
            <div className="grid gap-3 sm:grid-cols-2">
              {topBuild ? (
                <div>
                  <p className="data-label mb-1.5">
                    Build · {pct(topBuild.wr)} · {topBuild.games}j
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {topBuild.items.map((id, idx) => (
                      <Image
                        key={`pool-build-${id}-${idx}`}
                        src={itemIconUrl(ddragonVersion, id)}
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-md ring-1 ring-[var(--border)]"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {topRune ? (
                <div>
                  <p className="data-label mb-1.5">
                    Runas · {pct(topRune.wr)} · {topRune.games}j
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

          <div className="flex flex-wrap gap-2">
            <Button href={coachHref} size="sm">
              Abrir Coach
            </Button>
            <Button
              href={champHref ?? `/ranking`}
              variant="secondary"
              size="sm"
            >
              Ver no ranking
            </Button>
            <Button href={rankingHref} variant="ghost" size="sm">
              Ranking completo
            </Button>
            <Button href={statsHref} variant="ghost" size="sm">
              Estatísticas
            </Button>
          </div>
        </div>

        <div className="min-w-0 border-t border-[var(--border)] bg-[var(--surface-2)] px-3 py-4 lg:border-l lg:border-t-0 sm:px-4">
          <p className="data-label mb-2">Alternativas</p>
          {alternatives.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Só um pick passou no filtro deste horário.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {alternatives.map((p, i) => (
                <li key={p.championId}>
                  <button
                    type="button"
                    onClick={() => onFeature?.(p.championId)}
                    className="flex w-full items-center gap-2.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-left transition hover:border-[var(--border-strong)]"
                  >
                    <span className="w-4 text-xs font-bold text-[var(--muted)]">
                      {i + 2}
                    </span>
                    <ChampionIcon
                      ddragonVersion={ddragonVersion}
                      championId={p.championId}
                      nameOrKey={p.championName}
                      idToKey={idToKey}
                      alt={p.championName}
                      width={32}
                      height={32}
                      className="rounded-md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {p.championName}
                      </p>
                      <p className="truncate text-[11px] text-[var(--muted)]">
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
                      <p className="text-[9px] text-[var(--muted)]">PDL</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

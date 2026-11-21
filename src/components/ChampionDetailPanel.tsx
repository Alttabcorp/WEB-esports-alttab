"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChampionInsight } from "@/lib/stats/aggregate";
import type { MatchHistoryRow } from "@/lib/db/persist";
import type { RuneCatalog } from "@/lib/ddragon";
import { pct, signedPct } from "@/lib/format";
import type { LeagueEntryDto } from "@/lib/riot/types";
import { ROLE_LABELS } from "@/lib/stats/roles";
import { BuildLeaderboard } from "./BuildLeaderboard";
import { RuneLeaderboard } from "./RuneLeaderboard";
import { MatchupTable } from "./MatchupTable";
import { ChampionIcon } from "./ChampionIcon";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { DataOriginBadge } from "./DataOriginBadge";
import { MetaComparePanel } from "./MetaComparePanel";
import { MatchDetailBody } from "./MatchHistoryPanel";
import { Button, Panel, Stat, Tabs } from "@/components/ui";

type DetailTab =
  | "overview"
  | "builds"
  | "runes"
  | "compare"
  | "matchups"
  | "history";

type Props = {
  champion: ChampionInsight;
  champions: ChampionInsight[];
  onSelect: (id: number) => void;
  matchHistory: MatchHistoryRow[];
  ddragonVersion: string;
  idToKey: Record<number, string>;
  runeCatalog: RuneCatalog;
  platform: string;
  ranked: LeagueEntryDto[];
  lpAvg?: number | null;
  lpGames?: number | null;
  onOpenModal?: (tab: "meta" | "more-builds" | "more-runes") => void;
  /** Esconde busca/select quando a seleção vem de uma lista ao lado (ex.: Ranking). */
  hidePicker?: boolean;
};

export function ChampionDetailPanel({
  champion,
  champions,
  onSelect,
  matchHistory,
  ddragonVersion,
  idToKey,
  runeCatalog,
  platform,
  ranked,
  lpAvg = null,
  lpGames = null,
  onOpenModal,
  hidePicker = false,
}: Props) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const [query, setQuery] = useState("");
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);

  // Quando o ranking/pai muda o champ, limpa a busca pra não “prender” o select.
  useEffect(() => {
    setQuery("");
  }, [champion.championId]);

  const sortedChamps = useMemo(
    () => [...champions].sort((a, b) => b.games - a.games),
    [champions],
  );

  const filteredPicker = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? sortedChamps
      : sortedChamps.filter((c) =>
          c.championName.toLowerCase().includes(q),
        );
    // Garante que o champ atual aparece mesmo com filtro parcial
    if (
      champion &&
      !base.some((c) => c.championId === champion.championId)
    ) {
      return [champion, ...base];
    }
    return base;
  }, [sortedChamps, query, champion]);

  const champMatches = useMemo(
    () =>
      matchHistory.filter((m) => m.championId === champion.championId).slice(0, 12),
    [matchHistory, champion.championId],
  );

  const bestMu = useMemo(
    () =>
      [...champion.matchups]
        .filter((m) => m.games >= 2)
        .sort((a, b) => b.wilsonLower - a.wilsonLower)
        .slice(0, 5),
    [champion.matchups],
  );
  const worstMu = useMemo(
    () =>
      [...champion.matchups]
        .filter((m) => m.games >= 2)
        .sort((a, b) => a.wilsonLower - b.wilsonLower)
        .slice(0, 5),
    [champion.matchups],
  );

  const synergies = useMemo(
    () =>
      [...(champion.allySynergies ?? [])]
        .filter((s) => s.games >= 2)
        .sort((a, b) => b.wilsonLower - a.wilsonLower)
        .slice(0, 5),
    [champion.allySynergies],
  );

  return (
    <Panel className="min-w-0 space-y-3 p-3 sm:p-4">
      {!hidePicker ? (
        <div className="space-y-2">
          <label className="data-label" htmlFor="champ-picker">
            Selecionar campeão
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const first = filteredPicker.find(
                  (c) => c.championId !== champion.championId,
                ) ?? filteredPicker[0];
                if (first) {
                  onSelect(first.championId);
                  setQuery("");
                }
              }}
              placeholder="Buscar e Enter para selecionar…"
              className="min-h-9 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
            />
            <select
              id="champ-picker"
              value={champion.championId}
              onChange={(e) => {
                onSelect(Number(e.target.value));
                setQuery("");
              }}
              className="min-h-9 min-w-0 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--foreground)]"
            >
              {filteredPicker.map((c) => (
                <option key={c.championId} value={c.championId}>
                  {c.championName} · {c.games} jogos · {pct(c.wr)}
                </option>
              ))}
            </select>
          </div>
          {query && filteredPicker.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">
              Nenhum campeão com esse nome na amostra.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <ChampionIcon
          ddragonVersion={ddragonVersion}
          championId={champion.championId}
          nameOrKey={champion.championName}
          idToKey={idToKey}
          alt={champion.championName}
          width={56}
          height={56}
          className="rounded-[var(--radius)] ring-2 ring-[var(--alttab)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="type-title truncate">{champion.championName}</h2>
            <ConfidenceBadge level={champion.confidence} />
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Suas estatísticas · {champion.games} partidas na amostra
          </p>
        </div>
        {hidePicker ? (
          <Button
            href={`/estatisticas?champ=${champion.championId}`}
            variant="secondary"
            size="sm"
          >
            Por lane
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="WR" value={pct(champion.wr)} hint={`${champion.wins}W ${champion.games - champion.wins}L`} />
        <Stat label="KDA" value={champion.kda.toFixed(2)} />
        <Stat
          label="CS/min"
          value={champion.csPerMin.toFixed(1)}
        />
        <Stat
          label="Lift"
          value={signedPct(champion.lift)}
          hint={
            lpAvg != null
              ? `PDL médio ${lpAvg >= 0 ? "+" : ""}${lpAvg}${lpGames != null ? ` · ${lpGames}j` : ""}`
              : "vs sua média"
          }
        />
      </div>

      <Tabs
        ariaLabel="Detalhe do campeão"
        value={tab}
        onChange={setTab}
        size="sm"
        items={[
          { id: "overview", label: "Resumo" },
          { id: "builds", label: "Builds" },
          { id: "runes", label: "Runas" },
          { id: "compare", label: "Comparar" },
          { id: "matchups", label: "Matchups" },
          {
            id: "history",
            label: "Partidas",
            badge: champMatches.length || undefined,
          },
        ]}
      />

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat
              label="Dano médio"
              value={Math.round(champion.avgDamage).toLocaleString("pt-BR")}
            />
            <MiniStat
              label="Visão média"
              value={(champion.vision / Math.max(champion.games, 1)).toFixed(1)}
            />
            <MiniStat
              label="Duração média"
              value={`${Math.round(champion.durationSec / Math.max(champion.games, 1) / 60)} min`}
            />
          </div>

          {synergies.length > 0 ? (
            <div>
              <p className="data-label mb-2">Melhores sinergias (aliados)</p>
              <ul className="space-y-1.5">
                {synergies.map((s) => (
                  <li
                    key={s.allyChampionId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2 text-[var(--muted-strong)]">
                      <ChampionIcon
                        ddragonVersion={ddragonVersion}
                        championId={s.allyChampionId}
                        nameOrKey={s.allyChampionName}
                        idToKey={idToKey}
                        alt={s.allyChampionName}
                        width={24}
                        height={24}
                        className="rounded"
                      />
                      {s.allyChampionName}
                    </span>
                    <span className="tabular text-[var(--muted)]">
                      {pct(s.wr)} · {s.games} jogos
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Ainda sem sinergias repetidas (mín. 2 jogos com o mesmo aliado).
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button href="/estatisticas" variant="secondary" size="sm">
              Ver estatísticas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTab("compare")}
            >
              Comparar builds
            </Button>
            {onOpenModal ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenModal("more-builds")}
              >
                Mais builds
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "builds" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="data-label">Builds mais estáveis</p>
            <DataOriginBadge origin="self" />
          </div>
          {champion.topBuilds.length ? (
            <BuildLeaderboard
              builds={champion.topBuilds.slice(0, 5)}
              championName={champion.championName}
              ddragonVersion={ddragonVersion}
              large
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">Sem builds agregadas.</p>
          )}
          {onOpenModal ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenModal("more-builds")}
            >
              Mais builds
            </Button>
          ) : null}
        </div>
      ) : null}

      {tab === "runes" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="data-label">Páginas de runas</p>
            <DataOriginBadge origin="self" />
          </div>
          {(champion.topRunes ?? []).length ? (
            <RuneLeaderboard
              runes={(champion.topRunes ?? []).slice(0, 5)}
              championName={champion.championName}
              runeCatalog={runeCatalog}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">Sem runas agregadas.</p>
          )}
          {onOpenModal ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenModal("more-runes")}
            >
              Mais runas
            </Button>
          ) : null}
        </div>
      ) : null}

      {tab === "compare" ? (
        <div className="space-y-5">
          <p className="text-sm text-[var(--muted)]">
            Compare sua build com a meta do ladder. Badges marcam a origem —
            meta nunca altera seu WR, PDL ou Coach.
          </p>

          <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="data-label">Sua build</p>
              <DataOriginBadge origin="self" />
            </div>
            {champion.topBuilds[0] ? (
              <BuildLeaderboard
                builds={champion.topBuilds.slice(0, 1)}
                championName={champion.championName}
                ddragonVersion={ddragonVersion}
                large
              />
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Sem build própria ainda neste campeão.
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="data-label">Suas runas</p>
              <DataOriginBadge origin="self" />
            </div>
            {(champion.topRunes ?? [])[0] ? (
              <RuneLeaderboard
                runes={(champion.topRunes ?? []).slice(0, 1)}
                championName={champion.championName}
                runeCatalog={runeCatalog}
              />
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Sem runas próprias ainda neste campeão.
              </p>
            )}
          </div>

          <MetaComparePanel
            championId={champion.championId}
            championName={champion.championName}
            platform={platform}
            ranked={ranked}
            ddragonVersion={ddragonVersion}
            runeCatalog={runeCatalog}
            embedded
          />
        </div>
      ) : null}

      {tab === "matchups" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <MatchupTable
            title="Melhores vs"
            matchups={bestMu}
            ddragonVersion={ddragonVersion}
            idToKey={idToKey}
            emptyText="Poucos confrontos repetidos ainda."
          />
          <MatchupTable
            title="Piores vs"
            matchups={worstMu}
            ddragonVersion={ddragonVersion}
            idToKey={idToKey}
            emptyText="Sem matchups fracos repetidos."
          />
        </div>
      ) : null}

      {tab === "history" ? (
        champMatches.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Nenhuma partida recente deste campeão no histórico carregado.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {champMatches.map((m) => {
              const when = new Date(m.gameCreation).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
              const open = openMatchId === m.matchId;
              return (
                <li key={m.matchId}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMatchId((prev) =>
                        prev === m.matchId ? null : m.matchId,
                      )
                    }
                    className="flex w-full flex-wrap items-center gap-3 py-2.5 text-left text-sm hover:bg-[var(--surface-2)]"
                    aria-expanded={open}
                  >
                    <span
                      className={`text-xs font-semibold ${
                        m.win ? "text-[var(--success)]" : "text-[var(--danger)]"
                      }`}
                    >
                      {m.win ? "W" : "L"}
                    </span>
                    <span className="text-[var(--muted)]">
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                    <span className="tabular text-[var(--foreground)]">
                      {m.kills}/{m.deaths}/{m.assists}
                    </span>
                    <span className="text-[var(--muted)]">{m.cs} CS</span>
                    {m.enemyChampionName ? (
                      <span className="flex items-center gap-1.5 text-[var(--muted)]">
                        vs
                        <ChampionIcon
                          ddragonVersion={ddragonVersion}
                          championId={m.enemyChampionId}
                          nameOrKey={m.enemyChampionName}
                          idToKey={idToKey}
                          alt={m.enemyChampionName}
                          width={22}
                          height={22}
                          className="rounded"
                        />
                        {m.enemyChampionName}
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-[var(--muted)]">
                      {when} · {open ? "fechar" : "detalhes"}
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
        )
      ) : null}
    </Panel>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] bg-[var(--surface-2)] px-3 py-2 ring-1 ring-[var(--border)]">
      <p className="data-label">{label}</p>
      <p className="mt-0.5 tabular text-sm font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

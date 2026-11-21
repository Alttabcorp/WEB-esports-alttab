"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ChampionInsight, RoleInsight } from "@/lib/stats/aggregate";
import type { MatchHistoryRow } from "@/lib/db/persist";
import type { RuneCatalog } from "@/lib/ddragon";
import type { ChampOverview, ChampRoleStat } from "@/lib/stats/championRoleStats";
import { ROLE_LABELS, type RoleKey } from "@/lib/stats/roles";
import { pct, signedPct } from "@/lib/format";
import { BuildLeaderboard } from "./BuildLeaderboard";
import { RuneLeaderboard } from "./RuneLeaderboard";
import { MatchupTable } from "./MatchupTable";
import { ChampionIcon } from "./ChampionIcon";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { Button, Panel, Stat, Tabs } from "@/components/ui";

type RoleFilter = "ALL" | RoleKey;

type DetailTab = "resumo" | "builds" | "matchups" | "partidas";

type Props = {
  champions: ChampionInsight[];
  roleInsights: RoleInsight[];
  champOverviews: ChampOverview[];
  byChampRole: ChampRoleStat[];
  matchHistory: MatchHistoryRow[];
  ddragonVersion: string;
  idToKey: Record<number, string>;
  runeCatalog: RuneCatalog;
  prepHref: string;
  overallWr: number;
  analyzedGames: number;
};

const ROLE_FILTERS: RoleFilter[] = [
  "ALL",
  "TOP",
  "JUNGLE",
  "MIDDLE",
  "BOTTOM",
  "UTILITY",
];

export function StatsExplorer({
  champions,
  roleInsights,
  champOverviews,
  byChampRole,
  matchHistory,
  ddragonVersion,
  idToKey,
  runeCatalog,
  prepHref,
  overallWr,
  analyzedGames,
}: Props) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [selectedId, setSelectedId] = useState<number | null>(
    champOverviews[0]?.championId ?? null,
  );
  const [query, setQuery] = useState("");
  const [detailTab, setDetailTab] = useState<DetailTab>("resumo");
  const [detailRole, setDetailRole] = useState<RoleFilter>("ALL");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = champOverviews;
    if (roleFilter !== "ALL") {
      const ids = new Set(
        byChampRole
          .filter((r) => r.role === roleFilter && r.games >= 1)
          .map((r) => r.championId),
      );
      rows = champOverviews
        .filter((c) => ids.has(c.championId))
        .map((c) => {
          const lane = c.roles.find((r) => r.role === roleFilter);
          if (!lane) return c;
          return {
            ...c,
            games: lane.games,
            wins: lane.wins,
            wr: lane.wr,
            kda: lane.kda,
            csPerMin: lane.csPerMin,
          };
        })
        .sort((a, b) => b.games - a.games);
    }
    if (q) {
      rows = rows.filter((c) => c.championName.toLowerCase().includes(q));
    }
    return rows;
  }, [champOverviews, byChampRole, roleFilter, query]);

  const selectedOverview = useMemo(
    () => champOverviews.find((c) => c.championId === selectedId) ?? null,
    [champOverviews, selectedId],
  );

  const selectedInsight = useMemo(
    () => champions.find((c) => c.championId === selectedId) ?? null,
    [champions, selectedId],
  );

  const activeRoleStat = useMemo(() => {
    if (!selectedOverview) return null;
    if (detailRole === "ALL") return null;
    return selectedOverview.roles.find((r) => r.role === detailRole) ?? null;
  }, [selectedOverview, detailRole]);

  const displayStat = activeRoleStat
    ? {
        games: activeRoleStat.games,
        wins: activeRoleStat.wins,
        wr: activeRoleStat.wr,
        kda: activeRoleStat.kda,
        csPerMin: activeRoleStat.csPerMin,
        losses: activeRoleStat.losses,
      }
    : selectedOverview
      ? {
          games: selectedOverview.games,
          wins: selectedOverview.wins,
          wr: selectedOverview.wr,
          kda: selectedOverview.kda,
          csPerMin: selectedOverview.csPerMin,
          losses: selectedOverview.games - selectedOverview.wins,
        }
      : null;

  const filteredMatchups = useMemo(() => {
    if (!selectedInsight) return { best: [], worst: [] };
    let mus = selectedInsight.matchups.filter((m) => m.games >= 2);
    if (detailRole !== "ALL") {
      mus = mus.filter((m) => m.role === detailRole);
    }
    const best = [...mus]
      .sort((a, b) => b.wilsonLower - a.wilsonLower)
      .slice(0, 6);
    const worst = [...mus]
      .sort((a, b) => a.wilsonLower - b.wilsonLower)
      .slice(0, 6);
    return { best, worst };
  }, [selectedInsight, detailRole]);

  const champMatches = useMemo(() => {
    if (!selectedId) return [];
    return matchHistory
      .filter((m) => {
        if (m.championId !== selectedId) return false;
        if (detailRole !== "ALL" && m.role !== detailRole) return false;
        return true;
      })
      .slice(0, 20);
  }, [matchHistory, selectedId, detailRole]);

  function selectChampion(id: number) {
    setSelectedId(id);
    setDetailTab("resumo");
    // Ao clicar na lista filtrada por lane, foca essa lane no detalhe
    setDetailRole(roleFilter === "ALL" ? "ALL" : roleFilter);
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="data-label">Seu histórico</p>
        <h1 className="type-display text-3xl text-[var(--foreground)] sm:text-4xl">
          Estatísticas
        </h1>
        <p className="max-w-2xl text-sm text-[var(--muted)]">
          Selecione um campeão e uma lane para ver só os seus dados — WR, KDA,
          builds, matchups e partidas. Não mistura referências nem meta.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Stat
            label="WR geral"
            value={pct(overallWr)}
            hint={`${analyzedGames} jogos`}
            className="min-w-[7rem]"
          />
          {roleInsights
            .filter((r) => r.role !== "UNKNOWN" && r.games >= 3)
            .slice(0, 5)
            .map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => {
                  setRoleFilter(r.role);
                  setDetailRole(r.role);
                }}
                className="text-left"
              >
                <Stat
                  label={ROLE_LABELS[r.role]}
                  value={pct(r.wr)}
                  hint={`${r.games}j · lift ${signedPct(r.lift)}`}
                  className="min-w-[7rem]"
                />
              </button>
            ))}
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {ROLE_FILTERS.map((r) => {
          const active = roleFilter === r;
          const label =
            r === "ALL" ? "Todas" : ROLE_LABELS[r as RoleKey] ?? r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`min-h-9 rounded-[var(--radius)] px-3 text-sm font-medium transition ${
                active
                  ? "bg-[var(--alttab)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--muted-strong)] ring-1 ring-[var(--border)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
        <Panel className="space-y-3 p-4">
          <div>
            <h2 className="type-title text-base">Campeões</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {roleFilter === "ALL"
                ? "Clique para abrir o detalhe."
                : `Filtrado por ${ROLE_LABELS[roleFilter]} — só partidas nessa lane.`}
            </p>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar campeão…"
            className="min-h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
          />
          {list.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Nenhum campeão nesta amostra
              {roleFilter !== "ALL"
                ? ` em ${ROLE_LABELS[roleFilter]}`
                : ""}
              .
            </p>
          ) : (
            <ul className="max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
              {list.map((c) => {
                const active = selectedId === c.championId;
                const primaryRole = c.roles[0];
                return (
                  <li key={c.championId}>
                    <button
                      type="button"
                      onClick={() => selectChampion(c.championId)}
                      className={`flex w-full items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-[var(--alttab)] bg-[var(--alttab)]/12"
                          : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      <ChampionIcon
                        ddragonVersion={ddragonVersion}
                        championId={c.championId}
                        nameOrKey={c.championName}
                        idToKey={idToKey}
                        alt={c.championName}
                        width={40}
                        height={40}
                        className="rounded-lg"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[var(--foreground)]">
                          {c.championName}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {pct(c.wr)} WR · {c.games} jogos
                          {roleFilter === "ALL" && primaryRole
                            ? ` · mais em ${ROLE_LABELS[primaryRole.role]}`
                            : ""}
                        </p>
                      </div>
                      <p className="tabular text-sm text-[var(--muted-strong)]">
                        {c.kda.toFixed(2)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel className="space-y-4 p-4">
          {!selectedOverview || !displayStat ? (
            <p className="text-sm text-[var(--muted)]">
              Selecione um campeão à esquerda.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <ChampionIcon
                  ddragonVersion={ddragonVersion}
                  championId={selectedOverview.championId}
                  nameOrKey={selectedOverview.championName}
                  idToKey={idToKey}
                  alt={selectedOverview.championName}
                  width={64}
                  height={64}
                  className="rounded-[var(--radius)] ring-2 ring-[var(--alttab)]"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="type-title truncate">
                    {selectedOverview.championName}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Seus dados
                    {detailRole !== "ALL"
                      ? ` · ${ROLE_LABELS[detailRole]}`
                      : " · todas as lanes"}
                  </p>
                  {selectedInsight ? (
                    <div className="mt-1">
                      <ConfidenceBadge level={selectedInsight.confidence} />
                    </div>
                  ) : null}
                </div>
                <Button href={prepHref} variant="secondary" size="sm">
                  Abrir no Preparar
                </Button>
              </div>

              <div>
                <p className="data-label mb-2">Lane neste campeão</p>
                <div className="flex flex-wrap gap-1.5">
                  <RoleChip
                    active={detailRole === "ALL"}
                    label={`Todas (${selectedOverview.games})`}
                    onClick={() => setDetailRole("ALL")}
                  />
                  {selectedOverview.roles.map((r) => (
                    <RoleChip
                      key={r.role}
                      active={detailRole === r.role}
                      label={`${ROLE_LABELS[r.role]} (${r.games})`}
                      onClick={() => setDetailRole(r.role)}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat
                  label="WR"
                  value={pct(displayStat.wr)}
                  hint={`${displayStat.wins}W ${displayStat.losses}L`}
                />
                <Stat label="KDA" value={displayStat.kda.toFixed(2)} />
                <Stat
                  label="CS/min"
                  value={displayStat.csPerMin.toFixed(1)}
                />
                <Stat
                  label="Jogos"
                  value={String(displayStat.games)}
                  hint={
                    selectedInsight && detailRole === "ALL"
                      ? `lift ${signedPct(selectedInsight.lift)}`
                      : undefined
                  }
                />
              </div>

              {selectedOverview.roles.length > 1 && detailRole === "ALL" ? (
                <div>
                  <p className="data-label mb-2">Distribuição por lane</p>
                  <ul className="space-y-2">
                    {selectedOverview.roles.map((r) => {
                      const max = selectedOverview.games || 1;
                      return (
                        <li key={r.role}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-[var(--muted-strong)]">
                              {ROLE_LABELS[r.role]}
                            </span>
                            <span className="tabular text-[var(--muted)]">
                              {pct(r.wr)} · {r.games} jogos · KDA{" "}
                              {r.kda.toFixed(2)}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-inset)]">
                            <div
                              className="h-full rounded-full bg-[var(--alttab)]/70"
                              style={{
                                width: `${Math.min(100, (r.games / max) * 100)}%`,
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <Tabs
                ariaLabel="Detalhe estatístico"
                value={detailTab}
                onChange={setDetailTab}
                size="sm"
                items={[
                  { id: "resumo", label: "Resumo" },
                  { id: "builds", label: "Builds" },
                  { id: "matchups", label: "Matchups" },
                  {
                    id: "partidas",
                    label: "Partidas",
                    badge: champMatches.length || undefined,
                  },
                ]}
              />

              {detailTab === "resumo" ? (
                <div className="space-y-3 text-sm text-[var(--muted)]">
                  <p>
                    Amostra: <strong className="text-[var(--foreground)]">{displayStat.games}</strong>{" "}
                    partidas
                    {detailRole !== "ALL"
                      ? ` em ${ROLE_LABELS[detailRole]}`
                      : ""}
                    .
                  </p>
                  {selectedInsight ? (
                    <p>
                      Dano médio (todas as lanes do champ):{" "}
                      <span className="tabular text-[var(--foreground)]">
                        {Math.round(selectedInsight.avgDamage).toLocaleString(
                          "pt-BR",
                        )}
                      </span>
                    </p>
                  ) : null}
                  <p className="text-xs">
                    Builds e matchups abaixo usam o agregado do campeão
                    {detailRole !== "ALL"
                      ? "; matchups filtrados pela lane selecionada."
                      : "."}
                  </p>
                </div>
              ) : null}

              {detailTab === "builds" ? (
                selectedInsight ? (
                  <div className="space-y-4">
                    <BuildLeaderboard
                      builds={selectedInsight.topBuilds.slice(0, 3)}
                      championName={selectedInsight.championName}
                      ddragonVersion={ddragonVersion}
                      large
                    />
                    <RuneLeaderboard
                      runes={(selectedInsight.topRunes ?? []).slice(0, 2)}
                      championName={selectedInsight.championName}
                      runeCatalog={runeCatalog}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">
                    Sem builds agregadas ainda (precisa de mais jogos).
                  </p>
                )
              ) : null}

              {detailTab === "matchups" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <MatchupTable
                    title="Melhores vs"
                    matchups={filteredMatchups.best}
                    ddragonVersion={ddragonVersion}
                    idToKey={idToKey}
                    emptyText="Poucos confrontos repetidos nesta lane."
                  />
                  <MatchupTable
                    title="Piores vs"
                    matchups={filteredMatchups.worst}
                    ddragonVersion={ddragonVersion}
                    idToKey={idToKey}
                    emptyText="Sem matchups fracos repetidos nesta lane."
                  />
                </div>
              ) : null}

              {detailTab === "partidas" ? (
                champMatches.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    Nenhuma partida recente com este filtro.
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {champMatches.map((m) => {
                      const when = new Date(m.gameCreation).toLocaleString(
                        "pt-BR",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      );
                      return (
                        <li
                          key={m.matchId}
                          className="flex flex-wrap items-center gap-3 py-2.5 text-sm"
                        >
                          <span
                            className={`text-xs font-semibold ${
                              m.win
                                ? "text-[var(--success)]"
                                : "text-[var(--danger)]"
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
                            {when}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : null}
            </>
          )}
        </Panel>
      </div>

      <p className="text-sm text-[var(--muted)]">
        Quer comparar com outros players? Use{" "}
        <Link href="/referencias" className="text-[var(--alttab)] hover:underline">
          Referências
        </Link>{" "}
        ou a aba Comparar no Preparar — dados externos ficam separados.
      </p>
    </div>
  );
}

function RoleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-8 rounded-[var(--radius)] px-2.5 text-xs font-medium transition ${
        active
          ? "bg-[var(--alttab)] text-white"
          : "bg-[var(--surface)] text-[var(--muted-strong)] ring-1 ring-[var(--border)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
    </button>
  );
}

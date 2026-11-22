"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ChampionInsight } from "@/lib/stats/aggregate";
import type { MatchHistoryRow } from "@/lib/db/persist";
import type { RuneCatalog } from "@/lib/ddragon";
import type { LeagueEntryDto } from "@/lib/riot/types";
import type { MatchLpInsights } from "@/lib/stats/matchLpLedger";
import { pct, signedPct } from "@/lib/format";
import { ROLE_LABELS, type RoleKey } from "@/lib/stats/roles";
import { ChampionDetailPanel } from "./ChampionDetailPanel";
import { ChampionIcon } from "./ChampionIcon";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { Button, Panel } from "@/components/ui";

const PAGE_SIZE = 12;

const ROLE_FILTERS: { id: RoleKey | "ALL"; label: string }[] = [
  { id: "ALL", label: "Todas" },
  { id: "TOP", label: "Top" },
  { id: "JUNGLE", label: "JG" },
  { id: "MIDDLE", label: "Mid" },
  { id: "BOTTOM", label: "ADC" },
  { id: "UTILITY", label: "Sup" },
];

type Props = {
  champions: ChampionInsight[];
  matchHistory: MatchHistoryRow[];
  ddragonVersion: string;
  idToKey: Record<number, string>;
  runeCatalog: RuneCatalog;
  platform: string;
  ranked: LeagueEntryDto[];
  lpInsights?: MatchLpInsights | null;
  alertCount?: number;
  initialChampionId?: number | null;
  /** Sem título/subnav — usado dentro de /analise. */
  embedded?: boolean;
};

export function RankingExplorer({
  champions,
  matchHistory,
  ddragonVersion,
  idToKey,
  runeCatalog,
  platform,
  ranked,
  lpInsights = null,
  alertCount = 0,
  initialChampionId = null,
  embedded = false,
}: Props) {
  const searchParams = useSearchParams();
  const champFromUrl = Number(searchParams.get("champ"));
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleKey | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(
    (Number.isFinite(champFromUrl) ? champFromUrl : null) ??
      initialChampionId ??
      champions[0]?.championId ??
      null,
  );

  useEffect(() => {
    if (Number.isFinite(champFromUrl) && champFromUrl > 0) {
      setSelectedId(champFromUrl);
      const idx = champions.findIndex((c) => c.championId === champFromUrl);
      if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE));
    }
  }, [champFromUrl, champions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return champions.filter((c) => {
      if (role !== "ALL") {
        const champRole =
          c.topRunes?.[0]?.role ?? c.matchups?.[0]?.role ?? null;
        if (champRole && champRole !== role) return false;
        if (!champRole) return false;
      }
      if (!q) return true;
      return c.championName.toLowerCase().includes(q);
    });
  }, [champions, query, role]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const selected =
    champions.find((c) => c.championId === selectedId) ??
    filtered[0] ??
    null;

  const lpRow = selected
    ? lpInsights?.byChampion.find((r) => r.label === selected.championName)
    : null;

  function selectChampion(id: number) {
    setSelectedId(id);
  }

  return (
    <div className={`space-y-3 ${embedded ? "" : "pb-8"}`}>
      {embedded ? null : (
        <div>
          <p className="data-label">Análise</p>
          <h1 className="mt-0.5 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
            Ranking
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {filtered.length} campeões · clique para ver estatísticas ao lado.
          </p>
        </div>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <Panel className="min-w-0 space-y-3 self-start p-3 sm:p-4 lg:sticky lg:top-2">
          <div className="flex flex-col gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar campeão…"
              className="min-h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
            />
            <div className="flex flex-wrap gap-1">
              {ROLE_FILTERS.map((f) => {
                const active = role === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setRole(f.id);
                      setPage(0);
                    }}
                    className={`min-h-8 rounded-[var(--radius)] px-2.5 text-xs font-medium ${
                      active
                        ? "bg-[var(--alttab)] text-white"
                        : "bg-[var(--surface-2)] text-[var(--muted-strong)] ring-1 ring-[var(--border)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {slice.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              Nenhum campeão neste filtro.
            </p>
          ) : (
            <ul className="max-h-[min(65vh,32rem)] divide-y divide-[var(--border)] overflow-y-auto overscroll-contain">
              {slice.map((c, index) => {
                const rank = safePage * PAGE_SIZE + index + 1;
                const active = selected?.championId === c.championId;
                const topRole = (c.topRunes?.[0]?.role ??
                  c.matchups?.[0]?.role) as RoleKey | undefined;
                return (
                  <li key={c.championId}>
                    <button
                      type="button"
                      onClick={() => selectChampion(c.championId)}
                      className={`flex min-h-12 w-full items-center gap-2.5 px-1 py-2 text-left transition sm:gap-3 ${
                        active
                          ? "bg-[var(--alttab)]/12"
                          : "hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <span className="w-5 text-center text-xs font-semibold text-[var(--muted)]">
                        {rank}
                      </span>
                      <ChampionIcon
                        ddragonVersion={ddragonVersion}
                        championId={c.championId}
                        nameOrKey={c.championName}
                        idToKey={idToKey}
                        alt={c.championName}
                        width={32}
                        height={32}
                        className="rounded-md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p
                            className={`truncate text-sm font-semibold ${
                              active
                                ? "text-[var(--alttab)]"
                                : "text-[var(--foreground)]"
                            }`}
                          >
                            {c.championName}
                          </p>
                          <ConfidenceBadge level={c.confidence} />
                        </div>
                        <p className="truncate text-[11px] text-[var(--muted)]">
                          <span className="tabular text-[var(--muted-strong)]">
                            {pct(c.wr)}
                          </span>{" "}
                          · {c.games}j · {signedPct(c.lift)}
                          {topRole
                            ? ` · ${ROLE_LABELS[topRole] ?? topRole}`
                            : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {pageCount > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
              <p className="text-xs text-[var(--muted)]">
                {safePage + 1}/{pageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Ant.
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage >= pageCount - 1}
                  onClick={() =>
                    setPage((p) => Math.min(pageCount - 1, p + 1))
                  }
                >
                  Próx.
                </Button>
              </div>
            </div>
          ) : null}
        </Panel>

        <div className="min-w-0">
          {selected ? (
            <ChampionDetailPanel
              champion={selected}
              champions={champions}
              onSelect={selectChampion}
              matchHistory={matchHistory}
              ddragonVersion={ddragonVersion}
              idToKey={idToKey}
              runeCatalog={runeCatalog}
              platform={platform}
              ranked={ranked}
              lpAvg={lpRow?.lpAvg ?? null}
              lpGames={lpRow?.games ?? null}
              hidePicker
            />
          ) : (
            <Panel className="p-4">
              <p className="text-sm text-[var(--muted)]">
                Selecione um campeão na lista para ver suas estatísticas.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

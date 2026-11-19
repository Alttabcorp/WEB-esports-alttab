"use client";

import Image from "next/image";
import type { ChampionInsight } from "@/lib/stats/aggregate";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { pct, signedPct } from "@/lib/format";
import { championIconUrl } from "@/lib/ddragon";

type Props = {
  champions: ChampionInsight[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  ddragonVersion: string;
  idToKey: Record<number, string>;
};

export function ChampionRecommendations({
  champions,
  selectedId,
  onSelect,
  ddragonVersion,
  idToKey,
}: Props) {
  if (champions.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Amostra insuficiente para recomendar (mínimo 5 partidas por campeão).
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {champions.map((c, index) => {
        const key = idToKey[c.championId] ?? c.championName;
        const active = selectedId === c.championId;
        return (
          <li key={c.championId}>
            <button
              type="button"
              onClick={() => onSelect(c.championId)}
              className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition sm:gap-4 sm:px-4 ${
                active
                  ? "border-[var(--alttab)] bg-[var(--alttab)]/15"
                  : "border-[var(--border)] bg-black/20 hover:border-white/20"
              }`}
            >
              <span className="w-5 text-sm font-semibold text-[var(--muted)]">
                {index + 1}
              </span>
              <Image
                src={championIconUrl(ddragonVersion, key)}
                alt={c.championName}
                width={40}
                height={40}
                className="rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{c.championName}</p>
                  <ConfidenceBadge level={c.confidence} />
                </div>
                <p className="text-sm text-[var(--muted)]">
                  <span className="tabular text-[var(--muted-strong)]">
                    {pct(c.wr)}
                  </span>{" "}
                  WR · {c.games} jogos
                  <span className="hidden sm:inline">
                    {" "}
                    · lift {signedPct(c.lift)}
                  </span>
                </p>
              </div>
              <div className="hidden text-right text-sm text-[var(--muted-strong)] sm:block">
                <p className="tabular">KDA {c.kda.toFixed(2)}</p>
                <p className="text-[var(--muted)]">
                  {Math.round(c.csPerMin)} CS/min
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

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
      <p className="text-sm text-zinc-400">
        Amostra insuficiente para recomendar campeões (mínimo 5 partidas por
        campeão).
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {champions.map((c, index) => {
        const key = idToKey[c.championId] ?? c.championName;
        const active = selectedId === c.championId;
        return (
          <li key={c.championId}>
            <button
              type="button"
              onClick={() => onSelect(c.championId)}
              className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition ${
                active
                  ? "border-[#0596aa] bg-[#0596aa]/15"
                  : "border-white/10 bg-white/5 hover:border-white/25"
              }`}
            >
              <span className="w-6 text-sm font-semibold text-zinc-400">
                #{index + 1}
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
                <p className="text-sm text-zinc-400">
                  {pct(c.wr)} WR · {c.games} jogos · Wilson {pct(c.wilsonLower)} ·
                  Lift {signedPct(c.lift)}
                </p>
              </div>
              <div className="text-right text-sm text-zinc-300">
                <p>KDA {c.kda.toFixed(2)}</p>
                <p className="text-zinc-500">{Math.round(c.csPerMin)} CS/min</p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

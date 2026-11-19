"use client";

import Image from "next/image";
import type { PoolPick } from "@/lib/stats/contextualPool";
import { championIconUrl } from "@/lib/ddragon";
import { pct } from "@/lib/format";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { Panel } from "@/components/ui";

type Props = {
  picks: PoolPick[];
  ddragonVersion: string;
  idToKey: Record<number, string>;
  onSelect?: (championId: number) => void;
  selectedId?: number | null;
};

export function TodayPoolPanel({
  picks,
  ddragonVersion,
  idToKey,
  onSelect,
  selectedId,
}: Props) {
  if (picks.length === 0) {
    return (
      <Panel className="p-4">
        <p className="data-label">Pool de hoje</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Amostra insuficiente para montar o pool do momento.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-4">
      <div className="mb-3">
        <p className="data-label">Pool de hoje</p>
        <h3 className="text-lg font-semibold text-white">O que jogar agora</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Filtrado por horário, forma recente e lista de evitar.
        </p>
      </div>
      <ul className="space-y-2">
        {picks.map((p, index) => {
          const key = idToKey[p.championId] ?? p.championName;
          const active = selectedId === p.championId;
          return (
            <li key={p.championId}>
              <button
                type="button"
                onClick={() => onSelect?.(p.championId)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
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
                  alt={p.championName}
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{p.championName}</p>
                    <ConfidenceBadge level={p.confidence} />
                  </div>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {p.reasons[0]}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="tabular text-[var(--muted-strong)]">
                    {pct(p.wr)}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">{p.games}x</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

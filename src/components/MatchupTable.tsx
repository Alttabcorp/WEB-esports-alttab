import Image from "next/image";
import type { MatchupInsight } from "@/lib/stats/aggregate";
import { ROLE_LABELS } from "@/lib/stats/roles";
import { pct } from "@/lib/format";
import { championIconUrl } from "@/lib/ddragon";
import { ConfidenceBadge } from "./ConfidenceBadge";

type Props = {
  title: string;
  matchups: MatchupInsight[];
  ddragonVersion: string;
  idToKey: Record<number, string>;
  emptyText: string;
};

export function MatchupTable({
  title,
  matchups,
  ddragonVersion,
  idToKey,
  emptyText,
}: Props) {
  return (
    <section>
      <h3 className="mb-3 font-[family-name:var(--font-display)] text-lg text-white">
        {title}
      </h3>
      {matchups.length === 0 ? (
        <p className="text-sm text-zinc-400">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {matchups.map((m) => {
            const myKey = idToKey[m.myChampionId] ?? String(m.myChampionId);
            const enemyKey =
              idToKey[m.enemyChampionId] ?? m.enemyChampionName;
            return (
              <li
                key={`${m.myChampionId}-${m.enemyChampionId}-${m.role}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <Image
                  src={championIconUrl(ddragonVersion, myKey)}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded"
                />
                <span className="text-zinc-500">vs</span>
                <Image
                  src={championIconUrl(ddragonVersion, enemyKey)}
                  alt={m.enemyChampionName}
                  width={32}
                  height={32}
                  className="rounded"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">
                    vs {m.enemyChampionName}{" "}
                    <span className="text-zinc-500">
                      ({ROLE_LABELS[m.role]})
                    </span>
                  </p>
                  <p className="text-xs text-zinc-400">
                    {pct(m.wr)} · {m.games} jogos · Wilson {pct(m.wilsonLower)}
                  </p>
                </div>
                <ConfidenceBadge level={m.confidence} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

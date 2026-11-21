import type { MatchupInsight } from "@/lib/stats/aggregate";
import { ROLE_LABELS } from "@/lib/stats/roles";
import { pct } from "@/lib/format";
import { ChampionIcon } from "./ChampionIcon";
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
      <h3 className="mb-3 text-lg text-[var(--foreground)]">{title}</h3>
      {matchups.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {matchups.map((m) => (
            <li
              key={`${m.myChampionId}-${m.enemyChampionId}-${m.role}`}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
            >
              <ChampionIcon
                ddragonVersion={ddragonVersion}
                championId={m.myChampionId}
                idToKey={idToKey}
                width={32}
                height={32}
                className="rounded"
              />
              <span className="text-[var(--muted)]">vs</span>
              <ChampionIcon
                ddragonVersion={ddragonVersion}
                championId={m.enemyChampionId}
                nameOrKey={m.enemyChampionName}
                idToKey={idToKey}
                alt={m.enemyChampionName}
                width={32}
                height={32}
                className="rounded"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[var(--foreground)]">
                  vs {m.enemyChampionName}{" "}
                  <span className="text-[var(--muted)]">
                    ({ROLE_LABELS[m.role]})
                  </span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {pct(m.wr)} · {m.games} jogos · Wilson {pct(m.wilsonLower)}
                </p>
              </div>
              <ConfidenceBadge level={m.confidence} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

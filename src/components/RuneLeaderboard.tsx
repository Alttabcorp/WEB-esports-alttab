import type { RuneInsight } from "@/lib/stats/aggregate";
import type { RuneCatalog } from "@/lib/ddragon";
import { pct } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/stats/roles";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { RunePageIcons } from "./RunePageIcons";

type Props = {
  runes: RuneInsight[];
  championName: string;
  runeCatalog: RuneCatalog;
};

export function RuneLeaderboard({
  runes,
  championName,
  runeCatalog,
}: Props) {
  if (runes.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Sem páginas de runas recorrentes para {championName}.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {runes.map((rune) => {
        const keystoneMeta = runeCatalog.byId[rune.keystone];
        return (
          <li
            key={`${rune.role}-${rune.fingerprint}`}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-medium text-[var(--foreground)]">
                  {keystoneMeta?.name ?? `Keystone ${rune.keystone}`}
                </p>
                <RunePageIcons
                  primaryStyle={rune.primaryStyle}
                  subStyle={rune.subStyle}
                  keystone={rune.keystone}
                  primaryPerkIds={rune.primaryPerkIds}
                  subPerkIds={rune.subPerkIds}
                  perkIds={rune.perkIds}
                  runeCatalog={runeCatalog}
                />
              </div>
              <ConfidenceBadge level={rune.confidence} />
            </div>
            <p className="text-sm text-[var(--muted)]">
              {ROLE_LABELS[rune.role]} · {pct(rune.wr)} WR · {rune.games} jogos
              · Wilson {pct(rune.wilsonLower)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

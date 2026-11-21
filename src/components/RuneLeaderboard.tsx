"use client";

import { useMemo } from "react";
import type { RuneInsight } from "@/lib/stats/aggregate";
import type { RuneCatalog } from "@/lib/ddragon";
import { pct } from "@/lib/format";
import { coreRuneFingerprint } from "@/lib/stats/runes";
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
  // Rede de segurança: mesma página visual só uma vez na lista.
  const unique = useMemo(() => {
    const seen = new Set<string>();
    const out: RuneInsight[] = [];
    for (const rune of runes) {
      const key =
        coreRuneFingerprint(rune.fingerprint) ??
        `${rune.primaryStyle}:${rune.keystone}|${rune.subStyle}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(rune);
    }
    return out;
  }, [runes]);

  if (unique.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Sem páginas de runas recorrentes para {championName}.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {unique.map((rune) => {
        const keystoneMeta = runeCatalog.byId[rune.keystone];
        const listKey =
          coreRuneFingerprint(rune.fingerprint) ??
          `${rune.role}-${rune.fingerprint}`;
        return (
          <li
            key={listKey}
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

import Image from "next/image";
import type { DraftRecommendation } from "@/lib/stats/draft";
import {
  itemIconUrl,
  spellIconUrl,
  type RuneCatalog,
  type SpellCatalog,
} from "@/lib/ddragon";
import { pct } from "@/lib/format";
import { RunePageIcons } from "./RunePageIcons";

type Props = {
  rec: DraftRecommendation;
  ddragonVersion: string;
  runeCatalog: RuneCatalog;
  spellCatalog: SpellCatalog;
};

export function DraftContextTips({
  rec,
  ddragonVersion,
  runeCatalog,
  spellCatalog,
}: Props) {
  const hasSynergy = rec.allySynergies.length > 0;
  const hasBuild = Boolean(rec.vsBuild);
  const hasRune = Boolean(rec.vsRune);
  const hasSpells = Boolean(rec.vsSpells);

  if (!hasSynergy && !hasBuild && !hasRune && !hasSpells) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
      {hasSynergy
        ? rec.allySynergies.slice(0, 2).map((s) => (
            <p key={s.allyChampionId} className="text-xs text-[#7dd3de]">
              Sinergia: {pct(s.wr)} WR com {s.allyChampionName} ({s.games} jogos)
            </p>
          ))
        : null}

      {rec.vsBuild ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">
            Build vs {rec.vsBuild.enemyChampionName} ({pct(rec.vsBuild.wr)})
          </span>
          {rec.vsBuild.items.map((itemId) => (
            <Image
              key={`${rec.vsBuild!.fingerprint}-${itemId}`}
              src={itemIconUrl(ddragonVersion, itemId)}
              alt={`Item ${itemId}`}
              width={28}
              height={28}
              className="rounded-md ring-1 ring-white/10"
            />
          ))}
        </div>
      ) : null}

      {rec.vsRune ? (
        <div className="space-y-1">
          <span className="text-xs text-zinc-500">
            Página vs {rec.vsRune.enemyChampionName} ({pct(rec.vsRune.wr)} ·{" "}
            {rec.vsRune.games} jogos)
          </span>
          <RunePageIcons
            primaryStyle={rec.vsRune.primaryStyle}
            subStyle={rec.vsRune.subStyle}
            keystone={rec.vsRune.keystone}
            primaryPerkIds={rec.vsRune.primaryPerkIds}
            subPerkIds={rec.vsRune.subPerkIds}
            perkIds={rec.vsRune.perkIds}
            runeCatalog={runeCatalog}
            size="sm"
            showLabels={false}
          />
        </div>
      ) : null}

      {rec.vsSpells ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">
            Feitiços vs {rec.vsSpells.enemyChampionName} ({pct(rec.vsSpells.wr)})
          </span>
          {rec.vsSpells.spellIds.map((spellId) => {
            const meta = spellCatalog[spellId];
            if (!meta) {
              return (
                <span
                  key={spellId}
                  className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300"
                >
                  {spellId}
                </span>
              );
            }
            return (
              <Image
                key={spellId}
                src={spellIconUrl(ddragonVersion, meta.image)}
                alt={meta.name}
                width={28}
                height={28}
                className="rounded-md ring-1 ring-white/10"
                title={meta.name}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

import type { MatchDto } from "@/lib/riot/types";
import { patchFromGameVersion } from "@/lib/stats/temporal";

/**
 * Filtra partidas por patch — uso opcional (breakdown/UI).
 * Stats gerais do app devem usar a amostra completa, sem este gate.
 */
export function filterMatchesByRecentPatches(
  matches: MatchDto[],
  keepPatches = 1,
): { filtered: MatchDto[]; currentPatch: string | null; kept: string[] } {
  const counts = new Map<string, number>();
  for (const m of matches) {
    const p = patchFromGameVersion(m.info.gameVersion);
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const ordered = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p);
  // Prefer the patch of the most recent match as "current"
  const sortedByTime = [...matches].sort(
    (a, b) => b.info.gameCreation - a.info.gameCreation,
  );
  const currentPatch = sortedByTime[0]
    ? patchFromGameVersion(sortedByTime[0].info.gameVersion)
    : ordered[0] ?? null;

  const kept = currentPatch
    ? [currentPatch, ...ordered.filter((p) => p !== currentPatch)].slice(
        0,
        keepPatches,
      )
    : [];
  const keepSet = new Set(kept);
  const filtered = matches.filter((m) =>
    keepSet.has(patchFromGameVersion(m.info.gameVersion)),
  );
  return { filtered, currentPatch, kept };
}

export function isPrePatchMatch(
  match: MatchDto,
  currentPatch: string | null,
): boolean {
  if (!currentPatch) return false;
  return patchFromGameVersion(match.info.gameVersion) !== currentPatch;
}

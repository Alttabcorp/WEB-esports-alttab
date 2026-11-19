import type { MatchParticipant } from "@/lib/riot/types";

export type ExtractedSpells = {
  summoner1Id: number | null;
  summoner2Id: number | null;
  spellFingerprint: string | null;
  spellIds: number[];
};

export function spellFingerprint(
  a: number | null | undefined,
  b: number | null | undefined,
): string | null {
  const ids = [a, b]
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((x, y) => x - y);
  if (ids.length === 0) return null;
  return ids.join("-");
}

export function extractSpells(
  participant: MatchParticipant,
): ExtractedSpells {
  const summoner1Id =
    participant.summoner1Id && participant.summoner1Id > 0
      ? participant.summoner1Id
      : null;
  const summoner2Id =
    participant.summoner2Id && participant.summoner2Id > 0
      ? participant.summoner2Id
      : null;
  const fp = spellFingerprint(summoner1Id, summoner2Id);
  return {
    summoner1Id,
    summoner2Id,
    spellFingerprint: fp,
    spellIds: fp ? fp.split("-").map(Number) : [],
  };
}

export function parseSpellFingerprint(fp: string | null | undefined): number[] {
  if (!fp) return [];
  return fp
    .split("-")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
}

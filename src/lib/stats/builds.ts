/** Boots item IDs (common across patches; filter for core build fingerprint). */
const BOOTS_IDS = new Set([
  1001, 3005, 3006, 3009, 3010, 3020, 3047, 3111, 3117, 3158, 3004,
]);

/** Consumables / trinkets often in item6 or temporary slots. */
const IGNORE_IDS = new Set([
  0, 2003, 2010, 2031, 2033, 2055, 2138, 2139, 2140, 3340, 3363, 3364,
]);

export function buildFingerprint(
  items: number[],
  options: { ignoreBoots?: boolean } = {},
): string {
  const ignoreBoots = options.ignoreBoots ?? true;
  const filtered = items
    .filter((id) => id > 0)
    .filter((id) => !IGNORE_IDS.has(id))
    .filter((id) => !(ignoreBoots && BOOTS_IDS.has(id)))
    .sort((a, b) => a - b);
  return filtered.join("-") || "empty";
}

export function parseFingerprint(fp: string): number[] {
  if (!fp || fp === "empty") return [];
  return fp.split("-").map(Number).filter(Boolean);
}

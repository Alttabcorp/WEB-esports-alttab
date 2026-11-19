export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Wilson score interval lower bound for a binomial proportion.
 * Used to rank win rates with small samples fairly.
 */
export function wilsonLowerBound(
  wins: number,
  games: number,
  z = 1.96,
): number {
  if (games <= 0) return 0;
  const p = wins / games;
  const z2 = z * z;
  const denominator = 1 + z2 / games;
  const centre = p + z2 / (2 * games);
  const margin =
    z * Math.sqrt((p * (1 - p) + z2 / (4 * games)) / games);
  return Math.max(0, (centre - margin) / denominator);
}

export function winRate(wins: number, games: number): number {
  if (games <= 0) return 0;
  return wins / games;
}

export function confidenceFromSample(games: number): ConfidenceLevel {
  if (games >= 15) return "high";
  if (games >= 5) return "medium";
  return "low";
}

export const MIN_SAMPLE_FOR_RECOMMENDATION = 5;

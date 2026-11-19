/** Máximo de partidas que o coach sincroniza/analisa (Riot pagina de 100 em 100). */
export const MAX_MATCH_HISTORY = 500;

/** Tamanho de página da Match-V5. */
export const RIOT_MATCH_PAGE_SIZE = 100;

export const MATCH_COUNT_OPTIONS = [50, 100, 200, 300, 500] as const;

export function clampMatchCount(count: number | undefined, fallback = 100): number {
  const n = Number.isFinite(count) ? Number(count) : fallback;
  return Math.min(Math.max(n, 1), MAX_MATCH_HISTORY);
}

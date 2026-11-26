/**
 * Teto do sync *inicial* (bootstrap) via Riot — Match-V5 pagina de 100 em 100.
 * Depois disso o banco acumula; syncs seguintes só puxam partidas recentes.
 */
export const MAX_MATCH_HISTORY = 500;

/** Máximo usado numa análise a partir do Postgres (histórico acumulado). */
export const MAX_ANALYSIS_MATCHES = 2000;

/** Quantas partidas recentes puxar da Riot quando o banco já passou do bootstrap. */
export const RECENT_SYNC_COUNT = 100;

/** Tamanho de página da Match-V5. */
export const RIOT_MATCH_PAGE_SIZE = 100;

export const MATCH_COUNT_OPTIONS = [50, 100, 200, 300, 500] as const;

export function clampMatchCount(count: number | undefined, fallback = 100): number {
  const n = Number.isFinite(count) ? Number(count) : fallback;
  return Math.min(Math.max(n, 1), MAX_MATCH_HISTORY);
}

export function clampAnalysisMatchCount(
  count: number | undefined,
  fallback = MAX_ANALYSIS_MATCHES,
): number {
  const n = Number.isFinite(count) ? Number(count) : fallback;
  return Math.min(Math.max(n, 1), MAX_ANALYSIS_MATCHES);
}

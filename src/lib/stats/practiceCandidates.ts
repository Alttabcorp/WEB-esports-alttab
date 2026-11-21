import type { AggregateResult, ChampionInsight } from "./aggregate";
import type { PoolPick } from "./contextualPool";
import { expectedLpForChampion } from "./matchLpLedger";
import {
  DEFAULT_AVG_LP_PER_LOSS,
  DEFAULT_AVG_LP_PER_WIN,
} from "./dayGoal";

export type PracticeCandidate = {
  championId: number;
  championName: string;
  games: number;
  wr: number;
  /** Motivo curto para a UI. */
  reason: string;
  priority: number;
};

/**
 * Campeões que valem masterizar em normais / outros modos
 * antes (ou no lugar) de grindar ranked.
 */
export function buildPracticeCandidates(input: {
  analysis: AggregateResult;
  pool?: PoolPick[];
  avgLpPerWin?: number;
  avgLpPerLoss?: number;
  limit?: number;
}): PracticeCandidate[] {
  const {
    analysis,
    pool = [],
    avgLpPerWin = DEFAULT_AVG_LP_PER_WIN,
    avgLpPerLoss = DEFAULT_AVG_LP_PER_LOSS,
    limit = 4,
  } = input;

  const poolIds = new Set(pool.map((p) => p.championId));
  const topIds = new Set(
    analysis.topRecommendations.slice(0, 8).map((c) => c.championId),
  );

  const scored: PracticeCandidate[] = [];

  for (const champ of analysis.champions) {
    if (champ.games < 3) continue;

    const expectedLp = expectedLpForChampion({
      wr: champ.wr,
      avgLpPerWin,
      avgLpPerLoss,
    });
    const inPool = poolIds.has(champ.championId);
    const inTop = topIds.has(champ.championId);
    const stillLearning = champ.games < 25;
    const solidSample = champ.games >= 8;
    const promising = champ.wr >= 0.5 || champ.lift >= 0.02;
    const committedButSoft =
      champ.games >= 12 && champ.wr >= 0.42 && champ.wr < 0.55;

    let reason: string | null = null;
    let priority = 0;

    if (inPool && stillLearning && expectedLp >= 0) {
      reason =
        "Pick do pool — treinar em normais antes de forçar no ranked";
      priority = 40 + expectedLp + champ.wr * 10;
    } else if (inTop && stillLearning && promising) {
      reason =
        "Bom potencial com amostra ainda pequena — masterizar em normais";
      priority = 32 + champ.lift * 20 + (25 - champ.games);
    } else if (committedButSoft && (inTop || expectedLp >= -1)) {
      reason =
        "Muitos jogos e ainda inconsistente — solidificar em normais";
      priority = 28 + champ.games / 10;
    } else if (solidSample && champ.lift >= 0.05 && stillLearning) {
      reason = "Lift positivo — aprofundar mecânica em outros modos";
      priority = 24 + champ.lift * 30;
    }

    if (!reason) continue;

    scored.push({
      championId: champ.championId,
      championName: champ.championName,
      games: champ.games,
      wr: champ.wr,
      reason,
      priority,
    });
  }

  // Pool picks com pouquíssimos jogos (ainda não no aggregate forte)
  for (const p of pool) {
    if (scored.some((s) => s.championId === p.championId)) continue;
    if (p.games >= 3 && p.games < 20 && p.expectedLp >= 0) {
      scored.push({
        championId: p.championId,
        championName: p.championName,
        games: p.games,
        wr: p.wr,
        reason: "Sugestão do momento — testar em normais antes do ranked",
        priority: 35 + p.expectedLp,
      });
    }
  }

  return scored.sort((a, b) => b.priority - a.priority).slice(0, limit);
}

export function practiceDecisionHint(
  candidates: PracticeCandidate[],
): { title: string; detail: string } | null {
  if (!candidates.length) return null;
  const names = candidates
    .slice(0, 3)
    .map((c) => c.championName)
    .join(", ");
  return {
    title: "Testar em normais",
    detail: `Masterizar ${names} em normais / outros modos — não só ranked.`,
  };
}

/** Texto curto para anexar em decisões stop/warn. */
export function practiceDecisionDetail(
  candidates: PracticeCandidate[],
): string | null {
  const hint = practiceDecisionHint(candidates);
  return hint ? hint.detail : null;
}

export function isPracticeCandidate(
  champion: ChampionInsight,
  candidates: PracticeCandidate[],
): boolean {
  return candidates.some((c) => c.championId === champion.championId);
}

import type {
  AggregateResult,
  AllySynergyInsight,
  ChampionInsight,
  MatchupBuildInsight,
  MatchupInsight,
  MatchupRuneInsight,
  MatchupSpellInsight,
  RuneInsight,
} from "./aggregate";
import { type RoleKey } from "./roles";
import {
  MIN_SAMPLE_FOR_RECOMMENDATION,
  type ConfidenceLevel,
  confidenceFromSample,
} from "./wilson";
import { contextualDraftBoost } from "./contextualPool";

export type DraftBoard = {
  role: RoleKey;
  enemyChampionIds: number[];
  allyChampionIds?: number[];
  bannedChampionIds?: number[];
};

export type DraftRecommendation = {
  championId: number;
  championName: string;
  score: number;
  confidence: ConfidenceLevel;
  gamesInRole: number;
  wrInRole: number;
  reasons: string[];
  topRune: RuneInsight | null;
  topBuildFingerprint: string | null;
  laneEnemyId: number | null;
  laneMatchup: MatchupInsight | null;
  /** Sinergias com aliados já pickados no board */
  allySynergies: AllySynergyInsight[];
  /** Build que você mais vence nesse matchup de lane */
  vsBuild: MatchupBuildInsight | null;
  /** Runa que você mais vence nesse matchup */
  vsRune: MatchupRuneInsight | null;
  /** Feitiços que você mais vence nesse matchup */
  vsSpells: MatchupSpellInsight | null;
};

export type DraftRecommendResult = {
  role: RoleKey;
  recommendations: DraftRecommendation[];
};

const WEIGHT_LANE_MATCHUP = 0.4;
const WEIGHT_ALLY_SYNERGY = 0.3;
const WEIGHT_ROLE_WILSON = 0.2;
const WEIGHT_OTHER_ENEMIES = 0.1;

/** Amostra mínima para citar sinergia/contexto de matchup nas razões. */
export const MIN_CONTEXT_SAMPLE = 3;

function pctLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function gamesInRole(champion: ChampionInsight, role: RoleKey): number {
  return champion.matchups
    .filter((m) => m.role === role)
    .reduce((sum, m) => sum + m.games, 0);
}

function roleProxyStat(
  champion: ChampionInsight,
  role: RoleKey,
): { games: number; wins: number; wr: number; wilsonLower: number } | null {
  const inRole = champion.matchups.filter((m) => m.role === role);
  if (inRole.length === 0) return null;
  const games = inRole.reduce((s, m) => s + m.games, 0);
  const wins = inRole.reduce((s, m) => s + m.wins, 0);
  const wr = games ? wins / games : 0;
  const wilsonLower =
    inRole.reduce((s, m) => s + m.wilsonLower * m.games, 0) / Math.max(games, 1);
  return { games, wins, wr, wilsonLower };
}

function findLaneEnemy(
  enemyChampionIds: number[],
  role: RoleKey,
  champion: ChampionInsight,
): { enemyId: number; matchup: MatchupInsight | null } | null {
  if (enemyChampionIds.length === 0) return null;

  for (const enemyId of enemyChampionIds) {
    const matchup =
      champion.matchups.find(
        (m) => m.role === role && m.enemyChampionId === enemyId,
      ) ?? null;
    if (matchup) return { enemyId, matchup };
  }
  return { enemyId: enemyChampionIds[0], matchup: null };
}

function otherEnemyBonus(
  champion: ChampionInsight,
  role: RoleKey,
  enemyChampionIds: number[],
  laneEnemyId: number | null,
): { score: number; reason: string | null } {
  const others = enemyChampionIds.filter((id) => id !== laneEnemyId);
  if (others.length === 0) return { score: 0, reason: null };

  let weighted = 0;
  let weight = 0;
  const snippets: string[] = [];

  for (const enemyId of others) {
    const m = champion.matchups.find(
      (x) => x.role === role && x.enemyChampionId === enemyId,
    );
    if (!m || m.games < 2) continue;
    weighted += m.wilsonLower * m.games;
    weight += m.games;
    snippets.push(
      `${pctLabel(m.wr)} WR vs ${m.enemyChampionName} (${m.games})`,
    );
  }

  if (weight === 0) return { score: 0, reason: null };
  return {
    score: weighted / weight,
    reason: snippets.slice(0, 2).join(" · "),
  };
}

function allySynergyBonus(
  champion: ChampionInsight,
  allyChampionIds: number[],
): { score: number; synergies: AllySynergyInsight[]; reasons: string[] } {
  if (allyChampionIds.length === 0) {
    return { score: 0, synergies: [], reasons: [] };
  }

  const synergies: AllySynergyInsight[] = [];
  const reasons: string[] = [];
  let weighted = 0;
  let weight = 0;

  for (const allyId of allyChampionIds) {
    const syn = (champion.allySynergies ?? []).find(
      (s) => s.allyChampionId === allyId,
    );
    if (!syn || syn.games < MIN_CONTEXT_SAMPLE) continue;
    synergies.push(syn);
    weighted += syn.wilsonLower * syn.games;
    weight += syn.games;
    reasons.push(
      `${pctLabel(syn.wr)} WR com ${syn.allyChampionName} no time (${syn.games} jogos)`,
    );
  }

  if (weight === 0) return { score: 0, synergies: [], reasons: [] };
  return { score: weighted / weight, synergies, reasons };
}

function bestVsBuild(
  champion: ChampionInsight,
  role: RoleKey,
  enemyId: number | null,
): MatchupBuildInsight | null {
  if (enemyId == null) return null;
  return (
    (champion.matchupBuilds ?? [])
      .filter(
        (b) =>
          b.enemyChampionId === enemyId &&
          b.role === role &&
          b.games >= MIN_CONTEXT_SAMPLE,
      )
      .sort((a, b) => b.wilsonLower - a.wilsonLower)[0] ?? null
  );
}

function bestVsRune(
  champion: ChampionInsight,
  role: RoleKey,
  enemyId: number | null,
): MatchupRuneInsight | null {
  if (enemyId == null) return null;
  return (
    (champion.matchupRunes ?? [])
      .filter(
        (b) =>
          b.enemyChampionId === enemyId &&
          b.role === role &&
          b.games >= MIN_CONTEXT_SAMPLE,
      )
      .sort((a, b) => b.wilsonLower - a.wilsonLower)[0] ?? null
  );
}

function bestVsSpells(
  champion: ChampionInsight,
  role: RoleKey,
  enemyId: number | null,
): MatchupSpellInsight | null {
  if (enemyId == null) return null;
  return (
    (champion.matchupSpells ?? [])
      .filter(
        (b) =>
          b.enemyChampionId === enemyId &&
          b.role === role &&
          b.games >= MIN_CONTEXT_SAMPLE,
      )
      .sort((a, b) => b.wilsonLower - a.wilsonLower)[0] ?? null
  );
}

/**
 * Rank champions the player already plays for the given draft board.
 * Uses lane matchup + ally synergy + contextual build/rune/spell tips.
 */
export function recommendDraftPicks(
  analysis: AggregateResult,
  board: DraftBoard,
  options: { limit?: number; minGames?: number } = {},
): DraftRecommendResult {
  const limit = options.limit ?? 5;
  const minGames = options.minGames ?? MIN_SAMPLE_FOR_RECOMMENDATION;
  const role = board.role;
  const enemies = board.enemyChampionIds;
  const allies = board.allyChampionIds ?? [];
  /** Já no board: bans + picks inimigos + picks aliados — não sugerir de novo. */
  const unavailable = new Set<number>(
    [...(board.bannedChampionIds ?? []), ...enemies, ...allies].filter(
      (id) => id > 0,
    ),
  );

  if (role === "UNKNOWN") {
    return { role, recommendations: [] };
  }

  const recommendations: DraftRecommendation[] = [];

  for (const champion of analysis.champions) {
    if (unavailable.has(champion.championId)) continue;

    const roleStat = roleProxyStat(champion, role);
    const effectiveGames = roleStat?.games ?? 0;
    if (effectiveGames < minGames && champion.games < minGames) continue;
    if (
      effectiveGames === 0 &&
      !champion.matchups.some((m) => m.role === role)
    ) {
      continue;
    }

    const lane = findLaneEnemy(enemies, role, champion);
    const laneMatchup = lane?.matchup ?? null;
    const laneEnemyId = lane?.enemyId ?? null;

    const roleWilson = roleStat?.wilsonLower ?? champion.wilsonLower;
    const roleWr = roleStat?.wr ?? champion.wr;
    const roleGamesFinal = roleStat?.games ?? champion.games;

    let laneScore = roleWilson;
    const reasons: string[] = [];

    if (laneMatchup && laneMatchup.games >= 2) {
      laneScore = laneMatchup.wilsonLower;
      const lpEv = Math.round(laneMatchup.lift * 18 * 10) / 10;
      reasons.push(
        `${pctLabel(laneMatchup.wr)} WR vs ${laneMatchup.enemyChampionName} em ${laneMatchup.games} jogos` +
          (Math.abs(lpEv) >= 0.5
            ? ` (~${lpEv > 0 ? "+" : ""}${lpEv} PDL EV vs média)`
            : ""),
      );
    } else if (laneEnemyId != null) {
      reasons.push(
        `Poucos jogos vs inimigo de lane — usando WR na role (${pctLabel(roleWr)}, ${roleGamesFinal} jogos)`,
      );
    } else {
      reasons.push(
        `${pctLabel(roleWr)} WR na role · ${roleGamesFinal} jogos (Wilson ${pctLabel(roleWilson)})`,
      );
    }

    const ally = allySynergyBonus(champion, allies);
    reasons.push(...ally.reasons);

    const other = otherEnemyBonus(champion, role, enemies, laneEnemyId);
    if (other.reason) reasons.push(other.reason);

    const vsBuild = bestVsBuild(champion, role, laneEnemyId);
    const vsRune = bestVsRune(champion, role, laneEnemyId);
    const vsSpells = bestVsSpells(champion, role, laneEnemyId);

    if (vsBuild) {
      reasons.push(
        `Build vs ${vsBuild.enemyChampionName}: ${pctLabel(vsBuild.wr)} em ${vsBuild.games} jogos`,
      );
    }
    if (vsRune) {
      reasons.push(
        `Runa vs ${vsRune.enemyChampionName}: ${pctLabel(vsRune.wr)} em ${vsRune.games} jogos`,
      );
    }
    if (vsSpells) {
      reasons.push(
        `Feitiços vs ${vsSpells.enemyChampionName}: ${pctLabel(vsSpells.wr)} em ${vsSpells.games} jogos`,
      );
    }

    const topRunes = champion.topRunes ?? [];
    const topRune =
      vsRune
        ? ({
            ...vsRune,
            championId: champion.championId,
          } as RuneInsight)
        : (topRunes.find((r) => r.role === role) ?? topRunes[0] ?? null);

    const ctx = contextualDraftBoost(champion, analysis.temporal);
    if (ctx.reason) reasons.push(ctx.reason);

    const hasAllySignal = ally.synergies.length > 0;
    const score =
      laneScore * WEIGHT_LANE_MATCHUP +
      (hasAllySignal ? ally.score : roleWilson) * WEIGHT_ALLY_SYNERGY +
      roleWilson * WEIGHT_ROLE_WILSON +
      other.score * WEIGHT_OTHER_ENEMIES +
      Math.max(0, champion.lift) * 0.05 +
      (vsBuild ? Math.max(0, vsBuild.lift) * 0.03 : 0) +
      ctx.boost;

    const sampleForConfidence = Math.max(
      laneMatchup?.games ?? 0,
      ally.synergies[0]?.games ?? 0,
      roleGamesFinal,
    );

    recommendations.push({
      championId: champion.championId,
      championName: champion.championName,
      score,
      confidence: confidenceFromSample(sampleForConfidence),
      gamesInRole: roleGamesFinal,
      wrInRole: roleWr,
      reasons,
      topRune,
      topBuildFingerprint:
        vsBuild?.fingerprint ?? champion.topBuilds[0]?.fingerprint ?? null,
      laneEnemyId,
      laneMatchup,
      allySynergies: ally.synergies,
      vsBuild,
      vsRune,
      vsSpells,
    });
  }

  recommendations.sort((a, b) => b.score - a.score);

  return {
    role,
    recommendations: recommendations.slice(0, limit),
  };
}

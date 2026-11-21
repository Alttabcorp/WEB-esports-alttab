import type { AggregateResult, ChampionInsight } from "./aggregate";
import type { TemporalInsights } from "./temporal";
import { ROLE_LABELS, type RoleKey } from "./roles";
import {
  confidenceFromSample,
  type ConfidenceLevel,
} from "./wilson";
import { PLAYER_TIMEZONE } from "./temporal";
import {
  DEFAULT_AVG_LP_PER_LOSS,
  DEFAULT_AVG_LP_PER_WIN,
} from "./dayGoal";
import { expectedLpForChampion } from "./matchLpLedger";

export type PoolPick = {
  championId: number;
  championName: string;
  score: number;
  confidence: ConfidenceLevel;
  wr: number;
  games: number;
  reasons: string[];
  /** Bônus da janela horária / forma. */
  contextBonus: number;
  /** EV estimado de PDL por fila neste contexto. */
  expectedLp: number;
  /** Lane principal estimada deste pick. */
  role: RoleKey;
};

/** Ordem de exibição das lanes no pool. */
export const POOL_LANE_ORDER: RoleKey[] = [
  "TOP",
  "JUNGLE",
  "MIDDLE",
  "BOTTOM",
  "UTILITY",
];

/** Infere a lane mais jogada do campeão (matchups + runas). */
export function inferChampionRole(champ: ChampionInsight): RoleKey {
  const byRole = new Map<RoleKey, number>();
  for (const m of champ.matchups) {
    if (m.role === "UNKNOWN") continue;
    byRole.set(m.role, (byRole.get(m.role) ?? 0) + m.games);
  }
  for (const r of champ.topRunes ?? []) {
    if (r.role === "UNKNOWN") continue;
    byRole.set(r.role, (byRole.get(r.role) ?? 0) + r.games);
  }
  let best: RoleKey = "UNKNOWN";
  let bestGames = 0;
  for (const [role, games] of byRole) {
    if (games > bestGames) {
      best = role;
      bestGames = games;
    }
  }
  return best;
}

function currentHourWindow(now = Date.now(), timeZone = PLAYER_TIMEZONE): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  });
  let hour = Number(
    fmt.formatToParts(new Date(now)).find((p) => p.type === "hour")?.value ?? 0,
  );
  if (hour === 24) hour = 0;
  return Math.floor(hour / 3) * 3;
}

function recentChampWr(
  temporal: TemporalInsights,
  championId: number,
): number | null {
  // Usa champByHour agregado; forma recente global como fallback indireto
  const rows = temporal.champByHour.filter((c) => c.championId === championId);
  if (rows.length === 0) return null;
  const games = rows.reduce((s, r) => s + r.games, 0);
  const wins = rows.reduce((s, r) => s + r.wins, 0);
  return games >= 4 ? wins / games : null;
}

/**
 * Pool do momento: top champs para agora (role + horário + forma + avoid),
 * separados por lane (até `limitPerRole` por role).
 */
export function buildContextualPool(input: {
  analysis: AggregateResult;
  preferredRole?: RoleKey;
  /** @deprecated use limitPerRole — mantido como teto total aproximado */
  limit?: number;
  limitPerRole?: number;
  now?: number;
  enemyChampionId?: number | null;
  avgLpPerWin?: number;
  avgLpPerLoss?: number;
}): PoolPick[] {
  const {
    analysis,
    preferredRole,
    limitPerRole = 3,
    now = Date.now(),
    enemyChampionId = null,
    avgLpPerWin = DEFAULT_AVG_LP_PER_WIN,
    avgLpPerLoss = DEFAULT_AVG_LP_PER_LOSS,
  } = input;
  const temporal = analysis.temporal;
  const hourWindow = currentHourWindow(now);
  const avoidList = temporal?.avoidList ?? [];
  const champByHour = temporal?.champByHour ?? [];
  const roleByHour = temporal?.roleByHour ?? [];
  const avoidChampIds = new Set(
    avoidList
      .filter((a) => a.kind === "champion")
      .map((a) => a.championId),
  );
  const avoidMatchups = new Set(
    avoidList
      .filter((a) => a.kind === "matchup" && a.enemyChampionId != null)
      .map((a) => `${a.championId}:${a.enemyChampionId}`),
  );

  const formLift = temporal?.recentForm?.lift ?? 0;

  const scored: PoolPick[] = [];

  for (const champ of analysis.champions) {
    if (champ.games < 5) continue;
    if (avoidChampIds.has(champ.championId)) continue;

    const reasons: string[] = [];
    let score = champ.wilsonLower + Math.max(0, champ.lift) * 0.25;
    let contextBonus = 0;

    const role = inferChampionRole(champ);

    if (preferredRole && preferredRole !== "UNKNOWN") {
      const roleGames = champ.matchups
        .filter((m) => m.role === preferredRole)
        .reduce((s, m) => s + m.games, 0);
      if (role === preferredRole || roleGames >= 3) {
        score += 0.04;
        if (role === preferredRole) {
          reasons.push(`Sua lane · ${ROLE_LABELS[preferredRole]}`);
        } else {
          reasons.push(`Presença em ${ROLE_LABELS[preferredRole]}`);
        }
      }
    }

    const hourHit = champByHour.find(
      (c) =>
        c.championId === champ.championId && c.hourWindow === hourWindow,
    );
    if (hourHit && hourHit.games >= 3) {
      const bonus = hourHit.lift * 0.35;
      score += bonus;
      contextBonus += bonus;
      if (hourHit.lift >= 0.05) {
        reasons.push(`Forte neste horário (${Math.round(hourHit.wr * 100)}% WR)`);
      } else if (hourHit.lift <= -0.08) {
        score -= 0.08;
        contextBonus -= 0.08;
        reasons.push(`Fraco neste horário — cuidado`);
      }
    }

    const roleHour = preferredRole
      ? roleByHour.find(
          (r) => r.role === preferredRole && r.hourWindow === hourWindow,
        )
      : null;
    if (roleHour && roleHour.lift >= 0.05) {
      score += 0.03;
      contextBonus += 0.03;
    }

    if (formLift >= 0.05 && champ.lift >= 0) {
      score += 0.03;
      contextBonus += 0.03;
      reasons.push("Alinha com forma recente");
    } else if (formLift <= -0.08) {
      // Em forma fria, favorece champs de alta confiança / sample
      if (champ.confidence === "high") {
        score += 0.02;
        reasons.push("Pick estável em forma fria");
      }
    }

    if (enemyChampionId != null) {
      if (avoidMatchups.has(`${champ.championId}:${enemyChampionId}`)) {
        score -= 0.15;
        contextBonus -= 0.15;
        reasons.push("Matchup a evitar no histórico");
      } else {
        const mu = champ.matchups.find(
          (m) =>
            m.enemyChampionId === enemyChampionId &&
            (!preferredRole || preferredRole === "UNKNOWN" || m.role === preferredRole),
        );
        if (mu && mu.games >= 2) {
          score += mu.lift * 0.3;
          contextBonus += mu.lift * 0.3;
          if (mu.lift >= 0.05) {
            reasons.push(`Bom vs ${mu.enemyChampionName}`);
          }
        }
      }
    }

    const recentWr = temporal
      ? recentChampWr(temporal, champ.championId)
      : null;
    if (recentWr != null && recentWr - analysis.overallWr >= 0.05) {
      score += 0.04;
      contextBonus += 0.04;
      reasons.push("Quente no recorte recente");
    }

    const expectedLp = expectedLpForChampion({
      wr: champ.wr,
      avgLpPerWin,
      avgLpPerLoss,
      contextLift: contextBonus,
    });
    // Ranqueia também por EV de LP (mistura com score wilson).
    score += expectedLp / 40;

    if (expectedLp >= 2) {
      reasons.unshift(`~+${expectedLp} PDL esperado nesta fila`);
    } else if (expectedLp <= -2) {
      reasons.unshift(`~${expectedLp} PDL esperado — evitar`);
    }

    if (reasons.length === 0) {
      reasons.push(
        `${Math.round(champ.wr * 100)}% WR · ${champ.games} jogos`,
      );
    }

    scored.push({
      championId: champ.championId,
      championName: champ.championName,
      score,
      confidence: confidenceFromSample(champ.games),
      wr: champ.wr,
      games: champ.games,
      reasons: reasons.slice(0, 3),
      contextBonus,
      expectedLp,
      role,
    });
  }

  // Top N por lane (UNKNOWN no fim / excluído da grade principal)
  const byRole = new Map<RoleKey, PoolPick[]>();
  for (const pick of scored.sort((a, b) => b.score - a.score)) {
    const list = byRole.get(pick.role) ?? [];
    if (list.length >= limitPerRole) continue;
    list.push(pick);
    byRole.set(pick.role, list);
  }

  const laneOrder = [
    ...(preferredRole && preferredRole !== "UNKNOWN" ? [preferredRole] : []),
    ...POOL_LANE_ORDER.filter((r) => r !== preferredRole),
  ];

  const out: PoolPick[] = [];
  for (const lane of laneOrder) {
    out.push(...(byRole.get(lane) ?? []));
  }
  // Champions sem lane clara só entram se ainda sobrar espaço visual
  const unknown = byRole.get("UNKNOWN") ?? [];
  if (out.length < limitPerRole * 2) {
    out.push(...unknown.slice(0, limitPerRole));
  }
  return out;
}

export function groupPoolByRole(
  picks: PoolPick[],
  preferredRole?: RoleKey | null,
): { role: RoleKey; picks: PoolPick[] }[] {
  const map = new Map<RoleKey, PoolPick[]>();
  for (const p of picks) {
    const role = p.role === "UNKNOWN" ? "UNKNOWN" : p.role;
    const list = map.get(role) ?? [];
    list.push(p);
    map.set(role, list);
  }
  const order = [
    ...(preferredRole && preferredRole !== "UNKNOWN" ? [preferredRole] : []),
    ...POOL_LANE_ORDER.filter((r) => r !== preferredRole),
    "UNKNOWN" as RoleKey,
  ];
  return order
    .filter((r) => (map.get(r)?.length ?? 0) > 0)
    .map((role) => ({ role, picks: map.get(role)! }));
}

/** Ajuste o score de draft com bônus contextual do pool. */
export function contextualDraftBoost(
  champion: ChampionInsight,
  temporal: TemporalInsights | null | undefined,
  now = Date.now(),
): { boost: number; reason: string | null } {
  if (!temporal) return { boost: 0, reason: null };
  const hourWindow = currentHourWindow(now);
  const hit = (temporal.champByHour ?? []).find(
    (c) => c.championId === champion.championId && c.hourWindow === hourWindow,
  );
  if (hit && hit.games >= 3 && hit.lift >= 0.05) {
    const approxLp = Math.round(hit.lift * 18 * 10) / 10;
    return {
      boost: Math.min(0.08, hit.lift * 0.25),
      reason: `Bom neste horário (~+${approxLp} PDL · ${Math.round(hit.wr * 100)}% WR)`,
    };
  }
  if (
    (temporal.avoidList ?? []).some(
      (a) => a.kind === "champion" && a.championId === champion.championId,
    )
  ) {
    return { boost: -0.12, reason: "Na lista de evitar" };
  }
  return { boost: 0, reason: null };
}

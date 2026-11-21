import type { MatchDto } from "@/lib/riot/types";
import { normalizeRole, type RoleKey } from "@/lib/stats/roles";
import { PLAYER_TIMEZONE } from "@/lib/stats/temporal";
import {
  DEFAULT_AVG_LP_PER_LOSS,
  DEFAULT_AVG_LP_PER_WIN,
} from "@/lib/stats/dayGoal";

export type RankSnapLite = {
  ladderScore: number;
  createdAt: Date;
};

export type MatchLpRow = {
  matchId: string;
  createdAt: number;
  win: boolean;
  championId: number;
  championName: string;
  role: RoleKey;
  /** ΔLP atribuído (medido entre snapshots ou estimado). */
  lpDelta: number;
  source: "snapshot" | "estimate";
  hourWindow: number;
  sessionIndex: number;
};

export type LpBucket = {
  key: string;
  label: string;
  games: number;
  wins: number;
  lpTotal: number;
  lpAvg: number;
};

export type MatchLpInsights = {
  rows: MatchLpRow[];
  avgLpPerWin: number;
  avgLpPerLoss: number;
  byChampion: LpBucket[];
  byRole: LpBucket[];
  byHour: LpBucket[];
  bySessionIndex: LpBucket[];
  /** PDL médio nas partidas após ≥2 derrotas seguidas. */
  tiltCostAvg: number | null;
  tiltSample: number;
};

function zonedHour(ms: number): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: PLAYER_TIMEZONE,
    hour: "numeric",
    hour12: false,
  });
  let hour = Number(
    fmt.formatToParts(new Date(ms)).find((p) => p.type === "hour")?.value ?? 0,
  );
  if (hour === 24) hour = 0;
  return hour;
}

function hourLabel(window: number): string {
  return `${String(window).padStart(2, "0")}–${String(window + 3).padStart(2, "0")}h`;
}

/**
 * Atribui ΔLP por partida: entre snapshots consecutivos, reparte o delta
 * ladder pelas partidas da janela (wins/losses). Sem snapshot → estimativa.
 */
export function buildMatchLpLedger(input: {
  matches: MatchDto[];
  puuid: string;
  snapshots: RankSnapLite[];
  avgWin?: number;
  avgLoss?: number;
}): MatchLpInsights {
  const avgWin = input.avgWin ?? DEFAULT_AVG_LP_PER_WIN;
  const avgLoss = input.avgLoss ?? DEFAULT_AVG_LP_PER_LOSS;

  type Game = {
    matchId: string;
    createdAt: number;
    win: boolean;
    championId: number;
    championName: string;
    role: RoleKey;
  };

  const games: Game[] = [];
  for (const match of input.matches) {
    const me = match.info.participants.find((p) => p.puuid === input.puuid);
    if (!me) continue;
    games.push({
      matchId: match.metadata.matchId,
      createdAt: match.info.gameCreation,
      win: me.win,
      championId: me.championId,
      championName: me.championName,
      role: normalizeRole(me.teamPosition, me.individualPosition),
    });
  }
  games.sort((a, b) => a.createdAt - b.createdAt);

  const snaps = [...input.snapshots].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const attributed = new Map<string, { lpDelta: number; source: "snapshot" | "estimate" }>();

  for (let i = 1; i < snaps.length; i++) {
    const prev = snaps[i - 1];
    const cur = snaps[i];
    const delta = cur.ladderScore - prev.ladderScore;
    const t0 = prev.createdAt.getTime();
    const t1 = cur.createdAt.getTime();
    const windowGames = games.filter(
      (g) => g.createdAt > t0 && g.createdAt <= t1,
    );
    if (!windowGames.length) continue;

    // Reparte proporcional a win/loss esperados, depois normaliza para bater o delta.
    const weights = windowGames.map((g) =>
      g.win ? avgWin : -avgLoss,
    );
    const weightSum = weights.reduce((s, w) => s + w, 0);
    if (Math.abs(weightSum) < 0.01) {
      const each = delta / windowGames.length;
      for (const g of windowGames) {
        attributed.set(g.matchId, { lpDelta: each, source: "snapshot" });
      }
    } else {
      const scale = delta / weightSum;
      for (let j = 0; j < windowGames.length; j++) {
        attributed.set(windowGames[j].matchId, {
          lpDelta: Math.round(weights[j] * scale * 10) / 10,
          source: "snapshot",
        });
      }
    }
  }

  // Session index
  const SESSION_GAP = 3 * 60 * 60 * 1000;
  let sessionStart = 0;
  const sessionIndexOf: number[] = [];
  for (let i = 0; i < games.length; i++) {
    if (i > 0 && games[i].createdAt - games[i - 1].createdAt > SESSION_GAP) {
      sessionStart = i;
    }
    sessionIndexOf.push(i - sessionStart + 1);
  }

  const rows: MatchLpRow[] = games.map((g, i) => {
    const att = attributed.get(g.matchId);
    const lpDelta = att
      ? att.lpDelta
      : g.win
        ? avgWin
        : -avgLoss;
    const hour = zonedHour(g.createdAt);
    return {
      matchId: g.matchId,
      createdAt: g.createdAt,
      win: g.win,
      championId: g.championId,
      championName: g.championName,
      role: g.role,
      lpDelta,
      source: att?.source ?? "estimate",
      hourWindow: Math.floor(hour / 3) * 3,
      sessionIndex: sessionIndexOf[i],
    };
  });

  const wins = rows.filter((r) => r.win);
  const losses = rows.filter((r) => !r.win);
  const avgLpPerWin =
    wins.length > 0
      ? wins.reduce((s, r) => s + r.lpDelta, 0) / wins.length
      : avgWin;
  const avgLpPerLoss =
    losses.length > 0
      ? Math.abs(losses.reduce((s, r) => s + r.lpDelta, 0) / losses.length)
      : avgLoss;

  function bucketize(
    keyFn: (r: MatchLpRow) => string,
    labelFn: (key: string, r: MatchLpRow) => string,
  ): LpBucket[] {
    const map = new Map<
      string,
      { label: string; games: number; wins: number; lpTotal: number }
    >();
    for (const r of rows) {
      const key = keyFn(r);
      if (!map.has(key)) {
        map.set(key, { label: labelFn(key, r), games: 0, wins: 0, lpTotal: 0 });
      }
      const b = map.get(key)!;
      b.games += 1;
      if (r.win) b.wins += 1;
      b.lpTotal += r.lpDelta;
    }
    return [...map.entries()]
      .map(([key, b]) => ({
        key,
        label: b.label,
        games: b.games,
        wins: b.wins,
        lpTotal: Math.round(b.lpTotal * 10) / 10,
        lpAvg: Math.round((b.lpTotal / b.games) * 10) / 10,
      }))
      .filter((b) => b.games >= 2)
      .sort((a, b) => b.lpAvg - a.lpAvg);
  }

  // Tilt cost: games after ≥2 losses in a row
  let lossRun = 0;
  const tiltRows: MatchLpRow[] = [];
  for (const r of rows) {
    if (lossRun >= 2) tiltRows.push(r);
    if (r.win) lossRun = 0;
    else lossRun += 1;
  }
  const tiltSample = tiltRows.length;
  const tiltCostAvg =
    tiltSample >= 3
      ? Math.round(
          (tiltRows.reduce((s, r) => s + r.lpDelta, 0) / tiltSample) * 10,
        ) / 10
      : null;

  return {
    rows,
    avgLpPerWin: Math.round(avgLpPerWin * 10) / 10,
    avgLpPerLoss: Math.round(avgLpPerLoss * 10) / 10,
    byChampion: bucketize(
      (r) => String(r.championId),
      (_k, r) => r.championName,
    ).slice(0, 12),
    byRole: bucketize(
      (r) => r.role,
      (k) => k,
    ),
    byHour: bucketize(
      (r) => String(r.hourWindow),
      (k) => hourLabel(Number(k)),
    ),
    bySessionIndex: bucketize(
      (r) => String(r.sessionIndex),
      (k) => `${k}ª da sessão`,
    ),
    tiltCostAvg,
    tiltSample,
  };
}

/** EV de LP esperado para um champ: (2*wr-1) * avg magnitude. */
export function expectedLpForChampion(input: {
  wr: number;
  avgLpPerWin: number;
  avgLpPerLoss: number;
  /** Bônus contextual (−0.2…+0.2) aplicado ao WR efetivo. */
  contextLift?: number;
}): number {
  const wr = Math.max(
    0.05,
    Math.min(0.95, input.wr + (input.contextLift ?? 0)),
  );
  return (
    Math.round(
      (wr * input.avgLpPerWin - (1 - wr) * input.avgLpPerLoss) * 10,
    ) / 10
  );
}

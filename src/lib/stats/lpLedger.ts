import type { LeagueEntryDto } from "@/lib/riot/types";
import { PLAYER_TIMEZONE } from "@/lib/stats/temporal";

const TIER_ORDER = [
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
] as const;

const DIV_ORDER: Record<string, number> = {
  IV: 0,
  III: 1,
  II: 2,
  I: 3,
};

export const SOLO_QUEUE = "RANKED_SOLO_5x5";
export const FLEX_QUEUE = "RANKED_FLEX_SR";

export type RankPoint = {
  queueType: string;
  tier: string;
  rank: string;
  lp: number;
  wins: number;
  losses: number;
  ladderScore: number;
};

export type DayLpSummary = {
  queueType: string;
  timezone: string;
  /** LP líquido do dia (ladderScore). */
  lpDelta: number | null;
  start: RankPoint | null;
  current: RankPoint | null;
  /** Minutos desde o primeiro snapshot / primeira partida útil. */
  activeMinutes: number;
  lpPerHour: number | null;
  gamesToday: number;
  winsToday: number;
  lossesToday: number;
  sampleSnapshots: number;
};

export function ladderScore(tier: string, rank: string, lp: number): number {
  const t = tier.toUpperCase();
  const tierIdx = Math.max(0, TIER_ORDER.indexOf(t as (typeof TIER_ORDER)[number]));
  const highElo = t === "MASTER" || t === "GRANDMASTER" || t === "CHALLENGER";
  if (highElo) {
    // Master+ — LP absoluto na trilha
    return tierIdx * 400 + Math.max(0, lp);
  }
  const div = DIV_ORDER[rank.toUpperCase()] ?? 0;
  return tierIdx * 400 + div * 100 + Math.min(100, Math.max(0, lp));
}

export function pickSoloEntry(
  ranked: LeagueEntryDto[],
): LeagueEntryDto | null {
  return (
    ranked.find((e) => e.queueType === SOLO_QUEUE) ??
    ranked.find((e) => e.queueType === FLEX_QUEUE) ??
    null
  );
}

export function entryToRankPoint(entry: LeagueEntryDto): RankPoint {
  return {
    queueType: entry.queueType,
    tier: entry.tier,
    rank: entry.rank,
    lp: entry.leaguePoints,
    wins: entry.wins,
    losses: entry.losses,
    ladderScore: ladderScore(entry.tier, entry.rank, entry.leaguePoints),
  };
}

function startOfDayMs(now: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return Date.parse(`${y}-${m}-${d}T00:00:00-03:00`);
}

export function computeDayLpSummary(input: {
  snapshots: {
    queueType: string;
    tier: string;
    rank: string;
    lp: number;
    wins: number;
    losses: number;
    ladderScore: number;
    createdAt: Date;
  }[];
  queueType?: string;
  gamesToday?: { win: boolean; createdAt: number }[];
  now?: number;
  timeZone?: string;
}): DayLpSummary {
  const now = input.now ?? Date.now();
  const timeZone = input.timeZone ?? PLAYER_TIMEZONE;
  const dayStart = startOfDayMs(now, timeZone);
  const queueType = input.queueType ?? SOLO_QUEUE;

  const todaySnaps = input.snapshots
    .filter((s) => s.queueType === queueType && s.createdAt.getTime() >= dayStart)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Se não há snapshot de hoje, usa o último antes de hoje como baseline + o mais recente
  const allQueue = input.snapshots
    .filter((s) => s.queueType === queueType)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const startSnap =
    todaySnaps[0] ??
    [...allQueue].reverse().find((s) => s.createdAt.getTime() < dayStart) ??
    null;
  const currentSnap =
    todaySnaps[todaySnaps.length - 1] ??
    allQueue[allQueue.length - 1] ??
    null;

  const start = startSnap
    ? {
        queueType: startSnap.queueType,
        tier: startSnap.tier,
        rank: startSnap.rank,
        lp: startSnap.lp,
        wins: startSnap.wins,
        losses: startSnap.losses,
        ladderScore: startSnap.ladderScore,
      }
    : null;
  const current = currentSnap
    ? {
        queueType: currentSnap.queueType,
        tier: currentSnap.tier,
        rank: currentSnap.rank,
        lp: currentSnap.lp,
        wins: currentSnap.wins,
        losses: currentSnap.losses,
        ladderScore: currentSnap.ladderScore,
      }
    : null;

  const lpDelta =
    start && current ? current.ladderScore - start.ladderScore : null;

  const gamesToday = (input.gamesToday ?? []).filter(
    (g) => g.createdAt >= dayStart,
  );
  const winsToday = gamesToday.filter((g) => g.win).length;

  const firstTs =
    todaySnaps[0]?.createdAt.getTime() ??
    gamesToday[0]?.createdAt ??
    now;
  const activeMinutes = Math.max(1, Math.round((now - firstTs) / 60_000));
  const lpPerHour =
    lpDelta != null ? (lpDelta / activeMinutes) * 60 : null;

  return {
    queueType,
    timezone: timeZone,
    lpDelta,
    start,
    current,
    activeMinutes,
    lpPerHour,
    gamesToday: gamesToday.length,
    winsToday,
    lossesToday: gamesToday.length - winsToday,
    sampleSnapshots: todaySnaps.length || (current ? 1 : 0),
  };
}

/** Meta diária padrão e stop-loss em LP de ladder. */
export const DEFAULT_DAY_LP_GOAL = 30;
export const DEFAULT_DAY_LP_STOP = -40;
export const DEFAULT_LOSS_STREAK_STOP = 2;
export const DEFAULT_WIN_GOAL = 3;

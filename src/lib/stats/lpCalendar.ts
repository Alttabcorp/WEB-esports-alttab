import { PLAYER_TIMEZONE } from "@/lib/stats/temporal";
import { ladderScore } from "@/lib/stats/lpLedger";

export type DayLpCalendarEntry = {
  /** YYYY-MM-DD no fuso do jogador */
  day: string;
  lpDelta: number | null;
  startScore: number | null;
  endScore: number | null;
  snapshots: number;
};

function dayKey(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/**
 * Calendário de PDL por dia a partir de snapshots de elo.
 */
export function buildLpCalendar(input: {
  snapshots: {
    tier: string;
    rank: string;
    lp: number;
    ladderScore?: number;
    createdAt: Date;
  }[];
  days?: number;
  timeZone?: string;
  now?: number;
}): DayLpCalendarEntry[] {
  const timeZone = input.timeZone ?? PLAYER_TIMEZONE;
  const now = input.now ?? Date.now();
  const days = input.days ?? 28;
  const snaps = [...input.snapshots].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const byDay = new Map<
    string,
    { scores: { t: number; score: number }[] }
  >();

  for (const s of snaps) {
    const score =
      s.ladderScore ?? ladderScore(s.tier, s.rank, s.lp);
    const key = dayKey(s.createdAt.getTime(), timeZone);
    if (!byDay.has(key)) byDay.set(key, { scores: [] });
    byDay.get(key)!.scores.push({ t: s.createdAt.getTime(), score });
  }

  const out: DayLpCalendarEntry[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const ms = now - i * 24 * 60 * 60 * 1000;
    const key = dayKey(ms, timeZone);
    const daySnaps = byDay.get(key)?.scores ?? [];
    if (!daySnaps.length) {
      out.push({
        day: key,
        lpDelta: null,
        startScore: null,
        endScore: null,
        snapshots: 0,
      });
      continue;
    }
    const startScore = daySnaps[0].score;
    const endScore = daySnaps[daySnaps.length - 1].score;
    out.push({
      day: key,
      lpDelta: endScore - startScore,
      startScore,
      endScore,
      snapshots: daySnaps.length,
    });
  }
  return out;
}

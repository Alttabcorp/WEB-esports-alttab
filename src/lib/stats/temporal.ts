import type { MatchDto } from "@/lib/riot/types";
import { normalizeRole, ROLE_LABELS, type RoleKey } from "./roles";
import {
  confidenceFromSample,
  type ConfidenceLevel,
  wilsonLowerBound,
  winRate,
} from "./wilson";

/** Fuso do jogador BR (servidor Alttab). */
export const PLAYER_TIMEZONE = "America/Sao_Paulo";

/** Partidas na mesma sessão se o gap for menor que isto. */
export const SESSION_GAP_MS = 3 * 60 * 60 * 1000;

/** Data local YYYY-MM-DD no fuso do jogador (notas do dia, placar). */
export function todayDateKey(
  now = Date.now(),
  timeZone = PLAYER_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}

export type TemporalBucket = {
  key: string;
  label: string;
  games: number;
  wins: number;
  wr: number;
  wilsonLower: number;
  lift: number;
  confidence: ConfidenceLevel;
};

export type PatchBucket = TemporalBucket & {
  patch: string;
};

export type SessionIndexBucket = TemporalBucket & {
  /** 1 = primeira da sessão, 2 = segunda, … */
  index: number;
};

export type StreakBucket = TemporalBucket & {
  afterWins: number;
};

export type LossStreakBucket = TemporalBucket & {
  afterLosses: number;
};

export type GapBucket = TemporalBucket & {
  /** min gap em minutos (faixa). */
  gapMinMinutes: number;
};

export type SessionLengthBucket = TemporalBucket & {
  gamesInSession: number;
};

export type ChampHourBucket = TemporalBucket & {
  championId: number;
  championName: string;
  hourWindow: number;
};

export type RoleHourBucket = TemporalBucket & {
  role: RoleKey;
  hourWindow: number;
};

export type AvoidItem = TemporalBucket & {
  kind: "champion" | "matchup";
  championId: number;
  championName: string;
  enemyChampionId?: number;
  enemyChampionName?: string;
};

export type PerformanceAlert = {
  id: string;
  severity: "info" | "warn" | "good";
  title: string;
  detail: string;
};

export type TemporalInsights = {
  timezone: string;
  byHour: TemporalBucket[];
  byDayOfWeek: TemporalBucket[];
  byPatch: PatchBucket[];
  currentPatch: string | null;
  sessionIndex: SessionIndexBucket[];
  afterWinStreaks: StreakBucket[];
  afterLossStreaks: LossStreakBucket[];
  byRefillGap: GapBucket[];
  bySessionLength: SessionLengthBucket[];
  recentForm: TemporalBucket | null;
  champByHour: ChampHourBucket[];
  roleByHour: RoleHourBucket[];
  avoidList: AvoidItem[];
  bestPlayWindow: TemporalBucket | null;
  bestDay: TemporalBucket | null;
  alerts: PerformanceAlert[];
};

const DOW_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

type ChronoGame = {
  createdAt: number;
  win: boolean;
  patch: string;
  hour: number;
  dow: number;
  championId: number;
  championName: string;
  role: RoleKey;
  enemyChampionId: number | null;
  enemyChampionName: string | null;
};

function emptyAcc() {
  return { games: 0, wins: 0 };
}

function finalizeBucket(
  key: string,
  label: string,
  acc: { games: number; wins: number },
  baselineWr: number,
): TemporalBucket {
  const wr = winRate(acc.wins, acc.games);
  return {
    key,
    label,
    games: acc.games,
    wins: acc.wins,
    wr,
    wilsonLower: wilsonLowerBound(acc.wins, acc.games),
    lift: wr - baselineWr,
    confidence: confidenceFromSample(acc.games),
  };
}

/** "14.23.590.6953" → "14.23" */
export function patchFromGameVersion(version: string | undefined | null): string {
  if (!version) return "desconhecido";
  const parts = version.split(".");
  if (parts.length >= 2) return `${parts[0]}.${parts[1]}`;
  return version;
}

function zonedParts(ms: number, timeZone: string): { hour: number; dow: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(new Date(ms));
  const hourRaw = parts.find((p) => p.type === "hour")?.value ?? "0";
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  let hour = Number(hourRaw);
  if (hour === 24) hour = 0;
  const dowMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { hour, dow: dowMap[weekday] ?? 1 };
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}h`;
}

function windowLabel(startHour: number, size = 3): string {
  const end = (startHour + size) % 24;
  return `${hourLabel(startHour)}–${hourLabel(end)}`;
}

function gapBucketKey(gapMs: number): { key: string; label: string; min: number } {
  const mins = gapMs / 60_000;
  if (mins < 15) return { key: "0-15", label: "Refila <15min", min: 0 };
  if (mins < 45) return { key: "15-45", label: "Gap 15–45min", min: 15 };
  if (mins < 120) return { key: "45-120", label: "Gap 45–120min", min: 45 };
  return { key: "120+", label: "Gap >2h", min: 120 };
}

export function buildTemporalInsights(
  matches: MatchDto[],
  puuid: string,
  baselineWr: number,
  timeZone = PLAYER_TIMEZONE,
): TemporalInsights {
  const games: ChronoGame[] = [];

  for (const match of matches) {
    const me = match.info.participants.find((p) => p.puuid === puuid);
    if (!me) continue;
    const createdAt = match.info.gameCreation;
    if (!Number.isFinite(createdAt)) continue;
    const { hour, dow } = zonedParts(createdAt, timeZone);
    const role = normalizeRole(me.teamPosition, me.individualPosition);
    const enemy =
      match.info.participants.find(
        (p) =>
          p.teamId !== me.teamId &&
          normalizeRole(p.teamPosition, p.individualPosition) === role &&
          role !== "UNKNOWN",
      ) ?? null;
    games.push({
      createdAt,
      win: me.win,
      patch: patchFromGameVersion(match.info.gameVersion),
      hour,
      dow,
      championId: me.championId,
      championName: me.championName,
      role,
      enemyChampionId: enemy?.championId ?? null,
      enemyChampionName: enemy?.championName ?? null,
    });
  }

  games.sort((a, b) => a.createdAt - b.createdAt);

  const hourMap = new Map<number, { games: number; wins: number }>();
  const dowMap = new Map<number, { games: number; wins: number }>();
  const patchMap = new Map<string, { games: number; wins: number }>();
  const champHourMap = new Map<string, { games: number; wins: number; championId: number; championName: string; hourWindow: number }>();
  const roleHourMap = new Map<string, { games: number; wins: number; role: RoleKey; hourWindow: number }>();
  const champMap = new Map<string, { games: number; wins: number; championId: number; championName: string }>();
  const matchupMap = new Map<
    string,
    {
      games: number;
      wins: number;
      championId: number;
      championName: string;
      enemyChampionId: number;
      enemyChampionName: string;
    }
  >();

  for (const g of games) {
    if (!hourMap.has(g.hour)) hourMap.set(g.hour, emptyAcc());
    const h = hourMap.get(g.hour)!;
    h.games += 1;
    if (g.win) h.wins += 1;

    if (!dowMap.has(g.dow)) dowMap.set(g.dow, emptyAcc());
    const d = dowMap.get(g.dow)!;
    d.games += 1;
    if (g.win) d.wins += 1;

    if (!patchMap.has(g.patch)) patchMap.set(g.patch, emptyAcc());
    const p = patchMap.get(g.patch)!;
    p.games += 1;
    if (g.win) p.wins += 1;

    const hw = Math.floor(g.hour / 3) * 3;
    const ck = `${g.championId}:${hw}`;
    if (!champHourMap.has(ck)) {
      champHourMap.set(ck, {
        ...emptyAcc(),
        championId: g.championId,
        championName: g.championName,
        hourWindow: hw,
      });
    }
    const ch = champHourMap.get(ck)!;
    ch.games += 1;
    if (g.win) ch.wins += 1;

    if (g.role !== "UNKNOWN") {
      const rk = `${g.role}:${hw}`;
      if (!roleHourMap.has(rk)) {
        roleHourMap.set(rk, {
          ...emptyAcc(),
          role: g.role,
          hourWindow: hw,
        });
      }
      const rh = roleHourMap.get(rk)!;
      rh.games += 1;
      if (g.win) rh.wins += 1;
    }

    const champKey = String(g.championId);
    if (!champMap.has(champKey)) {
      champMap.set(champKey, {
        ...emptyAcc(),
        championId: g.championId,
        championName: g.championName,
      });
    }
    const cm = champMap.get(champKey)!;
    cm.games += 1;
    if (g.win) cm.wins += 1;

    if (g.enemyChampionId != null && g.enemyChampionName) {
      const mk = `${g.championId}:${g.enemyChampionId}`;
      if (!matchupMap.has(mk)) {
        matchupMap.set(mk, {
          ...emptyAcc(),
          championId: g.championId,
          championName: g.championName,
          enemyChampionId: g.enemyChampionId,
          enemyChampionName: g.enemyChampionName,
        });
      }
      const mm = matchupMap.get(mk)!;
      mm.games += 1;
      if (g.win) mm.wins += 1;
    }
  }

  const byHour = [...hourMap.entries()]
    .map(([hour, acc]) =>
      finalizeBucket(String(hour), hourLabel(hour), acc, baselineWr),
    )
    .sort((a, b) => Number(a.key) - Number(b.key));

  const byDayOfWeek = [0, 1, 2, 3, 4, 5, 6].map((dow) => {
    const acc = dowMap.get(dow) ?? emptyAcc();
    return finalizeBucket(String(dow), DOW_LABELS[dow], acc, baselineWr);
  });

  const byPatch: PatchBucket[] = [...patchMap.entries()]
    .map(([patch, acc]) => ({
      ...finalizeBucket(patch, `Patch ${patch}`, acc, baselineWr),
      patch,
    }))
    .sort((a, b) => {
      const [aMaj, aMin] = a.patch.split(".").map(Number);
      const [bMaj, bMin] = b.patch.split(".").map(Number);
      if (Number.isFinite(bMaj) && Number.isFinite(aMaj)) {
        if (bMaj !== aMaj) return bMaj - aMaj;
        return (bMin || 0) - (aMin || 0);
      }
      return b.games - a.games;
    });

  const currentPatch = byPatch[0]?.patch ?? null;

  const windowAcc = new Map<number, { games: number; wins: number }>();
  for (const g of games) {
    const start = Math.floor(g.hour / 3) * 3;
    if (!windowAcc.has(start)) windowAcc.set(start, emptyAcc());
    const w = windowAcc.get(start)!;
    w.games += 1;
    if (g.win) w.wins += 1;
  }
  const windows = [...windowAcc.entries()]
    .map(([start, acc]) =>
      finalizeBucket(String(start), windowLabel(start), acc, baselineWr),
    )
    .filter((w) => w.games >= 5);
  const bestPlayWindow =
    windows.sort((a, b) => b.wilsonLower - a.wilsonLower)[0] ?? null;

  const bestDay =
    [...byDayOfWeek]
      .filter((d) => d.games >= 5)
      .sort((a, b) => b.wilsonLower - a.wilsonLower)[0] ?? null;

  const {
    sessionIndex,
    afterWinStreaks,
    afterLossStreaks,
    byRefillGap,
    bySessionLength,
  } = analyzeSessions(games, baselineWr);

  const recentSlice = games.slice(-20);
  const recentForm =
    recentSlice.length >= 8
      ? finalizeBucket(
          "recent-20",
          `Últimas ${recentSlice.length}`,
          {
            games: recentSlice.length,
            wins: recentSlice.filter((g) => g.win).length,
          },
          baselineWr,
        )
      : null;

  const champByHour: ChampHourBucket[] = [...champHourMap.values()]
    .filter((c) => c.games >= 4)
    .map((c) => ({
      ...finalizeBucket(
        `${c.championId}@${c.hourWindow}`,
        `${c.championName} · ${windowLabel(c.hourWindow)}`,
        c,
        baselineWr,
      ),
      championId: c.championId,
      championName: c.championName,
      hourWindow: c.hourWindow,
    }))
    .sort((a, b) => b.wilsonLower - a.wilsonLower)
    .slice(0, 24);

  const roleByHour: RoleHourBucket[] = [...roleHourMap.values()]
    .filter((r) => r.games >= 5)
    .map((r) => ({
      ...finalizeBucket(
        `${r.role}@${r.hourWindow}`,
        `${ROLE_LABELS[r.role]} · ${windowLabel(r.hourWindow)}`,
        r,
        baselineWr,
      ),
      role: r.role,
      hourWindow: r.hourWindow,
    }))
    .sort((a, b) => b.wilsonLower - a.wilsonLower)
    .slice(0, 15);

  const avoidChamps: AvoidItem[] = [...champMap.values()]
    .filter((c) => c.games >= 6)
    .map((c) => ({
      ...finalizeBucket(
        `champ-${c.championId}`,
        c.championName,
        c,
        baselineWr,
      ),
      kind: "champion" as const,
      championId: c.championId,
      championName: c.championName,
    }))
    .filter((c) => c.lift <= -0.08)
    .sort((a, b) => a.wilsonLower - b.wilsonLower)
    .slice(0, 5);

  const avoidMatchups: AvoidItem[] = [...matchupMap.values()]
    .filter((m) => m.games >= 3)
    .map((m) => ({
      ...finalizeBucket(
        `mu-${m.championId}-${m.enemyChampionId}`,
        `${m.championName} vs ${m.enemyChampionName}`,
        m,
        baselineWr,
      ),
      kind: "matchup" as const,
      championId: m.championId,
      championName: m.championName,
      enemyChampionId: m.enemyChampionId,
      enemyChampionName: m.enemyChampionName,
    }))
    .filter((m) => m.lift <= -0.12)
    .sort((a, b) => a.wilsonLower - b.wilsonLower)
    .slice(0, 5);

  const avoidList = [...avoidChamps, ...avoidMatchups].slice(0, 8);

  const alerts = buildAlerts({
    baselineWr,
    byHour,
    byDayOfWeek,
    byPatch,
    currentPatch,
    bestPlayWindow,
    bestDay,
    sessionIndex,
    afterWinStreaks,
    afterLossStreaks,
    byRefillGap,
    recentForm,
    avoidList,
    totalGames: games.length,
  });

  return {
    timezone: timeZone,
    byHour,
    byDayOfWeek,
    byPatch,
    currentPatch,
    sessionIndex,
    afterWinStreaks,
    afterLossStreaks,
    byRefillGap,
    bySessionLength,
    recentForm,
    champByHour,
    roleByHour,
    avoidList,
    bestPlayWindow,
    bestDay,
    alerts,
  };
}

function analyzeSessions(
  games: ChronoGame[],
  baselineWr: number,
): {
  sessionIndex: SessionIndexBucket[];
  afterWinStreaks: StreakBucket[];
  afterLossStreaks: LossStreakBucket[];
  byRefillGap: GapBucket[];
  bySessionLength: SessionLengthBucket[];
} {
  const indexMap = new Map<number, { games: number; wins: number }>();
  const streakMap = new Map<number, { games: number; wins: number }>();
  const lossMap = new Map<number, { games: number; wins: number }>();
  const gapMap = new Map<string, { games: number; wins: number; min: number; label: string }>();
  const lengthMap = new Map<number, { games: number; wins: number }>();

  let sessionStart = 0;
  let winStreak = 0;
  let lossStreak = 0;
  const sessionSizes: number[] = [];

  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (i > 0 && g.createdAt - games[i - 1].createdAt > SESSION_GAP_MS) {
      sessionSizes.push(i - sessionStart);
      sessionStart = i;
      winStreak = 0;
      lossStreak = 0;
    } else if (i > 0) {
      const gap = g.createdAt - games[i - 1].createdAt;
      const gb = gapBucketKey(gap);
      if (!gapMap.has(gb.key)) {
        gapMap.set(gb.key, { ...emptyAcc(), min: gb.min, label: gb.label });
      }
      const bucket = gapMap.get(gb.key)!;
      bucket.games += 1;
      if (g.win) bucket.wins += 1;
    }

    const index = i - sessionStart + 1;
    if (!indexMap.has(index)) indexMap.set(index, emptyAcc());
    const bucket = indexMap.get(index)!;
    bucket.games += 1;
    if (g.win) bucket.wins += 1;

    if (winStreak >= 1 && winStreak <= 5) {
      if (!streakMap.has(winStreak)) streakMap.set(winStreak, emptyAcc());
      const s = streakMap.get(winStreak)!;
      s.games += 1;
      if (g.win) s.wins += 1;
    }

    if (lossStreak >= 1 && lossStreak <= 4) {
      if (!lossMap.has(lossStreak)) lossMap.set(lossStreak, emptyAcc());
      const s = lossMap.get(lossStreak)!;
      s.games += 1;
      if (g.win) s.wins += 1;
    }

    if (g.win) {
      winStreak += 1;
      lossStreak = 0;
    } else {
      lossStreak += 1;
      winStreak = 0;
    }
  }
  if (games.length > 0) sessionSizes.push(games.length - sessionStart);

  for (const size of sessionSizes) {
    const key = Math.min(size, 6);
    if (!lengthMap.has(key)) lengthMap.set(key, emptyAcc());
    // Approximates: mark the last game of sessions of that length
  }
  // Rebuild by tagging each game with final session length of its session
  {
    let s0 = 0;
    for (let i = 0; i < games.length; i++) {
      if (i > 0 && games[i].createdAt - games[i - 1].createdAt > SESSION_GAP_MS) {
        s0 = i;
      }
      let end = i;
      while (
        end + 1 < games.length &&
        games[end + 1].createdAt - games[end].createdAt <= SESSION_GAP_MS
      ) {
        end += 1;
      }
      const size = Math.min(end - s0 + 1, 6);
      if (!lengthMap.has(size)) lengthMap.set(size, emptyAcc());
      // Only count once per game as belonging to a session that ended with `size`
      if (i === end) {
        const b = lengthMap.get(size)!;
        // Count wins in that whole session into the length bucket once
        let wins = 0;
        let gamesCount = 0;
        for (let j = s0; j <= end; j++) {
          gamesCount += 1;
          if (games[j].win) wins += 1;
        }
        b.games += gamesCount;
        b.wins += wins;
      }
    }
  }

  const sessionIndex: SessionIndexBucket[] = [...indexMap.entries()]
    .filter(([idx]) => idx <= 6)
    .map(([index, acc]) => ({
      ...finalizeBucket(
        String(index),
        index === 1 ? "1ª partida" : `${index}ª partida`,
        acc,
        baselineWr,
      ),
      index,
    }))
    .sort((a, b) => a.index - b.index);

  const afterWinStreaks: StreakBucket[] = [...streakMap.entries()]
    .map(([afterWins, acc]) => ({
      ...finalizeBucket(
        String(afterWins),
        `Após ${afterWins} vitória${afterWins > 1 ? "s" : ""}`,
        acc,
        baselineWr,
      ),
      afterWins,
    }))
    .sort((a, b) => a.afterWins - b.afterWins);

  const afterLossStreaks: LossStreakBucket[] = [...lossMap.entries()]
    .map(([afterLosses, acc]) => ({
      ...finalizeBucket(
        String(afterLosses),
        `Após ${afterLosses} derrota${afterLosses > 1 ? "s" : ""}`,
        acc,
        baselineWr,
      ),
      afterLosses,
    }))
    .sort((a, b) => a.afterLosses - b.afterLosses);

  const byRefillGap: GapBucket[] = [...gapMap.entries()]
    .map(([key, acc]) => ({
      ...finalizeBucket(key, acc.label, acc, baselineWr),
      gapMinMinutes: acc.min,
    }))
    .sort((a, b) => a.gapMinMinutes - b.gapMinMinutes);

  const bySessionLength: SessionLengthBucket[] = [...lengthMap.entries()]
    .filter(([, acc]) => acc.games >= 4)
    .map(([gamesInSession, acc]) => ({
      ...finalizeBucket(
        String(gamesInSession),
        gamesInSession >= 6
          ? "Sessão 6+ jogos"
          : `Sessão de ${gamesInSession} jogo${gamesInSession > 1 ? "s" : ""}`,
        acc,
        baselineWr,
      ),
      gamesInSession,
    }))
    .sort((a, b) => a.gamesInSession - b.gamesInSession);

  return {
    sessionIndex,
    afterWinStreaks,
    afterLossStreaks,
    byRefillGap,
    bySessionLength,
  };
}

function buildAlerts(input: {
  baselineWr: number;
  byHour: TemporalBucket[];
  byDayOfWeek: TemporalBucket[];
  byPatch: PatchBucket[];
  currentPatch: string | null;
  bestPlayWindow: TemporalBucket | null;
  bestDay: TemporalBucket | null;
  sessionIndex: SessionIndexBucket[];
  afterWinStreaks: StreakBucket[];
  afterLossStreaks: LossStreakBucket[];
  byRefillGap: GapBucket[];
  recentForm: TemporalBucket | null;
  avoidList: AvoidItem[];
  totalGames: number;
}): PerformanceAlert[] {
  const alerts: PerformanceAlert[] = [];
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  if (input.totalGames < 30) {
    alerts.push({
      id: "sample-small",
      severity: "warn",
      title: "Amostra ainda pequena",
      detail: `Só ${input.totalGames} partidas analisadas. Sincronize 200–500 pra recomendações mais estáveis.`,
    });
  }

  if (input.bestPlayWindow && input.bestPlayWindow.lift >= 0.05) {
    alerts.push({
      id: "best-window",
      severity: "good",
      title: `Melhor horário: ${input.bestPlayWindow.label}`,
      detail: `WR ${pct(input.bestPlayWindow.wr)} em ${input.bestPlayWindow.games} jogos (${pct(input.bestPlayWindow.lift)} vs média). Priorize ranked nesse bloco.`,
    });
  }

  const worstWindow = [...input.byHour]
    .filter((h) => h.games >= 8)
    .sort((a, b) => a.wilsonLower - b.wilsonLower)[0];
  if (worstWindow && worstWindow.lift <= -0.08) {
    alerts.push({
      id: "worst-hour",
      severity: "warn",
      title: `Evite ranked por volta de ${worstWindow.label}`,
      detail: `WR ${pct(worstWindow.wr)} em ${worstWindow.games} jogos — bem abaixo da sua média (${pct(input.baselineWr)}).`,
    });
  }

  if (input.bestDay && input.bestDay.lift >= 0.05) {
    alerts.push({
      id: "best-day",
      severity: "good",
      title: `${input.bestDay.label} é seu melhor dia`,
      detail: `WR ${pct(input.bestDay.wr)} em ${input.bestDay.games} jogos. Bom dia pra grindar.`,
    });
  }

  const worstDay = [...input.byDayOfWeek]
    .filter((d) => d.games >= 8)
    .sort((a, b) => a.wilsonLower - b.wilsonLower)[0];
  if (
    worstDay &&
    worstDay.lift <= -0.08 &&
    worstDay.key !== input.bestDay?.key
  ) {
    alerts.push({
      id: "worst-day",
      severity: "warn",
      title: `${worstDay.label} costuma ser pior`,
      detail: `WR ${pct(worstDay.wr)} em ${worstDay.games} jogos. Se for jogar, pare cedo.`,
    });
  }

  const first = input.sessionIndex.find((s) => s.index === 1);
  const second = input.sessionIndex.find((s) => s.index === 2);
  if (
    first &&
    second &&
    first.games >= 8 &&
    second.games >= 8 &&
    first.wr - second.wr >= 0.1
  ) {
    alerts.push({
      id: "session-decay",
      severity: "warn",
      title: "Decaimento na 2ª partida da sessão",
      detail: `1ª: ${pct(first.wr)} (${first.games}x) → 2ª: ${pct(second.wr)} (${second.games}x). Considere parar após a primeira.`,
    });
  }

  const third = input.sessionIndex.find((s) => s.index === 3);
  if (
    first &&
    third &&
    first.games >= 6 &&
    third.games >= 6 &&
    first.wr - third.wr >= 0.12
  ) {
    alerts.push({
      id: "session-decay-3",
      severity: "warn",
      title: "3ª partida da sessão é fraca",
      detail: `WR cai de ${pct(first.wr)} (1ª) para ${pct(third.wr)} (3ª). Sessões longas prejudicam seu PDL.`,
    });
  }

  for (const streak of input.afterWinStreaks) {
    if (streak.afterWins >= 2 && streak.games >= 8 && streak.lift <= -0.1) {
      alerts.push({
        id: `streak-trap-${streak.afterWins}`,
        severity: "warn",
        title: `Após ${streak.afterWins} wins, a próxima costuma cair`,
        detail: `WR ${pct(streak.wr)} na partida seguinte (${streak.games} amostras). Pause ou troque de modo.`,
      });
      break;
    }
  }

  for (const streak of input.afterLossStreaks) {
    if (streak.afterLosses >= 2 && streak.games >= 8 && streak.lift <= -0.08) {
      alerts.push({
        id: `loss-tilt-${streak.afterLosses}`,
        severity: "warn",
        title: `Não refile após ${streak.afterLosses} derrotas`,
        detail: `WR ${pct(streak.wr)} na seguinte (${streak.games}x). Pare para proteger PDL.`,
      });
      break;
    }
  }

  const quickRefill = input.byRefillGap.find((g) => g.key === "0-15");
  if (quickRefill && quickRefill.games >= 10 && quickRefill.lift <= -0.08) {
    alerts.push({
      id: "instant-requeue",
      severity: "warn",
      title: "Refila rápida sangra PDL",
      detail: `WR ${pct(quickRefill.wr)} quando o gap é <15min (${quickRefill.games}x). Espere alguns minutos.`,
    });
  }

  if (input.recentForm && input.recentForm.games >= 10) {
    if (input.recentForm.lift <= -0.08) {
      alerts.push({
        id: "cold-form",
        severity: "warn",
        title: "Forma recente fria",
        detail: `${pct(input.recentForm.wr)} nas ${input.recentForm.games} últimas — abaixo da média. Pool curto e pare cedo.`,
      });
    } else if (input.recentForm.lift >= 0.06) {
      alerts.push({
        id: "hot-form",
        severity: "good",
        title: "Forma recente quente",
        detail: `${pct(input.recentForm.wr)} nas ${input.recentForm.games} últimas. Bom momento pra grindar meta de PDL.`,
      });
    }
  }

  const topAvoid = input.avoidList[0];
  if (topAvoid && topAvoid.games >= 6) {
    alerts.push({
      id: "avoid-top",
      severity: "warn",
      title: `Evite: ${topAvoid.label}`,
      detail: `WR ${pct(topAvoid.wr)} em ${topAvoid.games} jogos — sangria no histórico. Tire do pool de hoje.`,
    });
  }

  if (input.currentPatch) {
    const cur = input.byPatch.find((p) => p.patch === input.currentPatch);
    if (cur && cur.games < 15 && input.totalGames >= 40) {
      alerts.push({
        id: "patch-small",
        severity: "info",
        title: `Patch ${input.currentPatch} ainda com pouca amostra`,
        detail: `Só ${cur.games} partidas neste patch (stats gerais usam as ${input.totalGames} juntas). Veja o breakdown por patch em Análise se quiser isolar.`,
      });
    }
  }

  return alerts.slice(0, 10);
}

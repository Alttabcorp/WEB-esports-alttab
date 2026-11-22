import {
  findPlayerByPuuid,
  getAppProfile,
  getDayLpByQueue,
  getMatchFromDb,
  getStoredMatchesForPlayer,
  persistMatchesForPlayer,
  recordRankSnapshots,
} from "@/lib/db/persist";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { setCachedMatch, getCachedMatch } from "@/lib/cache/matches";
import { getRiotClient, resolveRouting } from "@/lib/riot/client";
import type { PlatformRegion } from "@/lib/riot/regions";
import type { MatchDto } from "@/lib/riot/types";
import {
  PLAYER_TIMEZONE,
  SESSION_GAP_MS,
  buildTemporalInsights,
} from "@/lib/stats/temporal";
import {
  DEFAULT_LOSS_STREAK_STOP,
  DEFAULT_WIN_GOAL,
  QUEUE_ID_BY_TYPE,
  QUEUE_LABEL,
  SOLO_QUEUE,
  type DayLpSummary,
} from "@/lib/stats/lpLedger";
import {
  computeDayGoalProgress,
  dayGoalVerb,
} from "@/lib/stats/dayGoal";
import {
  computeSessionEv,
  type SessionEvResult,
} from "@/lib/stats/sessionEv";
import { winRate } from "@/lib/stats/wilson";

export type SessionAdviceDecision = "continue" | "caution" | "stop";
export type SessionAdvicePhase = "preQueue" | "postGame";

export type SessionAdvice = {
  phase: SessionAdvicePhase;
  decision: SessionAdviceDecision;
  title: string;
  summary: string;
  reasons: string[];
  today: {
    games: number;
    wins: number;
    losses: number;
    wr: number;
  };
  session: {
    games: number;
    wins: number;
    losses: number;
    wr: number;
    nextIndex: number;
  };
  lastGame: {
    win: boolean | null;
    championName: string | null;
    matchId: string | null;
    minutesAgo: number | null;
  };
  lp: {
    delta: number | null;
    perHour: number | null;
    goal: number;
    stopLoss: number;
    goalHit: boolean;
    stopHit: boolean;
    gamesRemainingEst: number | null;
    /** ΔLP da última partida (estimado se ledger fino indisponível). */
    lastMatchDelta: number | null;
    queueType: string | null;
    queueLabel: string | null;
    soloDelta: number | null;
    flexDelta: number | null;
  };
  sessionEv: SessionEvResult;
  nextPlan: {
    maxGamesLeft: number | null;
    verb: string;
  };
  bestWindowLabel: string | null;
  inBestWindow: boolean;
  syncedNewMatch: boolean;
};

type Chrono = {
  createdAt: number;
  win: boolean;
  championName: string;
  matchId: string;
};

function zonedHour(ms: number, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  });
  const hourRaw = fmt.formatToParts(new Date(ms)).find((p) => p.type === "hour")
    ?.value;
  let hour = Number(hourRaw ?? 0);
  if (hour === 24) hour = 0;
  return hour;
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
  const iso = `${y}-${m}-${d}T00:00:00-03:00`;
  return Date.parse(iso);
}

function toChrono(matches: MatchDto[], puuid: string): Chrono[] {
  const out: Chrono[] = [];
  for (const match of matches) {
    const me = match.info.participants.find((p) => p.puuid === puuid);
    if (!me) continue;
    out.push({
      createdAt: match.info.gameCreation,
      win: me.win,
      championName: me.championName,
      matchId: match.metadata.matchId,
    });
  }
  return out.sort((a, b) => a.createdAt - b.createdAt);
}

function currentSession(games: Chrono[], now: number): Chrono[] {
  if (games.length === 0) return [];
  const session: Chrono[] = [];
  for (let i = games.length - 1; i >= 0; i--) {
    const g = games[i];
    if (now - g.createdAt > 12 * 60 * 60 * 1000) break;
    if (session.length === 0) {
      session.push(g);
      continue;
    }
    const newer = session[0];
    if (newer.createdAt - g.createdAt <= SESSION_GAP_MS) {
      session.unshift(g);
    } else break;
  }
  return session;
}

async function trySyncLatestMatch(
  platform: PlatformRegion,
  puuid: string,
  playerId: string,
): Promise<{ match: MatchDto | null; synced: boolean }> {
  const client = getRiotClient();
  const routing = resolveRouting(platform);
  try {
    const ids = await client.getMatchIdsByPuuid(routing, puuid, {
      start: 0,
      count: 3,
      queue: 420,
    });
    const flex = await client.getMatchIdsByPuuid(routing, puuid, {
      start: 0,
      count: 2,
      queue: 440,
    });
    const merged = [...new Set([...ids, ...flex])];
    const matches: MatchDto[] = [];

    for (const matchId of merged.slice(0, 5)) {
      let match = await getCachedMatch(matchId);
      if (!match) match = await getMatchFromDb(matchId);
      if (!match) {
        match = await client.getMatch(routing, matchId);
        await setCachedMatch(matchId, match);
      }
      matches.push(match);
    }

    if (matches.length === 0) return { match: null, synced: false };
    await persistMatchesForPlayer(playerId, puuid, matches);
    const newest = [...matches].sort(
      (a, b) => b.info.gameCreation - a.info.gameCreation,
    )[0];
    return { match: newest, synced: true };
  } catch {
    return { match: null, synced: false };
  }
}

async function refreshRankSnapshot(
  platform: PlatformRegion,
  puuid: string,
  playerId: string,
): Promise<{
  active: DayLpSummary;
  solo: DayLpSummary;
  flex: DayLpSummary;
} | null> {
  try {
    const client = getRiotClient();
    const ranked = await client.getLeagueEntriesByPuuid(platform, puuid);
    await recordRankSnapshots(playerId, ranked, "session-advice");
    await db.player.update({
      where: { id: playerId },
      data: { rankedJson: ranked as unknown as Prisma.InputJsonValue },
    });
    return getDayLpByQueue(playerId, puuid);
  } catch {
    try {
      return getDayLpByQueue(playerId, puuid);
    } catch {
      return null;
    }
  }
}

export async function buildSessionAdvice(
  platform: PlatformRegion,
  puuid: string,
  options?: { phase?: SessionAdvicePhase },
): Promise<SessionAdvice> {
  const phase: SessionAdvicePhase = options?.phase ?? "postGame";
  const player = await findPlayerByPuuid(puuid);
  const now = Date.now();

  let syncedNewMatch = false;
  if (player && phase === "postGame") {
    const sync = await trySyncLatestMatch(platform, puuid, player.id);
    syncedNewMatch = sync.synced;
  }

  const appProfileEarly = await getAppProfile();
  const preferQueue = (appProfileEarly?.queue as
    | "solo"
    | "flex"
    | "ranked"
    | undefined) ?? "ranked";

  let lpByQueue: Awaited<ReturnType<typeof refreshRankSnapshot>> = null;
  if (player) {
    lpByQueue = await refreshRankSnapshot(platform, puuid, player.id);
    if (lpByQueue && (preferQueue === "solo" || preferQueue === "flex")) {
      lpByQueue = {
        ...lpByQueue,
        active: preferQueue === "solo" ? lpByQueue.solo : lpByQueue.flex,
      };
    }
  }
  const lpSummary = lpByQueue?.active ?? null;

  const stored = player
    ? await getStoredMatchesForPlayer(player.id, {
        count: 80,
        queue: "ranked",
      })
    : [];

  const chrono = toChrono(stored, puuid);
  const dayStart = startOfDayMs(now, PLAYER_TIMEZONE);
  // Conta W/L do dia na fila ativa (Solo ou Flex) — evita misturar ladders.
  const activeQueueId =
    lpSummary != null ? QUEUE_ID_BY_TYPE[lpSummary.queueType] : undefined;
  const todayGamesAll = chrono.filter((g) => g.createdAt >= dayStart);
  const todayMatches = stored.filter((m) => {
    if (m.info.gameCreation < dayStart) return false;
    if (activeQueueId == null) return true;
    return m.info.queueId === activeQueueId;
  });
  const todayGames = toChrono(todayMatches, puuid);
  const session = currentSession(chrono, now);
  const last = session[session.length - 1] ?? chrono[chrono.length - 1] ?? null;

  const todayWins = todayGames.filter((g) => g.win).length;
  const sessionWins = session.filter((g) => g.win).length;
  const overallWr =
    chrono.length > 0
      ? winRate(
          chrono.filter((g) => g.win).length,
          chrono.length,
        )
      : 0.5;

  const temporal = buildTemporalInsights(stored, puuid, overallWr);
  const hour = zonedHour(now, PLAYER_TIMEZONE);
  const windowStart = Math.floor(hour / 3) * 3;
  const best = temporal.bestPlayWindow;
  const inBestWindow =
    best != null && Number(best.key) === windowStart && best.lift >= 0.03;

  const completedSessionGames = session.length;
  const nextGameNumber = completedSessionGames + 1;

  const sessionIndexHist = temporal.sessionIndex.find(
    (s) => s.index === nextGameNumber,
  );
  const afterWins = (() => {
    let streak = 0;
    for (let i = session.length - 1; i >= 0; i--) {
      if (session[i].win) streak += 1;
      else break;
    }
    return streak;
  })();
  const afterLosses = (() => {
    let streak = 0;
    for (let i = session.length - 1; i >= 0; i--) {
      if (!session[i].win) streak += 1;
      else break;
    }
    return streak;
  })();

  const streakTrap = temporal.afterWinStreaks.find(
    (s) => s.afterWins === afterWins && s.games >= 6 && s.lift <= -0.08,
  );
  const lossTilt = temporal.afterLossStreaks.find(
    (s) => s.afterLosses === afterLosses && s.games >= 6 && s.lift <= -0.08,
  );

  const appProfile = appProfileEarly;
  const goalProgress = computeDayGoalProgress({
    target: appProfile?.dailyLpTarget,
    stopLoss: appProfile?.dailyLpStop,
    delta: lpSummary?.lpDelta ?? null,
    perHour: lpSummary?.lpPerHour ?? null,
  });
  const lpDelta = goalProgress.delta;
  const goalHit = goalProgress.goalHit;
  const stopHit = goalProgress.stopHit;
  const winGoalHit =
    todayWins >= DEFAULT_WIN_GOAL && todayGames.length >= DEFAULT_WIN_GOAL;

  const reasons: string[] = [];
  let score = 0;

  if (phase === "preQueue" && todayGames.length === 0) {
    score += 1;
    reasons.push("Dia limpo — bom momento pra abrir a sessão com foco.");
  }

  if (last?.win === true) {
    score += 1;
    reasons.push(
      `Última partida: vitória${last.championName ? ` de ${last.championName}` : ""}.`,
    );
  } else if (last?.win === false) {
    score -= 2;
    reasons.push(
      `Última partida: derrota${last.championName ? ` de ${last.championName}` : ""}.`,
    );
  } else if (phase === "postGame") {
    reasons.push(
      "Resultado da última ainda não chegou no Match-V5 — usando padrão histórico.",
    );
  }

  if (sessionIndexHist && sessionIndexHist.games >= 6) {
    if (sessionIndexHist.lift <= -0.1) {
      score -= 2;
      reasons.push(
        `Historicamente a ${nextGameNumber}ª da sessão rende pouco (${Math.round(sessionIndexHist.wr * 100)}% WR).`,
      );
    } else if (sessionIndexHist.lift >= 0.05) {
      score += 1;
      reasons.push(
        `A ${nextGameNumber}ª da sessão costuma ser boa (${Math.round(sessionIndexHist.wr * 100)}% WR).`,
      );
    }
  }

  if (streakTrap) {
    score -= 2;
    reasons.push(
      `Após ${afterWins} win(s), a próxima costuma cair (${Math.round(streakTrap.wr * 100)}% WR).`,
    );
  }

  if (lossTilt || afterLosses >= DEFAULT_LOSS_STREAK_STOP) {
    score -= 3;
    reasons.push(
      `${afterLosses} derrota(s) seguida(s) — pare para proteger PDL.`,
    );
  }

  if (best) {
    if (inBestWindow) {
      score += 1;
      reasons.push(`Você está no seu melhor bloco (${best.label}).`);
    } else if (best.lift >= 0.08) {
      score -= 1;
      reasons.push(
        `Fora do melhor horário (${best.label}). Agora ~${String(hour).padStart(2, "0")}h.`,
      );
    }
  }

  const todayWr = winRate(todayWins, todayGames.length);
  if (todayGames.length >= 3 && todayWr <= 0.4) {
    score -= 2;
    reasons.push(
      `Hoje ${Math.round(todayWr * 100)}% em ${todayGames.length} jogos — risco de sangrar PDL.`,
    );
  } else if (todayGames.length >= 2 && todayWr >= 0.65) {
    score += 1;
    reasons.push(
      `Dia positivo (${Math.round(todayWr * 100)}% em ${todayGames.length} jogos).`,
    );
  }

  if (completedSessionGames >= 4) {
    score -= 1;
    reasons.push(`Sessão longa (${completedSessionGames} partidas) — fadiga.`);
  }

  const queueLabel =
    lpSummary != null
      ? QUEUE_LABEL[lpSummary.queueType] ?? lpSummary.queueType
      : "Ranked";

  if (lpDelta != null) {
    if (stopHit) {
      score -= 4;
      reasons.push(
        `Stop-loss ${queueLabel}: ${lpDelta} PDL (limite ${goalProgress.stopLoss}).`,
      );
    } else if (goalHit || winGoalHit) {
      score -= 2;
      reasons.push(
        goalHit
          ? `Meta ${queueLabel} batida (+${lpDelta} / +${goalProgress.target}). Proteja o lucro.`
          : `Meta de vitórias ${queueLabel} batida (${todayWins}W). Pode encerrar no azul.`,
      );
    } else if (lpDelta >= 15) {
      score += 1;
      reasons.push(
        `PDL ${queueLabel}: +${lpDelta} (meta +${goalProgress.target}). ${dayGoalVerb(goalProgress)}`,
      );
    } else if (lpDelta <= -20) {
      score -= 2;
      reasons.push(
        `PDL ${queueLabel}: ${lpDelta}. Evite forçar a recuperação.`,
      );
    } else {
      reasons.push(
        `PDL ${queueLabel} ${lpDelta >= 0 ? "+" : ""}${lpDelta} · meta +${goalProgress.target}` +
          (goalProgress.gamesRemainingEst != null
            ? ` · ~${goalProgress.gamesRemainingEst} win(s)`
            : ""),
      );
    }
  }

  // Não punir Solo negativo se o dia ativo foi Flex (ou vice-versa).
  const other =
    lpSummary?.queueType === SOLO_QUEUE ? lpByQueue?.flex : lpByQueue?.solo;
  if (
    other &&
    other.gamesToday === 0 &&
    lpSummary &&
    lpSummary.gamesToday > 0 &&
    (other.lpDelta ?? 0) < 0
  ) {
    reasons.push(
      `${QUEUE_LABEL[other.queueType] ?? "Outra fila"} sem jogos hoje (${other.lpDelta} PDL no snapshot) — ignorado na decisão.`,
    );
  }

  if (todayGamesAll.length > todayGames.length) {
    const otherCount = todayGamesAll.length - todayGames.length;
    reasons.push(
      `+${otherCount} jogo(s) na outra fila hoje — PDL e stop usam só ${queueLabel}.`,
    );
  }

  const sessionEv = computeSessionEv({
    temporal,
    goal: goalProgress,
    nextSessionIndex: nextGameNumber,
    lossStreak: afterLosses,
    winStreak: afterWins,
  });
  // Blend sessionEv into decision score
  score += Math.round(sessionEv.score / 2);

  if (temporal.recentForm && temporal.recentForm.lift <= -0.08) {
    score -= 1;
    reasons.push(
      `Forma recente fria (${Math.round(temporal.recentForm.wr * 100)}% nas últimas).`,
    );
  }

  const minutesSinceLast = last
    ? Math.max(0, Math.round((now - last.createdAt) / 60000))
    : null;
  const quickRefill = temporal.byRefillGap.find((g) => g.key === "0-15");
  if (
    phase === "postGame" &&
    minutesSinceLast != null &&
    minutesSinceLast < 15 &&
    quickRefill &&
    quickRefill.lift <= -0.08 &&
    quickRefill.games >= 8
  ) {
    score -= 1;
    reasons.push("Refila <15min costuma render pouco no seu histórico.");
  }

  let decision: SessionAdviceDecision = "caution";
  if (score >= 2) decision = "continue";
  else if (score <= -2) decision = "stop";

  const title =
    decision === "continue"
      ? phase === "preQueue"
        ? "Pode filar — sinais favoráveis"
        : "Pode jogar mais uma — PDL no radar"
      : decision === "stop"
        ? phase === "preQueue"
          ? "Não file agora — proteja o PDL"
          : "Pare por agora — proteja o PDL do dia"
        : phase === "preQueue"
          ? "Cuidado antes de filar"
          : "Cuidado — só continue se estiver fresco";

  const summary =
    decision === "continue"
      ? sessionEv.detail
      : decision === "stop"
        ? sessionEv.detail ||
          "Histórico da sessão/dia aponta risco de perder PDL se forçar."
        : sessionEv.detail ||
          "Não é um stop claro. Se jogar, só 1 com foco.";

  const lastMatchDelta =
    last == null
      ? null
      : last.win
        ? 18
        : -16;

  const maxGamesLeft =
    goalProgress.goalHit || goalProgress.stopHit
      ? 0
      : goalProgress.gamesRemainingEst != null
        ? Math.min(3, Math.max(1, goalProgress.gamesRemainingEst))
        : decision === "stop"
          ? 0
          : decision === "continue"
            ? 2
            : 1;

  return {
    phase,
    decision,
    title,
    summary,
    reasons: reasons.slice(0, 6),
    today: {
      games: todayGames.length,
      wins: todayWins,
      losses: todayGames.length - todayWins,
      wr: todayWr,
    },
    session: {
      games: session.length,
      wins: sessionWins,
      losses: session.length - sessionWins,
      wr: winRate(sessionWins, session.length),
      nextIndex: nextGameNumber,
    },
    lastGame: {
      win: last?.win ?? null,
      championName: last?.championName ?? null,
      matchId: last?.matchId ?? null,
      minutesAgo: last
        ? Math.max(0, Math.round((now - last.createdAt) / 60000))
        : null,
    },
    lp: {
      delta: lpDelta,
      perHour: lpSummary?.lpPerHour ?? null,
      goal: goalProgress.target,
      stopLoss: goalProgress.stopLoss,
      goalHit,
      stopHit,
      gamesRemainingEst: goalProgress.gamesRemainingEst,
      lastMatchDelta,
      queueType: lpSummary?.queueType ?? null,
      queueLabel,
      soloDelta: lpByQueue?.solo.lpDelta ?? null,
      flexDelta: lpByQueue?.flex.lpDelta ?? null,
    },
    sessionEv,
    nextPlan: {
      maxGamesLeft,
      verb:
        maxGamesLeft === 0
          ? "Encerre a sessão de ranked por hoje"
          : maxGamesLeft === 1
            ? "No máximo 1 ranked restante"
            : `No máximo ${maxGamesLeft} rankeds restantes`,
    },
    bestWindowLabel: best?.label ?? null,
    inBestWindow,
    syncedNewMatch,
  };
}

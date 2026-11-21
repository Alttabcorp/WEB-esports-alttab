import {
  findPlayerByPuuid,
  getAppProfile,
  getDayLpSummaryForPlayer,
  getStoredMatchesForPlayer,
  listMatchHistory,
  listRankSnapshots,
  type MatchHistoryRow,
} from "@/lib/db/persist";
import {
  getChampionIdToKey,
  getDdragonVersion,
  getRuneCatalog,
  type RuneCatalog,
} from "@/lib/ddragon";
import {
  analyzePlayer,
  resolveSummonerProfile,
  type AnalyzeResponse,
  type SummonerProfile,
} from "@/lib/riot/analyze";
import { RiotApiError } from "@/lib/riot/client";
import type { PlatformRegion } from "@/lib/riot/regions";
import type { QueueFilter } from "@/lib/riot/types";
import { buildContextualPool, type PoolPick } from "@/lib/stats/contextualPool";
import {
  computeDayGoalProgress,
  type DayGoalProgress,
} from "@/lib/stats/dayGoal";
import {
  buildEndgameBaselines,
  type ChampEndgameBaseline,
} from "@/lib/stats/endgameMetrics";
import {
  buildLpCalendar,
  type DayLpCalendarEntry,
} from "@/lib/stats/lpCalendar";
import type { DayLpSummary } from "@/lib/stats/lpLedger";
import {
  buildMatchLpLedger,
  type MatchLpInsights,
} from "@/lib/stats/matchLpLedger";
import { filterMatchesByRecentPatches } from "@/lib/stats/patchGate";
import type { RoleKey } from "@/lib/stats/roles";
import {
  computeSessionEv,
  type SessionEvResult,
} from "@/lib/stats/sessionEv";
import {
  buildPracticeCandidates,
  type PracticeCandidate,
} from "@/lib/stats/practiceCandidates";
import { SESSION_GAP_MS } from "@/lib/stats/temporal";

export type PrepContextOk = {
  ok: true;
  profile: SummonerProfile;
  analysis: AnalyzeResponse;
  ddragonVersion: string;
  idToKey: Record<number, string>;
  runeCatalog: RuneCatalog;
  matchHistory: MatchHistoryRow[];
  dayLp: DayLpSummary | null;
  todayPool: PoolPick[];
  dayGoal: DayGoalProgress | null;
  sessionEv: SessionEvResult | null;
  lpInsights: MatchLpInsights;
  lpCalendar: DayLpCalendarEntry[];
  endgameBaselines: ChampEndgameBaseline[];
  currentPatch: string | null;
  patchNote: string | null;
  practiceCandidates: PracticeCandidate[];
  isCurrentProfile: boolean;
  queue: QueueFilter;
  count: number;
  source?: "db" | "riot" | "redis";
  cached: boolean;
};

export type PrepContextErr = {
  ok: false;
  kind: "no_profile" | "load_error";
  title: string;
  detail: string;
};

export type PrepContext = PrepContextOk | PrepContextErr;

type LoadOptions = {
  forceRefresh?: boolean;
  queueOverride?: QueueFilter;
  countOverride?: number;
};

async function loadSummonerBundle(
  region: PlatformRegion,
  gameName: string,
  tagLine: string,
  queue: QueueFilter,
  count: number,
  forceRefresh: boolean,
): Promise<
  | {
      ok: true;
      profile: SummonerProfile;
      analysis: AnalyzeResponse;
      ddragonVersion: string;
      idToKey: Record<number, string>;
      runeCatalog: RuneCatalog;
    }
  | { ok: false; title: string; detail: string }
> {
  try {
    const profile = await resolveSummonerProfile(region, gameName, tagLine, {
      preferDb: true,
      forceRefresh,
    });
    const analysis = await analyzePlayer({
      platform: region,
      puuid: profile.puuid,
      queue,
      count,
      profile,
      preferDb: true,
      forceRefresh,
    });
    const ddragonVersion = await getDdragonVersion();
    const [idToKey, runeCatalog] = await Promise.all([
      getChampionIdToKey(ddragonVersion),
      getRuneCatalog(ddragonVersion),
    ]);
    return { ok: true, profile, analysis, ddragonVersion, idToKey, runeCatalog };
  } catch (error) {
    if (error instanceof RiotApiError) {
      if (error.status === 404) {
        return {
          ok: false,
          title: "Invocador não encontrado",
          detail: `Não achamos ${gameName}#${tagLine} em ${region.toUpperCase()}.`,
        };
      }
      if (error.status === 429) {
        return {
          ok: false,
          title: "Rate limit da Riot",
          detail:
            "Muitas requisições. Aguarde alguns segundos e tente de novo.",
        };
      }
      if (error.status === 500 && error.message.includes("RIOT_API_KEY")) {
        return {
          ok: false,
          title: "API key ausente",
          detail: "Crie .env.local com RIOT_API_KEY (veja .env.example).",
        };
      }
      return {
        ok: false,
        title: "Falha na Riot API",
        detail: error.message || `Status ${error.status}`,
      };
    }
    console.error(error);
    return {
      ok: false,
      title: "Erro inesperado",
      detail: "Não foi possível analisar o histórico.",
    };
  }
}

/** Carrega o contexto de preparação a partir do perfil salvo. */
export async function loadPrepContext(
  options: LoadOptions = {},
): Promise<PrepContext> {
  const appProfile = await getAppProfile();
  if (!appProfile) {
    return {
      ok: false,
      kind: "no_profile",
      title: "Configure o perfil",
      detail:
        "Salve seu invocador em Config para usar Preparar, Ranking e Quando.",
    };
  }

  const queue =
    options.queueOverride ?? (appProfile.queue as QueueFilter);
  const count =
    options.countOverride ??
    (Number.isFinite(appProfile.matchCount) ? appProfile.matchCount : 50);
  const forceRefresh = Boolean(options.forceRefresh);

  const bundle = await loadSummonerBundle(
    appProfile.platform as PlatformRegion,
    appProfile.gameName,
    appProfile.tagLine,
    queue,
    count,
    forceRefresh,
  );

  if (!bundle.ok) {
    return {
      ok: false,
      kind: "load_error",
      title: bundle.title,
      detail: bundle.detail,
    };
  }

  const { profile, analysis, ddragonVersion, idToKey, runeCatalog } = bundle;
  const preferredRole =
    (appProfile.preferredRole as RoleKey | undefined) ?? "MIDDLE";

  const dbPlayer = await findPlayerByPuuid(profile.puuid);
  const matchHistory = dbPlayer
    ? await listMatchHistory(dbPlayer.id, profile.puuid, {
        count: 80,
        queue,
      })
    : [];

  const dayLp = dbPlayer
    ? await getDayLpSummaryForPlayer(dbPlayer.id, profile.puuid)
    : null;

  const storedForLp = dbPlayer
    ? await getStoredMatchesForPlayer(dbPlayer.id, {
        count,
        queue,
      })
    : [];
  const snapshots = dbPlayer
    ? await listRankSnapshots(dbPlayer.id, {
        sinceMs: 30 * 24 * 60 * 60_000,
        limit: 400,
      })
    : [];

  const patchGate = filterMatchesByRecentPatches(storedForLp, 1);
  const lpInsights = buildMatchLpLedger({
    matches: patchGate.filtered.length ? patchGate.filtered : storedForLp,
    puuid: profile.puuid,
    snapshots: snapshots.map((s) => ({
      ladderScore: s.ladderScore,
      createdAt: s.createdAt,
    })),
  });
  const lpCalendar = buildLpCalendar({ snapshots, days: 28 });
  const endgameBaselines = buildEndgameBaselines(storedForLp, profile.puuid);
  const patchNote =
    patchGate.currentPatch &&
    patchGate.filtered.length < storedForLp.length
      ? `EV de PDL usa só patch ${patchGate.currentPatch} (${patchGate.filtered.length}/${storedForLp.length} jogos).`
      : null;

  const todayPool = buildContextualPool({
    analysis,
    preferredRole,
    limit: 5,
    avgLpPerWin: lpInsights.avgLpPerWin,
    avgLpPerLoss: lpInsights.avgLpPerLoss,
  });

  const dayGoal = computeDayGoalProgress({
    target: appProfile.dailyLpTarget,
    stopLoss: appProfile.dailyLpStop,
    delta: dayLp?.lpDelta ?? null,
    perHour: dayLp?.lpPerHour ?? null,
    avgLpPerWin: lpInsights.avgLpPerWin,
  });

  const chrono = storedForLp
    .map((m) => {
      const me = m.info.participants.find((p) => p.puuid === profile.puuid);
      if (!me) return null;
      return { createdAt: m.info.gameCreation, win: me.win };
    })
    .filter((g): g is { createdAt: number; win: boolean } => g != null)
    .sort((a, b) => a.createdAt - b.createdAt);
  const now = Date.now();
  let sessionStart = chrono.length;
  for (let i = chrono.length - 1; i >= 0; i--) {
    if (now - chrono[i].createdAt > SESSION_GAP_MS) break;
    sessionStart = i;
  }
  const session = chrono.slice(sessionStart);
  let lossStreak = 0;
  let winStreak = 0;
  for (let i = session.length - 1; i >= 0; i--) {
    if (session[i].win) {
      if (lossStreak > 0) break;
      winStreak += 1;
    } else {
      if (winStreak > 0) break;
      lossStreak += 1;
    }
  }
  const sessionEv = computeSessionEv({
    temporal: analysis.temporal,
    goal: dayGoal,
    nextSessionIndex: session.length + 1,
    lossStreak,
    winStreak,
    topPick: todayPool[0] ?? null,
  });

  const practiceCandidates = buildPracticeCandidates({
    analysis,
    pool: todayPool,
    avgLpPerWin: lpInsights.avgLpPerWin,
    avgLpPerLoss: lpInsights.avgLpPerLoss,
    limit: 4,
  });

  return {
    ok: true,
    profile,
    analysis,
    ddragonVersion,
    idToKey,
    runeCatalog,
    matchHistory,
    dayLp,
    todayPool,
    dayGoal,
    sessionEv,
    lpInsights,
    lpCalendar,
    endgameBaselines,
    currentPatch: patchGate.currentPatch,
    patchNote,
    practiceCandidates,
    isCurrentProfile: true,
    queue,
    count,
    source: analysis.source,
    cached: analysis.cached,
  };
}

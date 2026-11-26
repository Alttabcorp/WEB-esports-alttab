import {
  getCachedAggregate,
  getCachedMatch,
  setCachedAggregate,
  setCachedMatch,
} from "@/lib/cache/matches";
import {
  countStoredMatches,
  findPlayerByIdentity,
  findPlayerByPuuid,
  getFreshAnalysisRun,
  getLatestAnalysisRun,
  getMatchFromDb,
  getStoredMatchesForPlayer,
  persistAnalysisRun,
  persistMatchesForPlayer,
  upsertPlayer,
} from "@/lib/db/persist";
import { aggregatePlayerMatches, type AggregateResult } from "@/lib/stats/aggregate";
import {
  clampMatchCount,
  MAX_ANALYSIS_MATCHES,
  RECENT_SYNC_COUNT,
  RIOT_MATCH_PAGE_SIZE,
} from "@/lib/stats/limits";
import { getRiotClient, resolveRouting } from "./client";
import type { PlatformRegion } from "./regions";
import type { LeagueEntryDto, MatchDto, QueueFilter, SummonerDto } from "./types";
import { QUEUE_IDS } from "./types";
import type { RoutingRegion } from "./regions";

export type AnalyzePurpose = "self" | "reference";

export type AnalyzeOptions = {
  platform: PlatformRegion;
  puuid: string;
  queue?: QueueFilter;
  count?: number;
  /** When provided, skips Riot identity calls for persistence upsert. */
  profile?: SummonerProfile;
  /** Força baixar IDs/partidas novas na Riot (ignora preferência de DB). */
  forceRefresh?: boolean;
  /**
   * Prefere análise/partidas já no Postgres (padrão true).
   * Só chama Riot se não houver dados locais suficientes.
   */
  preferDb?: boolean;
  /**
   * `self` = perfil principal (PDL/snapshots).
   * `reference` = mono externo — grava PlayerMatch deles, sem RankSnapshot do eu.
   */
  purpose?: AnalyzePurpose;
};

export type AnalyzeResponse = AggregateResult & {
  cached: boolean;
  matchIdsFetched: number;
  queue: QueueFilter;
  source?: "db" | "riot" | "redis";
};

async function fetchMatchIdPages(
  routing: RoutingRegion,
  puuid: string,
  total: number,
  queue?: number,
): Promise<string[]> {
  const client = getRiotClient();
  const ids: string[] = [];
  let start = 0;
  while (ids.length < total) {
    const pageSize = Math.min(RIOT_MATCH_PAGE_SIZE, total - ids.length);
    const page = await client.getMatchIdsByPuuid(routing, puuid, {
      start,
      count: pageSize,
      queue,
    });
    if (page.length === 0) break;
    ids.push(...page);
    if (page.length < pageSize) break;
    start += page.length;
  }
  return ids;
}

export async function fetchMatchesForPlayer(
  options: AnalyzeOptions,
): Promise<{ matches: MatchDto[]; matchIds: string[] }> {
  const client = getRiotClient();
  const routing = resolveRouting(options.platform);
  const count = clampMatchCount(options.count);
  const queue = options.queue ?? "ranked";

  let matchIds: string[] = [];

  if (queue === "all") {
    matchIds = await fetchMatchIdPages(routing, options.puuid, count);
  } else if (queue === "ranked") {
    const [solo, flex] = await Promise.all([
      fetchMatchIdPages(routing, options.puuid, count, 420),
      fetchMatchIdPages(routing, options.puuid, count, 440),
    ]);
    matchIds = mergeNewestFirst(solo, flex).slice(0, count);
  } else {
    const queueIds = QUEUE_IDS[queue];
    const batches = await Promise.all(
      queueIds.map((q) =>
        fetchMatchIdPages(routing, options.puuid, count, q),
      ),
    );
    matchIds = mergeNewestFirst(batches.flat(), []).slice(0, count);
  }

  const matches: MatchDto[] = [];
  for (const matchId of matchIds) {
    const fromRedis = await getCachedMatch(matchId);
    if (fromRedis) {
      matches.push(fromRedis);
      continue;
    }

    const fromDb = await getMatchFromDb(matchId);
    if (fromDb) {
      await setCachedMatch(matchId, fromDb);
      matches.push(fromDb);
      continue;
    }

    const match = await client.getMatch(routing, matchId);
    await setCachedMatch(matchId, match);
    matches.push(match);
  }

  return { matches, matchIds };
}

export async function analyzePlayer(
  options: AnalyzeOptions,
): Promise<AnalyzeResponse> {
  const queue = options.queue ?? "ranked";
  const count = clampMatchCount(options.count);
  const forceRefresh = options.forceRefresh === true;
  const preferDb = options.preferDb !== false;
  const purpose: AnalyzePurpose = options.purpose ?? "self";
  const recordRank = purpose === "self";
  // Histórico acumulado no banco — não fragmentar cache pelo matchCount de bootstrap.
  const cacheKey = `${options.puuid}:${options.platform}:${queue}:accum:v4`;

  if (!forceRefresh) {
    const cachedRedis = await getCachedAggregate<AnalyzeResponse>(cacheKey);
    if (cachedRedis?.temporal?.byDayOfWeek?.length) {
      return {
        ...cachedRedis,
        cached: true,
        source: cachedRedis.source ?? "redis",
      };
    }
  }

  let playerId: string | null = null;

  if (options.profile && (!preferDb || forceRefresh)) {
    const player = await upsertPlayer({
      puuid: options.profile.puuid,
      gameName: options.profile.gameName,
      tagLine: options.profile.tagLine,
      platform: options.profile.platform,
      summoner: options.profile.summoner,
      ranked: options.profile.ranked,
      recordRank,
      rankSource: purpose === "reference" ? "reference-sync" : "sync",
    });
    playerId = player.id;
  } else if (options.profile) {
    const existing = await findPlayerByPuuid(options.puuid);
    if (existing) {
      playerId = existing.id;
    } else {
      const player = await upsertPlayer({
        puuid: options.profile.puuid,
        gameName: options.profile.gameName,
        tagLine: options.profile.tagLine,
        platform: options.profile.platform,
        summoner: options.profile.summoner,
        ranked: options.profile.ranked,
        recordRank,
        rankSource: purpose === "reference" ? "reference-sync" : "sync",
      });
      playerId = player.id;
    }
  } else {
    const existing = await findPlayerByPuuid(options.puuid);
    playerId = existing?.id ?? null;
  }

  if (playerId && !forceRefresh) {
    if (preferDb) {
      const stored = await getStoredMatchesForPlayer(playerId, {
        count: MAX_ANALYSIS_MATCHES,
        queue,
        forAnalysis: true,
      });
      if (stored.length > 0) {
        const stats = aggregatePlayerMatches(stored, options.puuid);
        const result: AnalyzeResponse = {
          ...stats,
          cached: true,
          matchIdsFetched: stored.length,
          queue,
          source: "db",
        };
        await persistAnalysisRun({
          playerId,
          queue,
          count: stored.length,
          stats,
        });
        await setCachedAggregate(cacheKey, result);
        return result;
      }

      const latest = await getLatestAnalysisRun(playerId, queue, count, {
        allowNearbyCount: true,
      });
      if (latest && latest.analyzedGames > 0 && latest.temporal?.byDayOfWeek?.length) {
        await setCachedAggregate(cacheKey, latest);
        return latest;
      }
    } else {
      const fresh = await getFreshAnalysisRun(playerId, queue, count);
      if (fresh?.temporal?.byDayOfWeek?.length) {
        await setCachedAggregate(cacheKey, fresh);
        return fresh;
      }
    }
  }

  // Bootstrap: se o banco ainda é menor que o matchCount do perfil, puxa o lote inicial.
  // Depois: só recentes (RECENT_SYNC_COUNT) e analisa o histórico acumulado no Postgres.
  let fetchCount = count;
  if (playerId) {
    const storedCount = await countStoredMatches(playerId, queue);
    if (storedCount >= count) {
      fetchCount = Math.min(RECENT_SYNC_COUNT, count);
    }
  }

  const { matches, matchIds } = await fetchMatchesForPlayer({
    ...options,
    queue,
    count: fetchCount,
  });

  if (playerId) {
    await persistMatchesForPlayer(playerId, options.puuid, matches);
  }

  const analysisMatches =
    playerId != null
      ? await getStoredMatchesForPlayer(playerId, {
          count: MAX_ANALYSIS_MATCHES,
          queue,
          forAnalysis: true,
        })
      : matches;

  const stats = aggregatePlayerMatches(analysisMatches, options.puuid);
  const result: AnalyzeResponse = {
    ...stats,
    cached: false,
    matchIdsFetched: matchIds.length,
    queue,
    source: "riot",
  };

  if (playerId) {
    await persistAnalysisRun({
      playerId,
      queue,
      count: analysisMatches.length,
      stats,
    });
  }

  await setCachedAggregate(cacheKey, result);
  return result;
}

export type SummonerProfile = {
  gameName: string;
  tagLine: string;
  puuid: string;
  platform: PlatformRegion;
  summoner: SummonerDto | null;
  ranked: LeagueEntryDto[];
};

export async function resolveSummonerProfile(
  platform: PlatformRegion,
  gameName: string,
  tagLine: string,
  options?: {
    preferDb?: boolean;
    forceRefresh?: boolean;
    purpose?: AnalyzePurpose;
  },
): Promise<SummonerProfile> {
  const preferDb = options?.preferDb !== false;
  const forceRefresh = options?.forceRefresh === true;
  const purpose: AnalyzePurpose = options?.purpose ?? "self";
  const recordRank = purpose === "self";

  if (preferDb && !forceRefresh) {
    const fromDb = await resolveSummonerFromDb(platform, gameName, tagLine);
    if (fromDb) return fromDb;
  }

  const client = getRiotClient();
  const routing = resolveRouting(platform);
  const account = await client.getAccountByRiotId(routing, gameName, tagLine);

  let summoner: SummonerDto | null = null;
  let ranked: LeagueEntryDto[] = [];

  try {
    summoner = await client.getSummonerByPuuid(platform, account.puuid);
  } catch {
    summoner = null;
  }

  try {
    ranked = await client.getLeagueEntriesByPuuid(platform, account.puuid);
  } catch {
    ranked = [];
  }

  const profile: SummonerProfile = {
    gameName: account.gameName,
    tagLine: account.tagLine,
    puuid: account.puuid,
    platform,
    summoner,
    ranked,
  };

  await upsertPlayer({
    puuid: profile.puuid,
    gameName: profile.gameName,
    tagLine: profile.tagLine,
    platform: profile.platform,
    summoner: profile.summoner,
    ranked: profile.ranked,
    recordRank,
    rankSource: purpose === "reference" ? "reference-sync" : "sync",
  });

  return profile;
}

/** Identidade + ranked a partir do Player no Postgres. */
export async function resolveSummonerFromDb(
  platform: PlatformRegion,
  gameName: string,
  tagLine: string,
): Promise<SummonerProfile | null> {
  const player = await findPlayerByIdentity(platform, gameName, tagLine);
  if (!player) return null;

  const ranked = (player.rankedJson as LeagueEntryDto[] | null) ?? [];
  const summoner: SummonerDto | null =
    player.profileIconId != null
      ? {
          id: "",
          accountId: "",
          puuid: player.puuid,
          profileIconId: player.profileIconId,
          revisionDate: 0,
          summonerLevel: player.summonerLevel ?? 0,
        }
      : null;

  return {
    gameName: player.gameName,
    tagLine: player.tagLine,
    puuid: player.puuid,
    platform: player.platform as PlatformRegion,
    summoner,
    ranked,
  };
}

export function parseRiotId(
  input: string,
): { gameName: string; tagLine: string } | null {
  const trimmed = input.trim();
  const hash = trimmed.lastIndexOf("#");
  if (hash <= 0 || hash === trimmed.length - 1) return null;
  const gameName = trimmed.slice(0, hash).trim();
  const tagLine = trimmed.slice(hash + 1).trim();
  if (!gameName || !tagLine) return null;
  return { gameName, tagLine };
}

function matchIdNumeric(id: string): number {
  const part = id.split("_").pop() ?? id;
  const n = Number(part);
  return Number.isFinite(n) ? n : 0;
}

function mergeNewestFirst(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  return [...a, ...b]
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((x, y) => matchIdNumeric(y) - matchIdNumeric(x));
}

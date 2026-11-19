import {
  getCachedAggregate,
  getCachedMatch,
  setCachedAggregate,
  setCachedMatch,
} from "@/lib/cache/matches";
import {
  findPlayerByPuuid,
  getFreshAnalysisRun,
  getMatchFromDb,
  persistAnalysisRun,
  persistMatchesForPlayer,
  upsertPlayer,
} from "@/lib/db/persist";
import { aggregatePlayerMatches, type AggregateResult } from "@/lib/stats/aggregate";
import { getRiotClient, resolveRouting } from "./client";
import type { PlatformRegion } from "./regions";
import type { LeagueEntryDto, MatchDto, QueueFilter, SummonerDto } from "./types";
import { QUEUE_IDS } from "./types";

export type AnalyzeOptions = {
  platform: PlatformRegion;
  puuid: string;
  queue?: QueueFilter;
  count?: number;
  /** When provided, skips Riot identity calls for persistence upsert. */
  profile?: SummonerProfile;
};

export type AnalyzeResponse = AggregateResult & {
  cached: boolean;
  matchIdsFetched: number;
  queue: QueueFilter;
};

export async function fetchMatchesForPlayer(
  options: AnalyzeOptions,
): Promise<{ matches: MatchDto[]; matchIds: string[] }> {
  const client = getRiotClient();
  const routing = resolveRouting(options.platform);
  const count = Math.min(Math.max(options.count ?? 50, 1), 100);
  const queue = options.queue ?? "ranked";

  let matchIds: string[] = [];

  if (queue === "all") {
    matchIds = await client.getMatchIdsByPuuid(routing, options.puuid, {
      count,
    });
  } else if (queue === "ranked") {
    const [solo, flex] = await Promise.all([
      client.getMatchIdsByPuuid(routing, options.puuid, {
        count,
        queue: 420,
      }),
      client.getMatchIdsByPuuid(routing, options.puuid, {
        count,
        queue: 440,
      }),
    ]);
    matchIds = mergeNewestFirst(solo, flex).slice(0, count);
  } else {
    const queueIds = QUEUE_IDS[queue];
    const batches = await Promise.all(
      queueIds.map((q) =>
        client.getMatchIdsByPuuid(routing, options.puuid, {
          count,
          queue: q,
        }),
      ),
    );
    matchIds = batches.flat().slice(0, count);
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
  const count = Math.min(Math.max(options.count ?? 50, 1), 100);
  const cacheKey = `${options.puuid}:${options.platform}:${queue}:${count}`;

  const cachedRedis = await getCachedAggregate<AnalyzeResponse>(cacheKey);
  if (cachedRedis) {
    return { ...cachedRedis, cached: true };
  }

  let playerId: string | null = null;

  if (options.profile) {
    const player = await upsertPlayer({
      puuid: options.profile.puuid,
      gameName: options.profile.gameName,
      tagLine: options.profile.tagLine,
      platform: options.profile.platform,
      summoner: options.profile.summoner,
      ranked: options.profile.ranked,
    });
    playerId = player.id;
  } else {
    const existing = await findPlayerByPuuid(options.puuid);
    playerId = existing?.id ?? null;
  }

  if (playerId) {
    const fresh = await getFreshAnalysisRun(playerId, queue, count);
    if (fresh) {
      await setCachedAggregate(cacheKey, fresh);
      return fresh;
    }
  }

  const { matches, matchIds } = await fetchMatchesForPlayer({
    ...options,
    queue,
    count,
  });

  const stats = aggregatePlayerMatches(matches, options.puuid);
  const result: AnalyzeResponse = {
    ...stats,
    cached: false,
    matchIdsFetched: matchIds.length,
    queue,
  };

  if (playerId) {
    await persistMatchesForPlayer(playerId, options.puuid, matches);
    await persistAnalysisRun({
      playerId,
      queue,
      count,
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
): Promise<SummonerProfile> {
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
  });

  return profile;
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

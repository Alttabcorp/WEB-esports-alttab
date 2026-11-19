import type { MatchDto } from "@/lib/riot/types";
import { redisGetJson, redisSetJson } from "./redis";

const MATCH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const AGGREGATE_TTL_SECONDS = 20 * 60; // 20 minutes
export const AGGREGATE_TTL_MS = AGGREGATE_TTL_SECONDS * 1000;

function matchKey(matchId: string): string {
  return `lol:match:${matchId}`;
}

function aggregateKey(key: string): string {
  return `lol:agg:${key}`;
}

export async function getCachedMatch(
  matchId: string,
): Promise<MatchDto | null> {
  return redisGetJson<MatchDto>(matchKey(matchId));
}

export async function setCachedMatch(
  matchId: string,
  match: MatchDto,
): Promise<void> {
  await redisSetJson(matchKey(matchId), match, MATCH_TTL_SECONDS);
}

export async function getCachedAggregate<T>(key: string): Promise<T | null> {
  return redisGetJson<T>(aggregateKey(key));
}

export async function setCachedAggregate<T>(
  key: string,
  data: T,
): Promise<void> {
  await redisSetJson(aggregateKey(key), data, AGGREGATE_TTL_SECONDS);
}

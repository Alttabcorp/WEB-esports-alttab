import type { MatchDto, MatchParticipant } from "@/lib/riot/types";
import { buildFingerprint } from "./builds";
import {
  MIN_SAMPLE_FOR_RECOMMENDATION,
  confidenceFromSample,
  type ConfidenceLevel,
  wilsonLowerBound,
  winRate,
} from "./wilson";
import { type RoleKey, normalizeRole } from "./roles";

export type StatBucket = {
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  cs: number;
  vision: number;
  durationSec: number;
};

export type RankedStat = StatBucket & {
  wr: number;
  wilsonLower: number;
  lift: number;
  confidence: ConfidenceLevel;
  kda: number;
  csPerMin: number;
  avgDamage: number;
};

export type ChampionInsight = RankedStat & {
  championId: number;
  championName: string;
  topBuilds: BuildInsight[];
  matchups: MatchupInsight[];
};

export type BuildInsight = RankedStat & {
  fingerprint: string;
  items: number[];
  championId: number;
};

export type MatchupInsight = RankedStat & {
  myChampionId: number;
  enemyChampionId: number;
  enemyChampionName: string;
  role: RoleKey;
};

export type RoleInsight = RankedStat & {
  role: RoleKey;
};

export type AggregateResult = {
  analyzedGames: number;
  wins: number;
  losses: number;
  overallWr: number;
  champions: ChampionInsight[];
  roles: RoleInsight[];
  topRecommendations: ChampionInsight[];
  bestMatchups: MatchupInsight[];
  worstMatchups: MatchupInsight[];
};

function emptyBucket(): StatBucket {
  return {
    games: 0,
    wins: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    damage: 0,
    cs: 0,
    vision: 0,
    durationSec: 0,
  };
}

function addGame(bucket: StatBucket, p: MatchParticipant, duration: number) {
  bucket.games += 1;
  if (p.win) bucket.wins += 1;
  bucket.kills += p.kills;
  bucket.deaths += p.deaths;
  bucket.assists += p.assists;
  bucket.damage += p.totalDamageDealtToChampions;
  bucket.cs += p.totalMinionsKilled + p.neutralMinionsKilled;
  bucket.vision += p.visionScore;
  bucket.durationSec += duration;
}

function finalize(bucket: StatBucket, baselineWr: number): RankedStat {
  const wr = winRate(bucket.wins, bucket.games);
  const deaths = Math.max(bucket.deaths, 1);
  const minutes = Math.max(bucket.durationSec / 60, 1);
  return {
    ...bucket,
    wr,
    wilsonLower: wilsonLowerBound(bucket.wins, bucket.games),
    lift: wr - baselineWr,
    confidence: confidenceFromSample(bucket.games),
    kda: (bucket.kills + bucket.assists) / deaths,
    csPerMin: bucket.cs / minutes,
    avgDamage: bucket.games ? bucket.damage / bucket.games : 0,
  };
}

function participantItems(p: MatchParticipant): number[] {
  return [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5];
}

function findLanerEnemy(
  match: MatchDto,
  me: MatchParticipant,
): MatchParticipant | null {
  const myRole = normalizeRole(me.teamPosition, me.individualPosition);
  if (myRole === "UNKNOWN") return null;

  return (
    match.info.participants.find((p) => {
      if (p.teamId === me.teamId) return false;
      return normalizeRole(p.teamPosition, p.individualPosition) === myRole;
    }) ?? null
  );
}

export function aggregatePlayerMatches(
  matches: MatchDto[],
  puuid: string,
): AggregateResult {
  const champMap = new Map<
    number,
    { name: string; bucket: StatBucket; builds: Map<string, StatBucket> }
  >();
  const roleMap = new Map<RoleKey, StatBucket>();
  const matchupMap = new Map<
    string,
    {
      myChampionId: number;
      enemyChampionId: number;
      enemyChampionName: string;
      role: RoleKey;
      bucket: StatBucket;
    }
  >();

  const overall = emptyBucket();

  for (const match of matches) {
    const me = match.info.participants.find((p) => p.puuid === puuid);
    if (!me) continue;

    const duration = match.info.gameDuration || me.timePlayed || 0;
    addGame(overall, me, duration);

    const role = normalizeRole(me.teamPosition, me.individualPosition);
    if (!roleMap.has(role)) roleMap.set(role, emptyBucket());
    addGame(roleMap.get(role)!, me, duration);

    if (!champMap.has(me.championId)) {
      champMap.set(me.championId, {
        name: me.championName,
        bucket: emptyBucket(),
        builds: new Map(),
      });
    }
    const champ = champMap.get(me.championId)!;
    addGame(champ.bucket, me, duration);

    const fp = buildFingerprint(participantItems(me));
    if (!champ.builds.has(fp)) champ.builds.set(fp, emptyBucket());
    addGame(champ.builds.get(fp)!, me, duration);

    const enemy = findLanerEnemy(match, me);
    if (enemy && role !== "UNKNOWN") {
      const key = `${me.championId}:${enemy.championId}:${role}`;
      if (!matchupMap.has(key)) {
        matchupMap.set(key, {
          myChampionId: me.championId,
          enemyChampionId: enemy.championId,
          enemyChampionName: enemy.championName,
          role,
          bucket: emptyBucket(),
        });
      }
      addGame(matchupMap.get(key)!.bucket, me, duration);
    }
  }

  const baselineWr = winRate(overall.wins, overall.games);

  const champions: ChampionInsight[] = [...champMap.entries()]
    .map(([championId, data]) => {
      const base = finalize(data.bucket, baselineWr);
      const topBuilds: BuildInsight[] = [...data.builds.entries()]
        .map(([fingerprint, bucket]) => ({
          ...finalize(bucket, baselineWr),
          fingerprint,
          items: fingerprint === "empty" ? [] : fingerprint.split("-").map(Number),
          championId,
        }))
        .filter((b) => b.fingerprint !== "empty")
        .sort((a, b) => b.wilsonLower - a.wilsonLower)
        .slice(0, 5);

      const matchups: MatchupInsight[] = [...matchupMap.values()]
        .filter((m) => m.myChampionId === championId)
        .map((m) => ({
          ...finalize(m.bucket, baselineWr),
          myChampionId: m.myChampionId,
          enemyChampionId: m.enemyChampionId,
          enemyChampionName: m.enemyChampionName,
          role: m.role,
        }))
        .sort((a, b) => b.wilsonLower - a.wilsonLower);

      return {
        ...base,
        championId,
        championName: data.name,
        topBuilds,
        matchups,
      };
    })
    .sort((a, b) => b.wilsonLower - a.wilsonLower);

  const roles: RoleInsight[] = [...roleMap.entries()]
    .map(([role, bucket]) => ({
      ...finalize(bucket, baselineWr),
      role,
    }))
    .sort((a, b) => b.wilsonLower - a.wilsonLower);

  const allMatchups: MatchupInsight[] = [...matchupMap.values()]
    .map((m) => ({
      ...finalize(m.bucket, baselineWr),
      myChampionId: m.myChampionId,
      enemyChampionId: m.enemyChampionId,
      enemyChampionName: m.enemyChampionName,
      role: m.role,
    }))
    .filter((m) => m.games >= MIN_SAMPLE_FOR_RECOMMENDATION);

  const bestMatchups = [...allMatchups]
    .sort((a, b) => b.wilsonLower - a.wilsonLower)
    .slice(0, 8);
  const worstMatchups = [...allMatchups]
    .sort((a, b) => a.wilsonLower - b.wilsonLower)
    .slice(0, 8);

  const topRecommendations = champions
    .filter((c) => c.games >= MIN_SAMPLE_FOR_RECOMMENDATION)
    .sort((a, b) => {
      const scoreA = a.wilsonLower + Math.max(0, a.lift) * 0.25;
      const scoreB = b.wilsonLower + Math.max(0, b.lift) * 0.25;
      return scoreB - scoreA;
    })
    .slice(0, 5);

  return {
    analyzedGames: overall.games,
    wins: overall.wins,
    losses: overall.games - overall.wins,
    overallWr: baselineWr,
    champions,
    roles,
    topRecommendations,
    bestMatchups,
    worstMatchups,
  };
}

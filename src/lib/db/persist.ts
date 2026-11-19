import { Prisma } from "@/generated/prisma/client";
import { AGGREGATE_TTL_MS } from "@/lib/cache/matches";
import { db } from "@/lib/db";
import type { AggregateResult } from "@/lib/stats/aggregate";
import { normalizeRole } from "@/lib/stats/roles";
import type { PlatformRegion } from "@/lib/riot/regions";
import type {
  LeagueEntryDto,
  MatchDto,
  QueueFilter,
  SummonerDto,
} from "@/lib/riot/types";

export type StoredAnalyzeResponse = AggregateResult & {
  cached: boolean;
  matchIdsFetched: number;
  queue: QueueFilter;
};

export async function findPlayerByPuuid(puuid: string) {
  return db.player.findUnique({ where: { puuid } });
}

export async function upsertPlayer(input: {
  puuid: string;
  gameName: string;
  tagLine: string;
  platform: PlatformRegion;
  summoner: SummonerDto | null;
  ranked: LeagueEntryDto[];
}) {
  return db.player.upsert({
    where: { puuid: input.puuid },
    create: {
      puuid: input.puuid,
      gameName: input.gameName,
      tagLine: input.tagLine,
      platform: input.platform,
      profileIconId: input.summoner?.profileIconId ?? null,
      summonerLevel: input.summoner?.summonerLevel ?? null,
      rankedJson: input.ranked as unknown as Prisma.InputJsonValue,
    },
    update: {
      gameName: input.gameName,
      tagLine: input.tagLine,
      platform: input.platform,
      profileIconId: input.summoner?.profileIconId ?? null,
      summonerLevel: input.summoner?.summonerLevel ?? null,
      rankedJson: input.ranked as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function getFreshAnalysisRun(
  playerId: string,
  queue: QueueFilter,
  count: number,
): Promise<StoredAnalyzeResponse | null> {
  const cutoff = new Date(Date.now() - AGGREGATE_TTL_MS);
  const run = await db.analysisRun.findFirst({
    where: {
      playerId,
      queue,
      count,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!run) return null;

  const result = run.result as unknown as AggregateResult;
  return {
    ...result,
    cached: true,
    matchIdsFetched: run.analyzedGames,
    queue,
  };
}

export async function persistMatchesForPlayer(
  playerId: string,
  puuid: string,
  matches: MatchDto[],
): Promise<void> {
  for (const match of matches) {
    const me = match.info.participants.find((p) => p.puuid === puuid);
    const saved = await db.match.upsert({
      where: { matchId: match.metadata.matchId },
      create: {
        matchId: match.metadata.matchId,
        queueId: match.info.queueId,
        gameCreation: BigInt(match.info.gameCreation),
        gameDuration: match.info.gameDuration,
        payload: match as unknown as Prisma.InputJsonValue,
      },
      update: {
        queueId: match.info.queueId,
        gameCreation: BigInt(match.info.gameCreation),
        gameDuration: match.info.gameDuration,
        payload: match as unknown as Prisma.InputJsonValue,
      },
    });

    if (!me) continue;

    await db.playerMatch.upsert({
      where: {
        playerId_matchId: {
          playerId,
          matchId: saved.id,
        },
      },
      create: {
        playerId,
        matchId: saved.id,
        championId: me.championId,
        win: me.win,
        role: normalizeRole(me.teamPosition, me.individualPosition),
        items: [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5],
      },
      update: {
        championId: me.championId,
        win: me.win,
        role: normalizeRole(me.teamPosition, me.individualPosition),
        items: [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5],
      },
    });
  }
}

export async function persistAnalysisRun(input: {
  playerId: string;
  queue: QueueFilter;
  count: number;
  stats: AggregateResult;
}): Promise<void> {
  const run = await db.analysisRun.create({
    data: {
      playerId: input.playerId,
      queue: input.queue,
      count: input.count,
      analyzedGames: input.stats.analyzedGames,
      wins: input.stats.wins,
      overallWr: input.stats.overallWr,
      result: input.stats as unknown as Prisma.InputJsonValue,
      championStats: {
        create: input.stats.champions.map((c) => ({
          championId: c.championId,
          championName: c.championName,
          games: c.games,
          wins: c.wins,
          wr: c.wr,
          wilsonLower: c.wilsonLower,
          lift: c.lift,
          confidence: c.confidence,
          kda: c.kda,
          csPerMin: c.csPerMin,
          avgDamage: c.avgDamage,
        })),
      },
      buildStats: {
        create: input.stats.champions.flatMap((c) =>
          c.topBuilds.map((b) => ({
            championId: c.championId,
            fingerprint: b.fingerprint,
            items: b.items,
            games: b.games,
            wins: b.wins,
            wr: b.wr,
            wilsonLower: b.wilsonLower,
            lift: b.lift,
            confidence: b.confidence,
          })),
        ),
      },
      matchupStats: {
        create: [
          ...input.stats.bestMatchups,
          ...input.stats.worstMatchups,
        ].map((m) => ({
          myChampionId: m.myChampionId,
          enemyChampionId: m.enemyChampionId,
          enemyChampionName: m.enemyChampionName,
          role: m.role,
          games: m.games,
          wins: m.wins,
          wr: m.wr,
          wilsonLower: m.wilsonLower,
          lift: m.lift,
          confidence: m.confidence,
        })),
      },
      roleStats: {
        create: input.stats.roles.map((r) => ({
          role: r.role,
          games: r.games,
          wins: r.wins,
          wr: r.wr,
          wilsonLower: r.wilsonLower,
          lift: r.lift,
          confidence: r.confidence,
          kda: r.kda,
        })),
      },
    },
  });

  void run;
}

export async function getMatchFromDb(
  matchId: string,
): Promise<MatchDto | null> {
  const row = await db.match.findUnique({ where: { matchId } });
  if (!row) return null;
  return row.payload as unknown as MatchDto;
}

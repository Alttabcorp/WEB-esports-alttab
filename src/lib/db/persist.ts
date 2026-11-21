import { Prisma } from "@/generated/prisma/client";
import { AGGREGATE_TTL_MS } from "@/lib/cache/matches";
import { db } from "@/lib/db";
import {
  findAllies,
  findLanerEnemy,
  type AggregateResult,
} from "@/lib/stats/aggregate";
import { extractRunesFromParticipant, parseRuneFingerprint } from "@/lib/stats/runes";
import { extractSpells } from "@/lib/stats/spells";
import { normalizeRole, type RoleKey } from "@/lib/stats/roles";
import { buildFingerprint } from "@/lib/stats/builds";
import type { PlatformRegion } from "@/lib/riot/regions";
import type {
  LeagueEntryDto,
  MatchDto,
  QueueFilter,
  SummonerDto,
} from "@/lib/riot/types";
import { QUEUE_IDS } from "@/lib/riot/types";
import { clampMatchCount } from "@/lib/stats/limits";
import {
  PLAYER_TIMEZONE,
  patchFromGameVersion,
  type TemporalInsights,
} from "@/lib/stats/temporal";
import { winRate } from "@/lib/stats/wilson";

export type StoredAnalyzeResponse = AggregateResult & {
  cached: boolean;
  matchIdsFetched: number;
  queue: QueueFilter;
  source?: "db" | "riot" | "redis";
};

export async function findPlayerByPuuid(puuid: string) {
  return db.player.findUnique({ where: { puuid } });
}

export async function findPlayerByIdentity(
  platform: string,
  gameName: string,
  tagLine: string,
) {
  const exact = await db.player.findFirst({
    where: { platform, gameName, tagLine },
  });
  if (exact) return exact;

  const candidates = await db.player.findMany({ where: { platform } });
  const gn = gameName.toLowerCase();
  const tl = tagLine.toLowerCase();
  return (
    candidates.find(
      (p) =>
        p.gameName.toLowerCase() === gn && p.tagLine.toLowerCase() === tl,
    ) ?? null
  );
}

export async function countStoredMatches(
  playerId: string,
  queue: QueueFilter = "ranked",
): Promise<number> {
  const queueFilter =
    queue === "all"
      ? undefined
      : { queueId: { in: QUEUE_IDS[queue] } };

  return db.playerMatch.count({
    where: {
      playerId,
      ...(queueFilter ? { match: queueFilter } : {}),
    },
  });
}

/** Partidas já persistidas — sem chamar a Riot. */
export async function getStoredMatchesForPlayer(
  playerId: string,
  options: { count: number; queue: QueueFilter },
): Promise<MatchDto[]> {
  const queueFilter =
    options.queue === "all"
      ? undefined
      : { queueId: { in: QUEUE_IDS[options.queue] } };

  const rows = await db.playerMatch.findMany({
    where: {
      playerId,
      ...(queueFilter ? { match: queueFilter } : {}),
    },
    include: { match: true },
    orderBy: { match: { gameCreation: "desc" } },
    take: clampMatchCount(options.count),
  });

  return rows.map((r) => r.match.payload as unknown as MatchDto);
}

export type MatchHistoryRow = {
  matchId: string;
  gameCreation: number;
  gameDuration: number;
  queueId: number;
  patch: string;
  win: boolean;
  championId: number;
  championName: string;
  role: RoleKey;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  items: number[];
  enemyChampionId: number | null;
  enemyChampionName: string | null;
  /** Detalhes extras (expandível na UI). */
  champLevel: number;
  goldEarned: number;
  damageToChamps: number;
  visionScore: number;
  summoner1Id: number | null;
  summoner2Id: number | null;
  killParticipation: number | null;
  teamKills: number | null;
};

/** Histórico recente a partir do Postgres (sem Riot). */
export async function listMatchHistory(
  playerId: string,
  puuid: string,
  options: { count?: number; queue?: QueueFilter } = {},
): Promise<MatchHistoryRow[]> {
  const count = Math.min(Math.max(options.count ?? 30, 1), 80);
  const queue = options.queue ?? "ranked";
  const queueFilter =
    queue === "all" ? undefined : { queueId: { in: QUEUE_IDS[queue] } };

  const rows = await db.playerMatch.findMany({
    where: {
      playerId,
      ...(queueFilter ? { match: queueFilter } : {}),
    },
    include: { match: true },
    orderBy: { match: { gameCreation: "desc" } },
    take: count,
  });

  const out: MatchHistoryRow[] = [];
  for (const row of rows) {
    const dto = row.match.payload as unknown as MatchDto;
    const me = dto.info.participants.find((p) => p.puuid === puuid);
    if (!me) continue;
    const enemyId = row.enemyChampionId;
    const enemy =
      enemyId != null
        ? dto.info.participants.find((p) => p.championId === enemyId)
        : null;
    const teammates = dto.info.participants.filter(
      (p) => p.teamId === me.teamId,
    );
    const teamKills = teammates.reduce((s, p) => s + p.kills, 0);
    const kp =
      teamKills > 0
        ? Math.round(((me.kills + me.assists) / teamKills) * 100)
        : null;
    out.push({
      matchId: row.match.matchId,
      gameCreation: Number(row.match.gameCreation),
      gameDuration: row.match.gameDuration,
      queueId: row.match.queueId,
      patch: patchFromGameVersion(
        row.match.gameVersion ?? dto.info.gameVersion,
      ),
      win: row.win,
      championId: row.championId,
      championName: me.championName,
      role: normalizeRole(me.teamPosition, me.individualPosition),
      kills: me.kills,
      deaths: me.deaths,
      assists: me.assists,
      cs: me.totalMinionsKilled + me.neutralMinionsKilled,
      items: row.items.filter((id) => id > 0),
      enemyChampionId: enemyId,
      enemyChampionName: enemy?.championName ?? null,
      champLevel: me.champLevel ?? 0,
      goldEarned: me.goldEarned ?? 0,
      damageToChamps: me.totalDamageDealtToChampions ?? 0,
      visionScore: me.visionScore ?? 0,
      summoner1Id: me.summoner1Id ?? null,
      summoner2Id: me.summoner2Id ?? null,
      killParticipation: kp,
      teamKills,
    });
  }
  return out;
}

export async function upsertPlayer(input: {
  puuid: string;
  gameName: string;
  tagLine: string;
  platform: PlatformRegion;
  summoner: SummonerDto | null;
  ranked: LeagueEntryDto[];
  rankSource?: string;
  /**
   * Quando false (ex.: sync de referência), não grava RankSnapshot.
   * Stats/PDL do “eu” só usam snapshots do AppProfile.
   */
  recordRank?: boolean;
}) {
  const player = await db.player.upsert({
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

  if (input.recordRank !== false) {
    await recordRankSnapshots(
      player.id,
      input.ranked,
      input.rankSource ?? "sync",
    );
  }
  return player;
}

export async function recordRankSnapshots(
  playerId: string,
  ranked: LeagueEntryDto[],
  source = "sync",
): Promise<void> {
  const { entryToRankPoint, SOLO_QUEUE, FLEX_QUEUE } = await import(
    "@/lib/stats/lpLedger"
  );
  const wanted = ranked.filter(
    (e) => e.queueType === SOLO_QUEUE || e.queueType === FLEX_QUEUE,
  );
  if (wanted.length === 0) return;

  for (const entry of wanted) {
    const point = entryToRankPoint(entry);
    const latest = await db.rankSnapshot.findFirst({
      where: { playerId, queueType: point.queueType },
      orderBy: { createdAt: "desc" },
    });
    // Evita spam: só grava se LP/tier mudou ou último snapshot tem >25min
    const ageMs = latest
      ? Date.now() - latest.createdAt.getTime()
      : Number.POSITIVE_INFINITY;
    const changed =
      !latest ||
      latest.ladderScore !== point.ladderScore ||
      latest.wins !== point.wins ||
      latest.losses !== point.losses;
    if (!changed && ageMs < 25 * 60_000) continue;

    await db.rankSnapshot.create({
      data: {
        playerId,
        queueType: point.queueType,
        tier: point.tier,
        rank: point.rank,
        lp: point.lp,
        wins: point.wins,
        losses: point.losses,
        ladderScore: point.ladderScore,
        source,
      },
    });
  }
}

export async function listRankSnapshots(
  playerId: string,
  options?: { queueType?: string; sinceMs?: number; limit?: number },
) {
  const since =
    options?.sinceMs != null ? new Date(Date.now() - options.sinceMs) : undefined;
  return db.rankSnapshot.findMany({
    where: {
      playerId,
      ...(options?.queueType ? { queueType: options.queueType } : {}),
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: options?.limit ?? 200,
  });
}

export async function getDayLpSummaryForPlayer(
  playerId: string,
  puuid: string,
  options?: { queueType?: string },
) {
  const { computeDayLpSummary, SOLO_QUEUE } = await import(
    "@/lib/stats/lpLedger"
  );
  const queueType = options?.queueType ?? SOLO_QUEUE;
  const snapshots = await listRankSnapshots(playerId, {
    queueType,
    sinceMs: 3 * 24 * 60 * 60_000,
  });
  const matches = await getStoredMatchesForPlayer(playerId, {
    count: 40,
    queue: "ranked",
  });
  const gamesToday = matches
    .map((m) => {
      const me = m.info.participants.find((p) => p.puuid === puuid);
      if (!me) return null;
      return { win: me.win, createdAt: m.info.gameCreation };
    })
    .filter((g): g is { win: boolean; createdAt: number } => g != null);

  return computeDayLpSummary({
    snapshots,
    queueType,
    gamesToday,
  });
}

export async function getFreshAnalysisRun(
  playerId: string,
  queue: QueueFilter,
  count: number,
): Promise<StoredAnalyzeResponse | null> {
  return getLatestAnalysisRun(playerId, queue, count, {
    maxAgeMs: AGGREGATE_TTL_MS,
  });
}

/** Última análise persistida (TTL opcional). */
export async function getLatestAnalysisRun(
  playerId: string,
  queue: QueueFilter,
  count: number,
  options?: { maxAgeMs?: number; allowNearbyCount?: boolean },
): Promise<StoredAnalyzeResponse | null> {
  const cutoff =
    options?.maxAgeMs != null
      ? new Date(Date.now() - options.maxAgeMs)
      : undefined;

  const run = await db.analysisRun.findFirst({
    where: {
      playerId,
      queue,
      ...(options?.allowNearbyCount ? {} : { count }),
      ...(cutoff ? { createdAt: { gte: cutoff } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!run) return null;

  const result = normalizeAggregateResult(
    run.result as unknown as AggregateResult,
  );
  return {
    ...result,
    cached: true,
    matchIdsFetched: run.analyzedGames,
    queue,
    source: "db",
  };
}

export async function getLastAnalysisSyncedAt(
  playerId: string,
): Promise<Date | null> {
  const run = await db.analysisRun.findFirst({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return run?.createdAt ?? null;
}

function emptyTemporal(): TemporalInsights {
  return {
    timezone: PLAYER_TIMEZONE,
    byHour: [],
    byDayOfWeek: [],
    byPatch: [],
    currentPatch: null,
    sessionIndex: [],
    afterWinStreaks: [],
    afterLossStreaks: [],
    byRefillGap: [],
    bySessionLength: [],
    recentForm: null,
    champByHour: [],
    roleByHour: [],
    avoidList: [],
    bestPlayWindow: null,
    bestDay: null,
    alerts: [],
  };
}

function normalizeAggregateResult(result: AggregateResult): AggregateResult {
  const temporal = {
    ...emptyTemporal(),
    ...(result.temporal ?? {}),
    afterLossStreaks: result.temporal?.afterLossStreaks ?? [],
    byRefillGap: result.temporal?.byRefillGap ?? [],
    bySessionLength: result.temporal?.bySessionLength ?? [],
    recentForm: result.temporal?.recentForm ?? null,
    champByHour: result.temporal?.champByHour ?? [],
    roleByHour: result.temporal?.roleByHour ?? [],
    avoidList: result.temporal?.avoidList ?? [],
  };

  return {
    ...result,
    temporal,
    champions: (result.champions ?? []).map((c) => ({
      ...c,
      topBuilds: c.topBuilds ?? [],
      topRunes: (c.topRunes ?? []).map((r) => ({
        ...r,
        primaryPerkIds: r.primaryPerkIds ?? [r.keystone],
        subPerkIds: r.subPerkIds ?? [],
        perkIds: r.perkIds ?? [r.keystone],
      })),
      matchups: c.matchups ?? [],
      allySynergies: c.allySynergies ?? [],
      matchupBuilds: c.matchupBuilds ?? [],
      matchupRunes: (c.matchupRunes ?? []).map((r) => ({
        ...r,
        primaryPerkIds: r.primaryPerkIds ?? [r.keystone],
        subPerkIds: r.subPerkIds ?? [],
        perkIds: r.perkIds ?? [r.keystone],
      })),
      matchupSpells: c.matchupSpells ?? [],
    })),
    topRecommendations: (result.topRecommendations ?? []).map((c) => ({
      ...c,
      topBuilds: c.topBuilds ?? [],
      topRunes: (c.topRunes ?? []).map((r) => ({
        ...r,
        primaryPerkIds: r.primaryPerkIds ?? [r.keystone],
        subPerkIds: r.subPerkIds ?? [],
        perkIds: r.perkIds ?? [r.keystone],
      })),
      matchups: c.matchups ?? [],
      allySynergies: c.allySynergies ?? [],
      matchupBuilds: c.matchupBuilds ?? [],
      matchupRunes: (c.matchupRunes ?? []).map((r) => ({
        ...r,
        primaryPerkIds: r.primaryPerkIds ?? [r.keystone],
        subPerkIds: r.subPerkIds ?? [],
        perkIds: r.perkIds ?? [r.keystone],
      })),
      matchupSpells: c.matchupSpells ?? [],
    })),
    topAllySynergies: result.topAllySynergies ?? [],
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
        gameVersion: match.info.gameVersion ?? null,
        payload: match as unknown as Prisma.InputJsonValue,
      },
      update: {
        queueId: match.info.queueId,
        gameCreation: BigInt(match.info.gameCreation),
        gameDuration: match.info.gameDuration,
        gameVersion: match.info.gameVersion ?? null,
        payload: match as unknown as Prisma.InputJsonValue,
      },
    });

    if (!me) continue;

    const role = normalizeRole(me.teamPosition, me.individualPosition);
    const enemy = findLanerEnemy(match, me);
    const allies = findAllies(match, me);
    const runes = extractRunesFromParticipant(me);
    const spells = extractSpells(me);
    const items = [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5];
    const allyChampionIds = allies.map((a) => a.championId);

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
        role,
        items,
        enemyChampionId: enemy?.championId ?? null,
        allyChampionIds,
        primaryStyle: runes.primaryStyle,
        subStyle: runes.subStyle,
        keystone: runes.keystone,
        perkIds: runes.perkIds,
        runeFingerprint: runes.runeFingerprint,
        summoner1Id: spells.summoner1Id,
        summoner2Id: spells.summoner2Id,
        spellFingerprint: spells.spellFingerprint,
      },
      update: {
        championId: me.championId,
        win: me.win,
        role,
        items,
        enemyChampionId: enemy?.championId ?? null,
        allyChampionIds,
        primaryStyle: runes.primaryStyle,
        subStyle: runes.subStyle,
        keystone: runes.keystone,
        perkIds: runes.perkIds,
        runeFingerprint: runes.runeFingerprint,
        summoner1Id: spells.summoner1Id,
        summoner2Id: spells.summoner2Id,
        spellFingerprint: spells.spellFingerprint,
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
      runeStats: {
        create: input.stats.champions.flatMap((c) =>
          c.topRunes.map((r) => ({
            championId: c.championId,
            role: r.role,
            fingerprint: r.fingerprint,
            primaryStyle: r.primaryStyle,
            keystone: r.keystone,
            subStyle: r.subStyle,
            primaryPerkIds: r.primaryPerkIds ?? [],
            subPerkIds: r.subPerkIds ?? [],
            perkIds: r.perkIds ?? [],
            games: r.games,
            wins: r.wins,
            wr: r.wr,
            wilsonLower: r.wilsonLower,
            lift: r.lift,
            confidence: r.confidence,
          })),
        ),
      },
      allySynergyStats: {
        create: input.stats.champions.flatMap((c) =>
          (c.allySynergies ?? []).slice(0, 8).map((s) => ({
            myChampionId: s.myChampionId,
            allyChampionId: s.allyChampionId,
            allyChampionName: s.allyChampionName,
            games: s.games,
            wins: s.wins,
            wr: s.wr,
            wilsonLower: s.wilsonLower,
            lift: s.lift,
            confidence: s.confidence,
          })),
        ),
      },
      matchupBuildStats: {
        create: input.stats.champions.flatMap((c) =>
          (c.matchupBuilds ?? []).slice(0, 10).map((b) => ({
            myChampionId: b.myChampionId,
            enemyChampionId: b.enemyChampionId,
            enemyChampionName: b.enemyChampionName,
            role: b.role,
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
      matchupRuneStats: {
        create: input.stats.champions.flatMap((c) =>
          (c.matchupRunes ?? []).slice(0, 10).map((r) => ({
            myChampionId: r.myChampionId,
            enemyChampionId: r.enemyChampionId,
            enemyChampionName: r.enemyChampionName,
            role: r.role,
            fingerprint: r.fingerprint,
            primaryStyle: r.primaryStyle,
            keystone: r.keystone,
            subStyle: r.subStyle,
            primaryPerkIds: r.primaryPerkIds ?? [],
            subPerkIds: r.subPerkIds ?? [],
            perkIds: r.perkIds ?? [],
            games: r.games,
            wins: r.wins,
            wr: r.wr,
            wilsonLower: r.wilsonLower,
            lift: r.lift,
            confidence: r.confidence,
          })),
        ),
      },
      matchupSpellStats: {
        create: input.stats.champions.flatMap((c) =>
          (c.matchupSpells ?? []).slice(0, 10).map((s) => ({
            myChampionId: s.myChampionId,
            enemyChampionId: s.enemyChampionId,
            enemyChampionName: s.enemyChampionName,
            role: s.role,
            fingerprint: s.fingerprint,
            spellIds: s.spellIds,
            games: s.games,
            wins: s.wins,
            wr: s.wr,
            wilsonLower: s.wilsonLower,
            lift: s.lift,
            confidence: s.confidence,
          })),
        ),
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

export async function createDraftSession(input: {
  playerId: string;
  role: string;
  allyChampionIds: number[];
  enemyChampionIds: number[];
  bannedChampionIds: number[];
  recommendedChampionIds: number[];
  pickedChampionId?: number | null;
  resultJson?: Prisma.InputJsonValue;
}) {
  return db.draftSession.create({
    data: {
      playerId: input.playerId,
      role: input.role,
      allyChampionIds: input.allyChampionIds,
      enemyChampionIds: input.enemyChampionIds,
      bannedChampionIds: input.bannedChampionIds,
      recommendedChampionIds: input.recommendedChampionIds,
      pickedChampionId: input.pickedChampionId ?? null,
      resultJson: input.resultJson,
    },
  });
}

export async function updateDraftSessionPick(
  sessionId: string,
  playerId: string,
  pickedChampionId: number,
) {
  return db.draftSession.updateMany({
    where: { id: sessionId, playerId },
    data: { pickedChampionId },
  });
}

export type AppProfileView = {
  playerId: string;
  puuid: string;
  gameName: string;
  tagLine: string;
  platform: string;
  profileIconId: number | null;
  preferredRole: string;
  queue: string;
  matchCount: number;
  dailyLpTarget: number;
  dailyLpStop: number;
  storedMatchCount: number;
  lastSyncedAt: string | null;
};

async function toAppProfileView(row: {
  preferredRole: string;
  queue: string;
  matchCount: number;
  dailyLpTarget?: number;
  dailyLpStop?: number;
  player: {
    id: string;
    puuid: string;
    gameName: string;
    tagLine: string;
    platform: string;
    profileIconId: number | null;
  };
}): Promise<AppProfileView> {
  const [storedMatchCount, lastSyncedAt] = await Promise.all([
    countStoredMatches(row.player.id, row.queue as QueueFilter),
    getLastAnalysisSyncedAt(row.player.id),
  ]);

  return {
    playerId: row.player.id,
    puuid: row.player.puuid,
    gameName: row.player.gameName,
    tagLine: row.player.tagLine,
    platform: row.player.platform,
    profileIconId: row.player.profileIconId,
    preferredRole: row.preferredRole,
    queue: row.queue,
    matchCount: row.matchCount,
    dailyLpTarget: row.dailyLpTarget ?? 30,
    dailyLpStop: row.dailyLpStop ?? -40,
    storedMatchCount,
    lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
  };
}

export async function getAppProfile(): Promise<AppProfileView | null> {
  try {
    const row = await db.appProfile.findUnique({
      where: { id: "default" },
      include: {
        player: {
          select: {
            id: true,
            puuid: true,
            gameName: true,
            tagLine: true,
            platform: true,
            profileIconId: true,
          },
        },
      },
    });
    if (!row) return null;
    return toAppProfileView(row);
  } catch {
    // Build-time / DB offline — trata como sem perfil
    return null;
  }
}

export async function upsertAppProfile(input: {
  playerId: string;
  preferredRole?: string;
  queue?: string;
  matchCount?: number;
  dailyLpTarget?: number;
  dailyLpStop?: number;
}): Promise<AppProfileView> {
  const row = await db.appProfile.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      playerId: input.playerId,
      preferredRole: input.preferredRole ?? "MIDDLE",
      queue: input.queue ?? "ranked",
      matchCount: input.matchCount ?? 50,
      dailyLpTarget: input.dailyLpTarget ?? 30,
      dailyLpStop: input.dailyLpStop ?? -40,
    },
    update: {
      playerId: input.playerId,
      ...(input.preferredRole != null
        ? { preferredRole: input.preferredRole }
        : {}),
      ...(input.queue != null ? { queue: input.queue } : {}),
      ...(input.matchCount != null ? { matchCount: input.matchCount } : {}),
      ...(input.dailyLpTarget != null
        ? { dailyLpTarget: input.dailyLpTarget }
        : {}),
      ...(input.dailyLpStop != null ? { dailyLpStop: input.dailyLpStop } : {}),
    },
    include: {
      player: {
        select: {
          id: true,
          puuid: true,
          gameName: true,
          tagLine: true,
          platform: true,
          profileIconId: true,
        },
      },
    },
  });

  return toAppProfileView(row);
}

export async function clearAppProfile(): Promise<void> {
  await db.appProfile.deleteMany({ where: { id: "default" } });
}

export type ReferencePlayerView = {
  id: string;
  playerId: string;
  puuid: string;
  gameName: string;
  tagLine: string;
  platform: string;
  profileIconId: number | null;
  label: string | null;
  notes: string | null;
  championIds: number[];
  matchCount: number;
  storedMatchCount: number;
  lastSyncedAt: string | null;
};

export async function listReferencePlayers(): Promise<ReferencePlayerView[]> {
  const profile = await db.appProfile.findUnique({ where: { id: "default" } });
  if (!profile) return [];

  const rows = await db.referencePlayer.findMany({
    where: { appProfileId: "default" },
    include: {
      player: {
        select: {
          id: true,
          puuid: true,
          gameName: true,
          tagLine: true,
          platform: true,
          profileIconId: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(
    rows.map(async (row) => {
      const [storedMatchCount, lastSyncedAt] = await Promise.all([
        countStoredMatches(row.player.id, "ranked"),
        getLastAnalysisSyncedAt(row.player.id),
      ]);
      return {
        id: row.id,
        playerId: row.player.id,
        puuid: row.player.puuid,
        gameName: row.player.gameName,
        tagLine: row.player.tagLine,
        platform: row.player.platform,
        profileIconId: row.player.profileIconId,
        label: row.label,
        notes: row.notes,
        championIds: row.championIds,
        matchCount: row.matchCount,
        storedMatchCount,
        lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
      };
    }),
  );
}

export async function addReferencePlayer(input: {
  playerId: string;
  label?: string | null;
  notes?: string | null;
  championIds?: number[];
  matchCount?: number;
}): Promise<ReferencePlayerView> {
  await db.appProfile.findUniqueOrThrow({ where: { id: "default" } });

  const row = await db.referencePlayer.upsert({
    where: {
      appProfileId_playerId: {
        appProfileId: "default",
        playerId: input.playerId,
      },
    },
    create: {
      appProfileId: "default",
      playerId: input.playerId,
      label: input.label ?? null,
      notes: input.notes ?? null,
      championIds: input.championIds ?? [],
      matchCount: input.matchCount ?? 100,
    },
    update: {
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.championIds !== undefined
        ? { championIds: input.championIds }
        : {}),
      ...(input.matchCount !== undefined
        ? { matchCount: input.matchCount }
        : {}),
    },
    include: {
      player: {
        select: {
          id: true,
          puuid: true,
          gameName: true,
          tagLine: true,
          platform: true,
          profileIconId: true,
        },
      },
    },
  });

  const [storedMatchCount, lastSyncedAt] = await Promise.all([
    countStoredMatches(row.player.id, "ranked"),
    getLastAnalysisSyncedAt(row.player.id),
  ]);

  return {
    id: row.id,
    playerId: row.player.id,
    puuid: row.player.puuid,
    gameName: row.player.gameName,
    tagLine: row.player.tagLine,
    platform: row.player.platform,
    profileIconId: row.player.profileIconId,
    label: row.label,
    notes: row.notes,
    championIds: row.championIds,
    matchCount: row.matchCount,
    storedMatchCount,
    lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
  };
}

/**
 * Remove o link de referência. Se o Player não for o AppProfile e não tiver
 * outras referências, apaga o Player (cascade em matches/snapshots/analyses).
 */
export async function removeReferencePlayer(id: string): Promise<void> {
  const row = await db.referencePlayer.findFirst({
    where: { id, appProfileId: "default" },
    select: { id: true, playerId: true },
  });
  if (!row) return;

  await db.referencePlayer.delete({ where: { id: row.id } });
  await cleanupOrphanReferencePlayer(row.playerId);
}

/** Apaga Player órfão de referência — nunca o AppProfile. */
export async function cleanupOrphanReferencePlayer(
  playerId: string,
): Promise<boolean> {
  const [appProfile, otherRefs] = await Promise.all([
    db.appProfile.findFirst({
      where: { id: "default", playerId },
      select: { id: true },
    }),
    db.referencePlayer.count({ where: { playerId } }),
  ]);
  if (appProfile || otherRefs > 0) return false;

  await db.player.delete({ where: { id: playerId } });
  return true;
}

export type ReferenceChampionInsight = {
  referenceId: string;
  gameName: string;
  tagLine: string;
  platform: string;
  label: string | null;
  championId: number;
  championName: string;
  games: number;
  wins: number;
  wr: number;
  topBuild: { items: number[]; games: number; wins: number; wr: number } | null;
  topRune: {
    fingerprint: string;
    primaryStyle: number;
    keystone: number;
    subStyle: number;
    primaryPerkIds: number[];
    subPerkIds: number[];
    perkIds: number[];
    games: number;
    wins: number;
    wr: number;
  } | null;
};

/** Builds/runas dos refs no campeão selecionado (só banco). */
export async function getReferenceInsightsForChampion(
  championId: number,
): Promise<ReferenceChampionInsight[]> {
  const refs = await listReferencePlayers();
  const insights: ReferenceChampionInsight[] = [];

  for (const ref of refs) {
    if (
      ref.championIds.length > 0 &&
      !ref.championIds.includes(championId)
    ) {
      continue;
    }

    const matches = await getStoredMatchesForPlayer(ref.playerId, {
      count: Math.max(ref.matchCount, 50),
      queue: "ranked",
    });

    let games = 0;
    let wins = 0;
    let champName = "";
    const builds = new Map<string, { items: number[]; games: number; wins: number }>();
    const runes = new Map<
      string,
      { games: number; wins: number }
    >();

    for (const match of matches) {
      const me = match.info.participants.find((p) => p.puuid === ref.puuid);
      if (!me || me.championId !== championId) continue;
      games += 1;
      if (me.win) wins += 1;
      champName = me.championName;

      const items = [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5].filter(
        (id) => id > 0,
      );
      const fp = buildFingerprint(items);
      if (fp !== "empty") {
        if (!builds.has(fp)) builds.set(fp, { items, games: 0, wins: 0 });
        const b = builds.get(fp)!;
        b.games += 1;
        if (me.win) b.wins += 1;
      }

      const rune = extractRunesFromParticipant(me);
      if (rune.runeFingerprint) {
        if (!runes.has(rune.runeFingerprint)) {
          runes.set(rune.runeFingerprint, { games: 0, wins: 0 });
        }
        const r = runes.get(rune.runeFingerprint)!;
        r.games += 1;
        if (me.win) r.wins += 1;
      }
    }

    if (games === 0) continue;

    const topBuildEntry = [...builds.entries()].sort(
      (a, b) => b[1].games - a[1].games || b[1].wins - a[1].wins,
    )[0];
    const topRuneEntry = [...runes.entries()].sort(
      (a, b) => b[1].games - a[1].games || b[1].wins - a[1].wins,
    )[0];
    const parsedRune = topRuneEntry
      ? parseRuneFingerprint(topRuneEntry[0])
      : null;

    insights.push({
      referenceId: ref.id,
      gameName: ref.gameName,
      tagLine: ref.tagLine,
      platform: ref.platform,
      label: ref.label,
      championId,
      championName: champName || String(championId),
      games,
      wins,
      wr: winRate(wins, games),
      topBuild: topBuildEntry
        ? {
            items: topBuildEntry[1].items,
            games: topBuildEntry[1].games,
            wins: topBuildEntry[1].wins,
            wr: winRate(topBuildEntry[1].wins, topBuildEntry[1].games),
          }
        : null,
      topRune:
        topRuneEntry && parsedRune
          ? {
              fingerprint: topRuneEntry[0],
              primaryStyle: parsedRune.primaryStyle,
              keystone: parsedRune.keystone,
              subStyle: parsedRune.subStyle,
              primaryPerkIds: parsedRune.primaryPerkIds,
              subPerkIds: parsedRune.subPerkIds,
              perkIds: parsedRune.perkIds,
              games: topRuneEntry[1].games,
              wins: topRuneEntry[1].wins,
              wr: winRate(topRuneEntry[1].wins, topRuneEntry[1].games),
            }
          : null,
    });
  }

  return insights.sort((a, b) => b.games - a.games);
}

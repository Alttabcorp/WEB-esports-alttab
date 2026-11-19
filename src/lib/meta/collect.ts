import { getCachedMatch, setCachedMatch } from "@/lib/cache/matches";
import { db } from "@/lib/db";
import { getMatchFromDb } from "@/lib/db/persist";
import { buildFingerprint } from "@/lib/stats/builds";
import { extractRunesFromParticipant, parseRuneFingerprint } from "@/lib/stats/runes";
import {
  confidenceFromSample,
  wilsonLowerBound,
  winRate,
} from "@/lib/stats/wilson";
import { getRiotClient, resolveRouting } from "@/lib/riot/client";
import type { PlatformRegion } from "@/lib/riot/regions";
import type {
  LeagueEntryDto,
  LeagueItemDto,
  MatchDto,
  RankedDivision,
  RankedTier,
} from "@/lib/riot/types";
import { Prisma } from "@/generated/prisma/client";
import type {
  MetaBand,
  MetaBuildRow,
  MetaChampionResult,
  MetaCollectInput,
  MetaMonoPlayer,
  MetaRuneRow,
} from "./types";

const META_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const SOLO_QUEUE = 420;

/** Limites conservadores (rate limit 100/2min). */
const PEER_PLAYERS = 8;
const HIGH_PLAYERS = 10;
const MATCH_IDS_PER_PLAYER = 12;
const MAX_MATCH_FETCHES = 36;
const MONO_MIN_GAMES = 4;

type SamplePlayer = {
  puuid: string;
  label: string;
  tier: string;
};

type ChampGame = {
  puuid: string;
  label: string;
  tier: string;
  win: boolean;
  items: number[];
  runeFingerprint: string | null;
};

function soloEntry(ranked: LeagueEntryDto[]): LeagueEntryDto | null {
  return (
    ranked.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? ranked[0] ?? null
  );
}

export function eloFromRanked(
  ranked: LeagueEntryDto[],
): { tier: RankedTier; division: RankedDivision } | null {
  const entry = soloEntry(ranked);
  if (!entry?.tier) return null;
  const tier = entry.tier.toUpperCase() as RankedTier;
  const division = (entry.rank?.toUpperCase() || "I") as RankedDivision;
  if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier)) {
    return { tier, division: "I" };
  }
  return { tier, division };
}

function normalizeKey(
  platform: string,
  championId: number,
  band: MetaBand,
  tier: string | null | undefined,
  division: string | null | undefined,
) {
  return {
    platform,
    championId,
    band,
    tier: tier ?? (band === "HIGH" ? "MASTER+" : "UNKNOWN"),
    division: division ?? (band === "HIGH" ? "-" : "I"),
  };
}

async function getFreshSnapshot(
  key: ReturnType<typeof normalizeKey>,
): Promise<MetaChampionResult | null> {
  const row = await db.metaSnapshot.findUnique({
    where: {
      platform_championId_band_tier_division: key,
    },
  });
  if (!row) return null;
  if (Date.now() - row.createdAt.getTime() > META_TTL_MS) return null;
  const result = row.result as unknown as MetaChampionResult;
  return { ...result, cached: true };
}

async function saveSnapshot(
  key: ReturnType<typeof normalizeKey>,
  result: MetaChampionResult,
): Promise<void> {
  await db.metaSnapshot.upsert({
    where: {
      platform_championId_band_tier_division: key,
    },
    create: {
      ...key,
      samplePlayers: result.samplePlayers,
      sampleGames: result.sampleGames,
      result: result as unknown as Prisma.InputJsonValue,
    },
    update: {
      samplePlayers: result.samplePlayers,
      sampleGames: result.sampleGames,
      result: result as unknown as Prisma.InputJsonValue,
    },
  });
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function resolvePuuid(
  platform: PlatformRegion,
  item: { puuid?: string; summonerId?: string },
): Promise<string | null> {
  if (item.puuid) return item.puuid;
  if (!item.summonerId) return null;
  try {
    const summoner = await getRiotClient().getSummonerById(
      platform,
      item.summonerId,
    );
    return summoner.puuid;
  } catch {
    return null;
  }
}

async function samplePeerPlayers(
  platform: PlatformRegion,
  tier: RankedTier,
  division: RankedDivision,
): Promise<SamplePlayer[]> {
  const client = getRiotClient();
  if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier)) {
    return sampleHighPlayers(platform, PEER_PLAYERS);
  }

  const entries = await client.getLeagueEntries(platform, tier, division, 1);
  const picked = shuffle(entries).slice(0, PEER_PLAYERS * 2);
  const out: SamplePlayer[] = [];

  for (const entry of picked) {
    if (out.length >= PEER_PLAYERS) break;
    const puuid = await resolvePuuid(platform, entry);
    if (!puuid) continue;
    out.push({
      puuid,
      label: `${tier} ${division}`,
      tier: `${tier} ${division}`,
    });
  }
  return out;
}

async function sampleHighPlayers(
  platform: PlatformRegion,
  limit = HIGH_PLAYERS,
): Promise<SamplePlayer[]> {
  const client = getRiotClient();
  const [challenger, gm, master] = await Promise.all([
    client.getChallengerLeague(platform),
    client.getGrandmasterLeague(platform),
    client.getMasterLeague(platform),
  ]);

  const pool: Array<LeagueItemDto & { tierLabel: string }> = [
    ...challenger.entries.map((e) => ({ ...e, tierLabel: "CHALLENGER" })),
    ...gm.entries.map((e) => ({ ...e, tierLabel: "GRANDMASTER" })),
    ...master.entries.map((e) => ({ ...e, tierLabel: "MASTER" })),
  ];

  const picked = shuffle(pool).slice(0, limit * 2);
  const out: SamplePlayer[] = [];

  for (const entry of picked) {
    if (out.length >= limit) break;
    const puuid = await resolvePuuid(platform, entry);
    if (!puuid) continue;
    out.push({
      puuid,
      label: `${entry.tierLabel} ${entry.leaguePoints} LP`,
      tier: entry.tierLabel,
    });
  }
  return out;
}

async function loadMatch(
  routing: ReturnType<typeof resolveRouting>,
  matchId: string,
): Promise<MatchDto | null> {
  const cached = await getCachedMatch(matchId);
  if (cached) return cached;
  const fromDb = await getMatchFromDb(matchId);
  if (fromDb) {
    await setCachedMatch(matchId, fromDb);
    return fromDb;
  }
  try {
    const match = await getRiotClient().getMatch(routing, matchId);
    await setCachedMatch(matchId, match);
    return match;
  } catch {
    return null;
  }
}

function finalizeBuild(
  fingerprint: string,
  games: number,
  wins: number,
): MetaBuildRow {
  const wr = winRate(wins, games);
  return {
    fingerprint,
    items: fingerprint === "empty" ? [] : fingerprint.split("-").map(Number),
    games,
    wins,
    wr,
    wilsonLower: wilsonLowerBound(wins, games),
    confidence: confidenceFromSample(games),
  };
}

function finalizeRune(
  fingerprint: string,
  games: number,
  wins: number,
): MetaRuneRow | null {
  const parsed = parseRuneFingerprint(fingerprint);
  if (!parsed) return null;
  const wr = winRate(wins, games);
  return {
    fingerprint,
    primaryStyle: parsed.primaryStyle,
    keystone: parsed.keystone,
    subStyle: parsed.subStyle,
    primaryPerkIds: parsed.primaryPerkIds,
    subPerkIds: parsed.subPerkIds,
    perkIds: parsed.perkIds,
    games,
    wins,
    wr,
    wilsonLower: wilsonLowerBound(wins, games),
    confidence: confidenceFromSample(games),
  };
}

function aggregateGames(games: ChampGame[]): Omit<
  MetaChampionResult,
  "band" | "platform" | "championId" | "tier" | "division" | "cached" | "partial" | "note"
> {
  const buildMap = new Map<string, { games: number; wins: number }>();
  const runeMap = new Map<string, { games: number; wins: number }>();
  const byPlayer = new Map<
    string,
    { label: string; tier: string; games: number; wins: number; builds: Map<string, { g: number; w: number }>; runes: Map<string, { g: number; w: number }> }
  >();

  let wins = 0;
  for (const g of games) {
    if (g.win) wins += 1;
    const fp = buildFingerprint(g.items);
    if (fp !== "empty") {
      const b = buildMap.get(fp) ?? { games: 0, wins: 0 };
      b.games += 1;
      if (g.win) b.wins += 1;
      buildMap.set(fp, b);
    }
    if (g.runeFingerprint) {
      const r = runeMap.get(g.runeFingerprint) ?? { games: 0, wins: 0 };
      r.games += 1;
      if (g.win) r.wins += 1;
      runeMap.set(g.runeFingerprint, r);
    }

    const p = byPlayer.get(g.puuid) ?? {
      label: g.label,
      tier: g.tier,
      games: 0,
      wins: 0,
      builds: new Map(),
      runes: new Map(),
    };
    p.games += 1;
    if (g.win) p.wins += 1;
    if (fp !== "empty") {
      const pb = p.builds.get(fp) ?? { g: 0, w: 0 };
      pb.g += 1;
      if (g.win) pb.w += 1;
      p.builds.set(fp, pb);
    }
    if (g.runeFingerprint) {
      const pr = p.runes.get(g.runeFingerprint) ?? { g: 0, w: 0 };
      pr.g += 1;
      if (g.win) pr.w += 1;
      p.runes.set(g.runeFingerprint, pr);
    }
    byPlayer.set(g.puuid, p);
  }

  const builds = [...buildMap.entries()]
    .map(([fingerprint, s]) => finalizeBuild(fingerprint, s.games, s.wins))
    .sort((a, b) => b.wilsonLower - a.wilsonLower)
    .slice(0, 5);

  const runes = [...runeMap.entries()]
    .map(([fingerprint, s]) => finalizeRune(fingerprint, s.games, s.wins))
    .filter((r): r is MetaRuneRow => r != null)
    .sort((a, b) => b.wilsonLower - a.wilsonLower)
    .slice(0, 5);

  const monos: MetaMonoPlayer[] = [...byPlayer.entries()]
    .filter(([, p]) => p.games >= MONO_MIN_GAMES)
    .map(([puuid, p]) => {
      const topBuildEntry = [...p.builds.entries()].sort(
        (a, b) => b[1].g - a[1].g,
      )[0];
      const topRuneEntry = [...p.runes.entries()].sort(
        (a, b) => b[1].g - a[1].g,
      )[0];
      return {
        puuid,
        label: p.label,
        tier: p.tier,
        games: p.games,
        wins: p.wins,
        wr: winRate(p.wins, p.games),
        topBuild: topBuildEntry
          ? finalizeBuild(topBuildEntry[0], topBuildEntry[1].g, topBuildEntry[1].w)
          : null,
        topRune: topRuneEntry
          ? finalizeRune(topRuneEntry[0], topRuneEntry[1].g, topRuneEntry[1].w)
          : null,
      };
    })
    .sort((a, b) => b.games - a.games || b.wr - a.wr)
    .slice(0, 5);

  return {
    samplePlayers: byPlayer.size,
    sampleGames: games.length,
    overallWr: winRate(wins, games.length),
    builds,
    runes,
    monos,
  };
}

export async function collectChampionMeta(
  input: MetaCollectInput,
): Promise<MetaChampionResult> {
  const platform = input.platform as PlatformRegion;
  const key = normalizeKey(
    platform,
    input.championId,
    input.band,
    input.tier,
    input.division,
  );

  const fresh = await getFreshSnapshot(key);
  if (fresh) return fresh;

  const routing = resolveRouting(platform);
  const client = getRiotClient();

  const players =
    input.band === "HIGH"
      ? await sampleHighPlayers(platform)
      : await samplePeerPlayers(
          platform,
          (input.tier ?? "GOLD") as RankedTier,
          (input.division ?? "II") as RankedDivision,
        );

  const games: ChampGame[] = [];
  let matchFetches = 0;
  let partial = false;

  for (const player of players) {
    if (matchFetches >= MAX_MATCH_FETCHES) {
      partial = true;
      break;
    }

    let matchIds: string[] = [];
    try {
      matchIds = await client.getMatchIdsByPuuid(routing, player.puuid, {
        count: MATCH_IDS_PER_PLAYER,
        queue: SOLO_QUEUE,
      });
    } catch {
      continue;
    }

    for (const matchId of matchIds) {
      if (matchFetches >= MAX_MATCH_FETCHES) {
        partial = true;
        break;
      }

      const cached = await getCachedMatch(matchId);
      const fromDb = cached ? null : await getMatchFromDb(matchId);
      let match = cached ?? fromDb;

      if (!match) {
        matchFetches += 1;
        match = await loadMatch(routing, matchId);
      }
      if (!match) continue;

      const me = match.info.participants.find((p) => p.puuid === player.puuid);
      if (!me || me.championId !== input.championId) continue;

      const runes = extractRunesFromParticipant(me);
      games.push({
        puuid: player.puuid,
        label: player.label,
        tier: player.tier,
        win: me.win,
        items: [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5],
        runeFingerprint: runes.runeFingerprint,
      });
    }
  }

  const agg = aggregateGames(games);
  const result: MetaChampionResult = {
    band: input.band,
    platform,
    championId: input.championId,
    tier: key.tier,
    division: key.division,
    ...agg,
    cached: false,
    partial,
    note:
      games.length === 0
        ? "Amostra vazia nesta janela — tente de novo em alguns minutos (rate limit) ou outro elo."
        : partial
          ? "Amostra parcial por rate limit Riot; cacheia 12h e completa nas próximas consultas."
          : "Amostra de partidas ranked solo recentes do ladder.",
  };

  if (games.length > 0) {
    await saveSnapshot(key, result);
  }

  return result;
}

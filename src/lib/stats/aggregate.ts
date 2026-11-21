import type { MatchDto, MatchParticipant } from "@/lib/riot/types";
import { buildFingerprint } from "./builds";
import {
  coreRuneFingerprint,
  extractRunesFromParticipant,
  parseRuneFingerprint,
} from "./runes";
import { extractSpells, parseSpellFingerprint } from "./spells";
import {
  buildTemporalInsights,
  type TemporalInsights,
} from "./temporal";
import {
  MIN_SAMPLE_FOR_MATCHUP_DISPLAY,
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
  topRunes: RuneInsight[];
  matchups: MatchupInsight[];
  allySynergies: AllySynergyInsight[];
  matchupBuilds: MatchupBuildInsight[];
  matchupRunes: MatchupRuneInsight[];
  matchupSpells: MatchupSpellInsight[];
};

export type BuildInsight = RankedStat & {
  fingerprint: string;
  items: number[];
  championId: number;
};

export type RuneInsight = RankedStat & {
  fingerprint: string;
  primaryStyle: number;
  keystone: number;
  subStyle: number;
  primaryPerkIds: number[];
  subPerkIds: number[];
  perkIds: number[];
  championId: number;
  role: RoleKey;
};

export type MatchupInsight = RankedStat & {
  myChampionId: number;
  enemyChampionId: number;
  enemyChampionName: string;
  role: RoleKey;
};

export type AllySynergyInsight = RankedStat & {
  myChampionId: number;
  allyChampionId: number;
  allyChampionName: string;
};

export type MatchupBuildInsight = RankedStat & {
  myChampionId: number;
  enemyChampionId: number;
  enemyChampionName: string;
  role: RoleKey;
  fingerprint: string;
  items: number[];
};

export type MatchupRuneInsight = RankedStat & {
  myChampionId: number;
  enemyChampionId: number;
  enemyChampionName: string;
  role: RoleKey;
  fingerprint: string;
  primaryStyle: number;
  keystone: number;
  subStyle: number;
  primaryPerkIds: number[];
  subPerkIds: number[];
  perkIds: number[];
};

export type MatchupSpellInsight = RankedStat & {
  myChampionId: number;
  enemyChampionId: number;
  enemyChampionName: string;
  role: RoleKey;
  fingerprint: string;
  spellIds: number[];
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
  topAllySynergies: AllySynergyInsight[];
  /** Horário, dia, patch, sessão e alertas de desempenho. */
  temporal: TemporalInsights;
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

function mergeBuckets(into: StatBucket, from: StatBucket) {
  into.games += from.games;
  into.wins += from.wins;
  into.kills += from.kills;
  into.deaths += from.deaths;
  into.assists += from.assists;
  into.damage += from.damage;
  into.cs += from.cs;
  into.vision += from.vision;
  into.durationSec += from.durationSec;
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

export function findLanerEnemy(
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

export function findAllies(
  match: MatchDto,
  me: MatchParticipant,
): MatchParticipant[] {
  return match.info.participants.filter(
    (p) => p.teamId === me.teamId && p.puuid !== me.puuid,
  );
}

export function aggregatePlayerMatches(
  matches: MatchDto[],
  puuid: string,
): AggregateResult {
  const champMap = new Map<
    number,
    {
      name: string;
      bucket: StatBucket;
      builds: Map<string, StatBucket>;
      runes: Map<string, { role: RoleKey; bucket: StatBucket }>;
    }
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
  const synergyMap = new Map<
    string,
    {
      myChampionId: number;
      allyChampionId: number;
      allyChampionName: string;
      bucket: StatBucket;
    }
  >();
  const matchupBuildMap = new Map<
    string,
    {
      myChampionId: number;
      enemyChampionId: number;
      enemyChampionName: string;
      role: RoleKey;
      fingerprint: string;
      bucket: StatBucket;
    }
  >();
  const matchupRuneMap = new Map<
    string,
    {
      myChampionId: number;
      enemyChampionId: number;
      enemyChampionName: string;
      role: RoleKey;
      fingerprint: string;
      bucket: StatBucket;
    }
  >();
  const matchupSpellMap = new Map<
    string,
    {
      myChampionId: number;
      enemyChampionId: number;
      enemyChampionName: string;
      role: RoleKey;
      fingerprint: string;
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
        runes: new Map(),
      });
    }
    const champ = champMap.get(me.championId)!;
    addGame(champ.bucket, me, duration);

    const fp = buildFingerprint(participantItems(me));
    if (!champ.builds.has(fp)) champ.builds.set(fp, emptyBucket());
    addGame(champ.builds.get(fp)!, me, duration);

    const runes = extractRunesFromParticipant(me);
    if (runes.runeFingerprint && role !== "UNKNOWN") {
      const runeKey = `${role}:${runes.runeFingerprint}`;
      if (!champ.runes.has(runeKey)) {
        champ.runes.set(runeKey, { role, bucket: emptyBucket() });
      }
      addGame(champ.runes.get(runeKey)!.bucket, me, duration);
    }

    const spells = extractSpells(me);

    for (const ally of findAllies(match, me)) {
      const key = `${me.championId}:${ally.championId}`;
      if (!synergyMap.has(key)) {
        synergyMap.set(key, {
          myChampionId: me.championId,
          allyChampionId: ally.championId,
          allyChampionName: ally.championName,
          bucket: emptyBucket(),
        });
      }
      addGame(synergyMap.get(key)!.bucket, me, duration);
    }

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

      if (fp !== "empty") {
        const bKey = `${key}:${fp}`;
        if (!matchupBuildMap.has(bKey)) {
          matchupBuildMap.set(bKey, {
            myChampionId: me.championId,
            enemyChampionId: enemy.championId,
            enemyChampionName: enemy.championName,
            role,
            fingerprint: fp,
            bucket: emptyBucket(),
          });
        }
        addGame(matchupBuildMap.get(bKey)!.bucket, me, duration);
      }

      if (runes.runeFingerprint) {
        const rKey = `${key}:${runes.runeFingerprint}`;
        if (!matchupRuneMap.has(rKey)) {
          matchupRuneMap.set(rKey, {
            myChampionId: me.championId,
            enemyChampionId: enemy.championId,
            enemyChampionName: enemy.championName,
            role,
            fingerprint: runes.runeFingerprint,
            bucket: emptyBucket(),
          });
        }
        addGame(matchupRuneMap.get(rKey)!.bucket, me, duration);
      }

      if (spells.spellFingerprint) {
        const sKey = `${key}:${spells.spellFingerprint}`;
        if (!matchupSpellMap.has(sKey)) {
          matchupSpellMap.set(sKey, {
            myChampionId: me.championId,
            enemyChampionId: enemy.championId,
            enemyChampionName: enemy.championName,
            role,
            fingerprint: spells.spellFingerprint,
            bucket: emptyBucket(),
          });
        }
        addGame(matchupSpellMap.get(sKey)!.bucket, me, duration);
      }
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
          items:
            fingerprint === "empty" ? [] : fingerprint.split("-").map(Number),
          championId,
        }))
        .filter((b) => b.fingerprint !== "empty")
        .sort((a, b) => b.wilsonLower - a.wilsonLower)
        .slice(0, 5);

      // Une a mesma página visual (sem shards / ordem de secundárias / roles
      // diferentes) — evita “runas duplicadas” na UI.
      const runeMerged = new Map<
        string,
        {
          fingerprint: string;
          role: RoleKey;
          roleGames: number;
          bucket: StatBucket;
        }
      >();
      for (const [runeKey, entry] of data.runes.entries()) {
        const fingerprint = runeKey.slice(entry.role.length + 1);
        const core = coreRuneFingerprint(fingerprint) ?? fingerprint;
        const existing = runeMerged.get(core);
        if (!existing) {
          runeMerged.set(core, {
            fingerprint: core,
            role: entry.role,
            roleGames: entry.bucket.games,
            bucket: { ...entry.bucket },
          });
        } else {
          mergeBuckets(existing.bucket, entry.bucket);
          if (entry.bucket.games > existing.roleGames) {
            existing.role = entry.role;
            existing.roleGames = entry.bucket.games;
          }
        }
      }
      const topRunes: RuneInsight[] = [...runeMerged.values()]
        .map((entry) => {
          const parsed = parseRuneFingerprint(entry.fingerprint);
          if (!parsed) return null;
          return {
            ...finalize(entry.bucket, baselineWr),
            fingerprint: entry.fingerprint,
            primaryStyle: parsed.primaryStyle,
            keystone: parsed.keystone,
            subStyle: parsed.subStyle,
            primaryPerkIds: parsed.primaryPerkIds,
            subPerkIds: parsed.subPerkIds,
            perkIds: parsed.perkIds,
            championId,
            role: entry.role,
          };
        })
        .filter((r): r is RuneInsight => r != null)
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

      const allySynergies: AllySynergyInsight[] = [...synergyMap.values()]
        .filter((s) => s.myChampionId === championId)
        .map((s) => ({
          ...finalize(s.bucket, baselineWr),
          myChampionId: s.myChampionId,
          allyChampionId: s.allyChampionId,
          allyChampionName: s.allyChampionName,
        }))
        .sort((a, b) => b.wilsonLower - a.wilsonLower)
        .slice(0, 12);

      const matchupBuilds: MatchupBuildInsight[] = [...matchupBuildMap.values()]
        .filter((m) => m.myChampionId === championId)
        .map((m) => ({
          ...finalize(m.bucket, baselineWr),
          myChampionId: m.myChampionId,
          enemyChampionId: m.enemyChampionId,
          enemyChampionName: m.enemyChampionName,
          role: m.role,
          fingerprint: m.fingerprint,
          items: m.fingerprint.split("-").map(Number),
        }))
        .sort((a, b) => b.wilsonLower - a.wilsonLower)
        .slice(0, 20);

      const matchupRunes: MatchupRuneInsight[] = [...matchupRuneMap.values()]
        .filter((m) => m.myChampionId === championId)
        .map((m) => {
          const parsed = parseRuneFingerprint(m.fingerprint);
          if (!parsed) return null;
          return {
            ...finalize(m.bucket, baselineWr),
            myChampionId: m.myChampionId,
            enemyChampionId: m.enemyChampionId,
            enemyChampionName: m.enemyChampionName,
            role: m.role,
            fingerprint: m.fingerprint,
            primaryStyle: parsed.primaryStyle,
            keystone: parsed.keystone,
            subStyle: parsed.subStyle,
            primaryPerkIds: parsed.primaryPerkIds,
            subPerkIds: parsed.subPerkIds,
            perkIds: parsed.perkIds,
          };
        })
        .filter((r): r is MatchupRuneInsight => r != null)
        .sort((a, b) => b.wilsonLower - a.wilsonLower)
        .slice(0, 20);

      const matchupSpells: MatchupSpellInsight[] = [...matchupSpellMap.values()]
        .filter((m) => m.myChampionId === championId)
        .map((m) => ({
          ...finalize(m.bucket, baselineWr),
          myChampionId: m.myChampionId,
          enemyChampionId: m.enemyChampionId,
          enemyChampionName: m.enemyChampionName,
          role: m.role,
          fingerprint: m.fingerprint,
          spellIds: parseSpellFingerprint(m.fingerprint),
        }))
        .sort((a, b) => b.wilsonLower - a.wilsonLower)
        .slice(0, 20);

      return {
        ...base,
        championId,
        championName: data.name,
        topBuilds,
        topRunes,
        matchups,
        allySynergies,
        matchupBuilds,
        matchupRunes,
        matchupSpells,
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
    .filter((m) => m.games >= MIN_SAMPLE_FOR_MATCHUP_DISPLAY);

  const bestMatchups = [...allMatchups]
    .sort((a, b) => b.wilsonLower - a.wilsonLower || b.games - a.games)
    .slice(0, 10);
  const worstMatchups = [...allMatchups]
    .filter((m) => !bestMatchups.slice(0, 3).some(
      (b) =>
        b.myChampionId === m.myChampionId &&
        b.enemyChampionId === m.enemyChampionId &&
        b.role === m.role,
    ))
    .sort((a, b) => a.wilsonLower - b.wilsonLower || b.games - a.games)
    .slice(0, 10);

  const topAllySynergies: AllySynergyInsight[] = [...synergyMap.values()]
    .map((s) => ({
      ...finalize(s.bucket, baselineWr),
      myChampionId: s.myChampionId,
      allyChampionId: s.allyChampionId,
      allyChampionName: s.allyChampionName,
    }))
    .filter((s) => s.games >= 3)
    .sort((a, b) => b.wilsonLower - a.wilsonLower)
    .slice(0, 12);

  const temporal = buildTemporalInsights(matches, puuid, baselineWr);

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
    topAllySynergies,
    temporal,
  };
}

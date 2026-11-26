import {
  findPlayerByPuuid,
  getStoredMatchesForPlayer,
} from "@/lib/db/persist";
import { buildFingerprint } from "@/lib/stats/builds";
import { extractRunesFromParticipant, parseRuneFingerprint } from "@/lib/stats/runes";
import { normalizeRole, type RoleKey } from "@/lib/stats/roles";
import { wilsonLowerBound, winRate } from "@/lib/stats/wilson";
import { getRiotClient } from "@/lib/riot/client";
import type { PlatformRegion } from "@/lib/riot/regions";
import type { CurrentGameInfo, CurrentGameParticipant } from "@/lib/riot/types";
import { RiotApiError } from "@/lib/riot/client";

export type LiveParticipantView = {
  puuid: string | null;
  teamId: number;
  championId: number;
  spell1Id: number;
  spell2Id: number;
  isMe: boolean;
  perkStyle: number | null;
  perkSubStyle: number | null;
  keystone: number | null;
};

export type LiveBuildTip = {
  items: number[];
  games: number;
  wins: number;
  wr: number;
};

export type LiveRuneTip = {
  primaryStyle: number;
  keystone: number;
  subStyle: number;
  primaryPerkIds: number[];
  subPerkIds: number[];
  perkIds: number[];
  games: number;
  wins: number;
  wr: number;
};

export type AdaptBuildTip = LiveBuildTip & {
  enemyChampionId?: number;
  enemyChampionIds?: number[];
  overlap?: number;
  sampleNote?: string;
};

export type AdaptTips = {
  myChampionId: number;
  vsLanerBuild: AdaptBuildTip | null;
  vsCompBuild: AdaptBuildTip | null;
  notes: string[];
};

export type LiveCoachTips = {
  championId: number;
  personalGames: number;
  personalWins: number;
  personalWr: number;
  topBuild: LiveBuildTip | null;
  topRune: LiveRuneTip | null;
  matchup: {
    enemyChampionId: number;
    games: number;
    wins: number;
    wr: number;
  } | null;
  vsLanerBuild: AdaptBuildTip | null;
  vsCompBuild: AdaptBuildTip | null;
  notes: string[];
};

const MIN_LANER_SAMPLE = 2;
/** Plano: amostra mínima ~3 jogos vs composição soft. */
const MIN_COMP_SAMPLE = 3;
/** Soft: overlap ≥2 com amostra menor, ou overlap=1 com amostra ≥3. */
const MIN_COMP_SAMPLE_SOFT = 2;
const MIN_COMP_OVERLAP = 2;
const MIN_COMP_OVERLAP_SOFT = 1;

export type LiveGamePayload = {
  inGame: boolean;
  game: {
    gameId: number;
    gameMode: string;
    gameType: string;
    mapId: number;
    queueId: number | null;
    gameLength: number;
    gameStartTime: number;
  } | null;
  me: LiveParticipantView | null;
  enemyLaner: LiveParticipantView | null;
  allies: LiveParticipantView[];
  enemies: LiveParticipantView[];
  bans: { championId: number; teamId: number }[];
  tips: LiveCoachTips | null;
};

function toView(
  p: CurrentGameParticipant,
  mePuuid: string,
): LiveParticipantView {
  const perkIds = p.perks?.perkIds ?? [];
  return {
    puuid: p.puuid ?? null,
    teamId: p.teamId,
    championId: p.championId,
    spell1Id: p.spell1Id,
    spell2Id: p.spell2Id,
    isMe: p.puuid === mePuuid,
    perkStyle: p.perks?.perkStyle ?? null,
    perkSubStyle: p.perks?.perkSubStyle ?? null,
    keystone: perkIds[0] ?? null,
  };
}

async function buildPersonalTips(
  playerId: string,
  puuid: string,
  championId: number,
  enemyChampionId: number | null,
): Promise<
  Omit<
    LiveCoachTips,
    "notes" | "championId" | "vsLanerBuild" | "vsCompBuild"
  >
> {
  const matches = await getStoredMatchesForPlayer(playerId, {
    count: 200,
    queue: "ranked",
  });

  let games = 0;
  let wins = 0;
  let muGames = 0;
  let muWins = 0;
  const builds = new Map<string, { items: number[]; games: number; wins: number }>();
  const runes = new Map<string, { games: number; wins: number }>();

  for (const match of matches) {
    const me = match.info.participants.find((p) => p.puuid === puuid);
    if (!me || me.championId !== championId) continue;
    games += 1;
    if (me.win) wins += 1;

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

    if (enemyChampionId != null) {
      const myRole = normalizeRole(me.teamPosition, me.individualPosition);
      const enemy = match.info.participants.find(
        (p) =>
          p.teamId !== me.teamId &&
          p.championId === enemyChampionId &&
          normalizeRole(p.teamPosition, p.individualPosition) === myRole,
      );
      if (enemy) {
        muGames += 1;
        if (me.win) muWins += 1;
      }
    }
  }

  const topBuildEntry = [...builds.entries()].sort((a, b) => {
    const wa = wilsonLowerBound(a[1].wins, a[1].games);
    const wb = wilsonLowerBound(b[1].wins, b[1].games);
    return wb - wa || b[1].games - a[1].games;
  })[0];
  const topRuneEntry = [...runes.entries()].sort((a, b) => {
    const wa = wilsonLowerBound(a[1].wins, a[1].games);
    const wb = wilsonLowerBound(b[1].wins, b[1].games);
    return wb - wa || b[1].games - a[1].games;
  })[0];
  const parsed = topRuneEntry
    ? parseRuneFingerprint(topRuneEntry[0])
    : null;

  return {
    personalGames: games,
    personalWins: wins,
    personalWr: winRate(wins, games),
    topBuild: topBuildEntry
      ? {
          items: topBuildEntry[1].items,
          games: topBuildEntry[1].games,
          wins: topBuildEntry[1].wins,
          wr: winRate(topBuildEntry[1].wins, topBuildEntry[1].games),
        }
      : null,
    topRune:
      topRuneEntry && parsed
        ? {
            primaryStyle: parsed.primaryStyle,
            keystone: parsed.keystone,
            subStyle: parsed.subStyle,
            primaryPerkIds: parsed.primaryPerkIds,
            subPerkIds: parsed.subPerkIds,
            perkIds: parsed.perkIds,
            games: topRuneEntry[1].games,
            wins: topRuneEntry[1].wins,
            wr: winRate(topRuneEntry[1].wins, topRuneEntry[1].games),
          }
        : null,
    matchup:
      enemyChampionId != null && muGames > 0
        ? {
            enemyChampionId,
            games: muGames,
            wins: muWins,
            wr: winRate(muWins, muGames),
          }
        : null,
  };
}

function guessEnemyLaner(
  game: CurrentGameInfo,
  me: CurrentGameParticipant,
): CurrentGameParticipant | null {
  // Spectator não manda teamPosition; heurística fraca: primeiro inimigo
  // (melhor tip vem do histórico de matchup quando soubermos o champ).
  const enemies = game.participants.filter((p) => p.teamId !== me.teamId);
  return enemies[0] ?? null;
}

export async function getLiveCoachPayload(
  platform: PlatformRegion,
  puuid: string,
): Promise<LiveGamePayload> {
  const client = getRiotClient();
  let game: CurrentGameInfo;
  try {
    game = await client.getActiveGameByPuuid(platform, puuid);
  } catch (error) {
    if (error instanceof RiotApiError && error.status === 404) {
      return {
        inGame: false,
        game: null,
        me: null,
        enemyLaner: null,
        allies: [],
        enemies: [],
        bans: [],
        tips: null,
      };
    }
    throw error;
  }

  const meRaw =
    game.participants.find((p) => p.puuid === puuid) ??
    game.participants[0];
  if (!meRaw) {
    return {
      inGame: false,
      game: null,
      me: null,
      enemyLaner: null,
      allies: [],
      enemies: [],
      bans: [],
      tips: null,
    };
  }

  const me = toView(meRaw, puuid);
  const allies = game.participants
    .filter((p) => p.teamId === meRaw.teamId && p.puuid !== puuid)
    .map((p) => toView(p, puuid));
  const enemies = game.participants
    .filter((p) => p.teamId !== meRaw.teamId)
    .map((p) => toView(p, puuid));
  const enemyLanerRaw = guessEnemyLaner(game, meRaw);
  const enemyLaner = enemyLanerRaw ? toView(enemyLanerRaw, puuid) : null;

  const player = await findPlayerByPuuid(puuid);
  const notes: string[] = [];
  let tips: LiveCoachTips | null = null;

  if (player) {
    const enemyIds = enemies.map((e) => e.championId);
    const [personal, adapt] = await Promise.all([
      buildPersonalTips(
        player.id,
        puuid,
        me.championId,
        enemyLaner?.championId ?? null,
      ),
      buildAdaptTips(
        puuid,
        me.championId,
        enemyLaner?.championId ?? null,
        enemyIds,
      ),
    ]);

    if (personal.personalGames < 5) {
      notes.push(
        "Poucos jogos seus com esse champ no banco — sync mais partidas em Config.",
      );
    }
    if (personal.matchup && personal.matchup.games >= 3) {
      notes.push(
        personal.matchup.wr >= 0.55
          ? `Matchup histórico favorável (${Math.round(personal.matchup.wr * 100)}% em ${personal.matchup.games} jogos).`
          : personal.matchup.wr <= 0.45
            ? `Matchup histórico difícil (${Math.round(personal.matchup.wr * 100)}% em ${personal.matchup.games} jogos) — jogue safe.`
            : `Matchup equilibrado no seu histórico (${personal.matchup.games} jogos).`,
      );
    }
    notes.push(...adapt.notes);

    tips = {
      championId: me.championId,
      ...personal,
      vsLanerBuild: adapt.vsLanerBuild,
      vsCompBuild: adapt.vsCompBuild,
      notes,
    };
  } else {
    notes.push("Jogador ainda não está no banco — sincronize o perfil.");
    tips = {
      championId: me.championId,
      personalGames: 0,
      personalWins: 0,
      personalWr: 0,
      topBuild: null,
      topRune: null,
      matchup: null,
      vsLanerBuild: null,
      vsCompBuild: null,
      notes,
    };
  }

  return {
    inGame: true,
    game: {
      gameId: game.gameId,
      gameMode: game.gameMode,
      gameType: game.gameType,
      mapId: game.mapId,
      queueId: game.gameQueueConfigId ?? null,
      gameLength: game.gameLength,
      gameStartTime: game.gameStartTime,
    },
    me,
    enemyLaner,
    allies,
    enemies,
    bans: game.bannedChampions.map((b) => ({
      championId: b.championId,
      teamId: b.teamId,
    })),
    tips,
  };
}

function topBuildFromMap(
  builds: Map<string, { items: number[]; games: number; wins: number }>,
): LiveBuildTip | null {
  const entry = [...builds.entries()].sort((a, b) => {
    const wa = wilsonLowerBound(a[1].wins, a[1].games);
    const wb = wilsonLowerBound(b[1].wins, b[1].games);
    return wb - wa || b[1].games - a[1].games;
  })[0];
  if (!entry || entry[1].games < 1) return null;
  return {
    items: entry[1].items,
    games: entry[1].games,
    wins: entry[1].wins,
    wr: winRate(entry[1].wins, entry[1].games),
  };
}

type BuildBucket = { items: number[]; games: number; wins: number };
type CompBucket = BuildBucket & { overlap: number };

function bumpBuild(
  map: Map<string, BuildBucket>,
  fp: string,
  items: number[],
  win: boolean,
) {
  if (!map.has(fp)) map.set(fp, { items, games: 0, wins: 0 });
  const b = map.get(fp)!;
  b.games += 1;
  if (win) b.wins += 1;
}

function bumpComp(
  map: Map<string, CompBucket>,
  fp: string,
  items: number[],
  win: boolean,
  overlap: number,
) {
  if (!map.has(fp)) map.set(fp, { items, games: 0, wins: 0, overlap });
  const b = map.get(fp)!;
  b.games += 1;
  if (win) b.wins += 1;
  b.overlap = Math.max(b.overlap, overlap);
}

function bestCompEntry(map: Map<string, CompBucket>) {
  return [...map.entries()].sort(
    (a, b) => b[1].games - a[1].games || b[1].overlap - a[1].overlap,
  )[0];
}

/**
 * Builds contextuais vs laner e vs composição, com cascata de fallback:
 * laner same-role → vs champ any-role → pessoal;
 * comp overlap≥2 forte → soft (≥2 c/ 2j ou overlap=1 c/ 3j) → pessoal.
 */
export async function buildAdaptTips(
  puuid: string,
  myChampionId: number,
  enemyLanerId: number | null,
  enemyChampionIds: number[],
): Promise<AdaptTips> {
  const notes: string[] = [];
  const player = await findPlayerByPuuid(puuid);
  if (!player) {
    return {
      myChampionId,
      vsLanerBuild: null,
      vsCompBuild: null,
      notes: ["Jogador ainda não está no banco — sincronize o perfil."],
    };
  }

  const matches = await getStoredMatchesForPlayer(player.id, {
    count: 200,
    queue: "ranked",
  });

  const uniqueEnemies = [...new Set(enemyChampionIds.filter((id) => id > 0))];
  const lanerBuilds = new Map<string, BuildBucket>();
  const anyRoleVsChamp = new Map<string, BuildBucket>();
  const personalBuilds = new Map<string, BuildBucket>();
  const compStrong = new Map<string, CompBucket>();
  const compSoft = new Map<string, CompBucket>();
  let bestCompOverlap = 0;

  for (const match of matches) {
    const me = match.info.participants.find((p) => p.puuid === puuid);
    if (!me || me.championId !== myChampionId) continue;

    const myRole = normalizeRole(me.teamPosition, me.individualPosition);
    const enemyParts = match.info.participants.filter(
      (p) => p.teamId !== me.teamId,
    );
    const items = [
      me.item0,
      me.item1,
      me.item2,
      me.item3,
      me.item4,
      me.item5,
    ].filter((id) => id > 0);
    const fp = buildFingerprint(items);
    if (fp === "empty") continue;

    bumpBuild(personalBuilds, fp, items, me.win);

    if (enemyLanerId != null && enemyLanerId > 0) {
      const onLane = enemyParts.find(
        (p) =>
          p.championId === enemyLanerId &&
          normalizeRole(p.teamPosition, p.individualPosition) === myRole,
      );
      if (onLane) bumpBuild(lanerBuilds, fp, items, me.win);

      const anyRole = enemyParts.some((p) => p.championId === enemyLanerId);
      if (anyRole) bumpBuild(anyRoleVsChamp, fp, items, me.win);
    }

    if (uniqueEnemies.length >= MIN_COMP_OVERLAP_SOFT) {
      const histEnemyIds = new Set(enemyParts.map((p) => p.championId));
      const overlap = uniqueEnemies.filter((id) => histEnemyIds.has(id)).length;
      if (overlap >= MIN_COMP_OVERLAP) {
        bumpComp(compStrong, fp, items, me.win, overlap);
        bestCompOverlap = Math.max(bestCompOverlap, overlap);
      } else if (overlap >= MIN_COMP_OVERLAP_SOFT) {
        bumpComp(compSoft, fp, items, me.win, overlap);
        bestCompOverlap = Math.max(bestCompOverlap, overlap);
      }
    }
  }

  const personalTop = topBuildFromMap(personalBuilds);
  const lanerTop = topBuildFromMap(lanerBuilds);
  const anyRoleTop = topBuildFromMap(anyRoleVsChamp);

  let vsLanerBuild: AdaptBuildTip | null = null;
  if (lanerTop && lanerTop.games >= MIN_LANER_SAMPLE && enemyLanerId) {
    vsLanerBuild = {
      ...lanerTop,
      enemyChampionId: enemyLanerId,
      sampleNote: "Mesma lane",
    };
  } else if (
    anyRoleTop &&
    anyRoleTop.games >= MIN_LANER_SAMPLE &&
    enemyLanerId
  ) {
    vsLanerBuild = {
      ...anyRoleTop,
      enemyChampionId: enemyLanerId,
      sampleNote: "Vs este champ (fora da lane / amostra mista)",
    };
    notes.push(
      lanerTop
        ? `Só ${lanerTop.games} jogo(s) na mesma lane — usando histórico vs o champ em qualquer role.`
        : "Sem amostra na mesma lane — usando histórico vs este champ em qualquer role.",
    );
  } else if (personalTop && personalTop.games >= 1) {
    vsLanerBuild = {
      ...personalTop,
      enemyChampionId: enemyLanerId ?? undefined,
      sampleNote: enemyLanerId
        ? "Ordem pessoal · sem histórico vs este laner"
        : "Ordem pessoal",
    };
    if (enemyLanerId) {
      notes.push("Sem build histórica vs esse laner na lane.");
    }
  } else if (enemyLanerId) {
    notes.push("Sem build histórica vs esse laner na lane.");
  }

  const strongEntry = bestCompEntry(compStrong);
  const softEntry = bestCompEntry(compSoft);
  let vsCompBuild: AdaptBuildTip | null = null;

  if (strongEntry && strongEntry[1].games >= MIN_COMP_SAMPLE) {
    vsCompBuild = {
      items: strongEntry[1].items,
      games: strongEntry[1].games,
      wins: strongEntry[1].wins,
      wr: winRate(strongEntry[1].wins, strongEntry[1].games),
      enemyChampionIds: uniqueEnemies,
      overlap: bestCompOverlap,
      sampleNote: `Overlap ${bestCompOverlap} inimigos`,
    };
  } else if (
    strongEntry &&
    strongEntry[1].games >= MIN_COMP_SAMPLE_SOFT
  ) {
    vsCompBuild = {
      items: strongEntry[1].items,
      games: strongEntry[1].games,
      wins: strongEntry[1].wins,
      wr: winRate(strongEntry[1].wins, strongEntry[1].games),
      enemyChampionIds: uniqueEnemies,
      overlap: bestCompOverlap,
      sampleNote: `Amostra baixa · overlap ${strongEntry[1].overlap}`,
    };
    notes.push(
      `Poucos jogos com overlap ≥${MIN_COMP_OVERLAP} (${strongEntry[1].games}) — confiança baixa.`,
    );
  } else if (
    softEntry &&
    softEntry[1].games >= MIN_COMP_SAMPLE
  ) {
    vsCompBuild = {
      items: softEntry[1].items,
      games: softEntry[1].games,
      wins: softEntry[1].wins,
      wr: winRate(softEntry[1].wins, softEntry[1].games),
      enemyChampionIds: uniqueEnemies,
      overlap: softEntry[1].overlap,
      sampleNote: `Overlap parcial (${softEntry[1].overlap} inimigo)`,
    };
    notes.push("Overlap parcial de composição — confiança baixa.");
  } else if (personalTop && personalTop.games >= 1) {
    vsCompBuild = {
      ...personalTop,
      enemyChampionIds: uniqueEnemies,
      overlap: bestCompOverlap || undefined,
      sampleNote: "Ordem pessoal · sem overlap desta comp",
    };
    if (uniqueEnemies.length >= MIN_COMP_OVERLAP) {
      notes.push(
        strongEntry
          ? `Poucos jogos com overlap ≥${MIN_COMP_OVERLAP} (${strongEntry[1].games}).`
          : `Sem partidas com ≥${MIN_COMP_OVERLAP} inimigos em comum nesta composição.`,
      );
    }
  } else if (uniqueEnemies.length >= MIN_COMP_OVERLAP) {
    notes.push(
      `Sem partidas com ≥${MIN_COMP_OVERLAP} inimigos em comum nesta composição.`,
    );
  }

  return {
    myChampionId,
    vsLanerBuild,
    vsCompBuild,
    notes,
  };
}

export type { RoleKey };

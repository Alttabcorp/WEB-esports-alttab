import {
  findPlayerByPuuid,
  getReferenceInsightsForChampion,
  getStoredMatchesForPlayer,
  type ReferenceChampionInsight,
} from "@/lib/db/persist";
import { buildFingerprint } from "@/lib/stats/builds";
import { extractRunesFromParticipant, parseRuneFingerprint } from "@/lib/stats/runes";
import { normalizeRole, type RoleKey } from "@/lib/stats/roles";
import { winRate } from "@/lib/stats/wilson";
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
  references: ReferenceChampionInsight[];
  notes: string[];
};

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
): Promise<Omit<LiveCoachTips, "references" | "notes" | "championId">> {
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

  const topBuildEntry = [...builds.entries()].sort(
    (a, b) => b[1].games - a[1].games,
  )[0];
  const topRuneEntry = [...runes.entries()].sort(
    (a, b) => b[1].games - a[1].games,
  )[0];
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
    const personal = await buildPersonalTips(
      player.id,
      puuid,
      me.championId,
      enemyLaner?.championId ?? null,
    );
    const references = await getReferenceInsightsForChampion(me.championId);

    if (personal.personalGames < 5) {
      notes.push(
        "Poucos jogos seus com esse champ no banco — confie mais nas referências/meta.",
      );
    }
    if (references.length === 0) {
      notes.push(
        "Nenhuma referência com esse champ. Cadastre monos em Config.",
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

    tips = {
      championId: me.championId,
      ...personal,
      references,
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
      references: await getReferenceInsightsForChampion(me.championId),
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

export type { RoleKey };

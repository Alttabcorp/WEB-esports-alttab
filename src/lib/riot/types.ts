export type AccountDto = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

export type SummonerDto = {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
};

export type LeagueEntryDto = {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
  /** Presente nas respostas recentes da Riot. */
  puuid?: string;
  summonerId?: string;
};

export type LeagueItemDto = {
  puuid?: string;
  summonerId?: string;
  leaguePoints: number;
  rank: string;
  wins: number;
  losses: number;
  hotStreak?: boolean;
  veteran?: boolean;
  freshBlood?: boolean;
  inactive?: boolean;
};

export type LeagueListDto = {
  tier: string;
  leagueId: string;
  queue: string;
  name: string;
  entries: LeagueItemDto[];
};

export type RankedTier =
  | "IRON"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "EMERALD"
  | "DIAMOND"
  | "MASTER"
  | "GRANDMASTER"
  | "CHALLENGER";

export type RankedDivision = "I" | "II" | "III" | "IV";

export type PerkSelection = {
  perk: number;
  var1: number;
  var2: number;
  var3: number;
};

export type PerkStyle = {
  description: string;
  style: number;
  selections: PerkSelection[];
};

export type ParticipantPerks = {
  statPerks: {
    defense: number;
    flex: number;
    offense: number;
  };
  styles: PerkStyle[];
};

export type MatchParticipant = {
  puuid: string;
  championId: number;
  championName: string;
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  totalDamageDealtToChampions: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  teamPosition: string;
  individualPosition: string;
  lane: string;
  role: string;
  champLevel: number;
  goldEarned: number;
  timePlayed: number;
  summoner1Id?: number;
  summoner2Id?: number;
  perks?: ParticipantPerks;
};

export type MatchDto = {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameMode: string;
    gameType: string;
    /** Ex.: "14.23.590.6953" — usado para filtrar por patch. */
    gameVersion?: string;
    queueId: number;
    mapId: number;
    participants: MatchParticipant[];
  };
};

export type QueueFilter = "solo" | "flex" | "ranked" | "all";

export const QUEUE_IDS: Record<Exclude<QueueFilter, "all">, number[]> = {
  solo: [420],
  flex: [440],
  ranked: [420, 440],
};

/** Spectator-V5 — partida em andamento. */
export type CurrentGameParticipant = {
  puuid?: string;
  riotId?: string;
  summonerName?: string;
  teamId: number;
  championId: number;
  spell1Id: number;
  spell2Id: number;
  profileIconId?: number;
  bot?: boolean;
  perks?: {
    perkIds: number[];
    perkStyle: number;
    perkSubStyle: number;
  };
};

export type CurrentGameInfo = {
  gameId: number;
  gameType: string;
  gameStartTime: number;
  mapId: number;
  gameLength: number;
  platformId: string;
  gameMode: string;
  bannedChampions: { championId: number; teamId: number; pickTurn: number }[];
  gameQueueConfigId?: number;
  participants: CurrentGameParticipant[];
};

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

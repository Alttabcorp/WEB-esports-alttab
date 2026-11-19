import type { ConfidenceLevel } from "@/lib/stats/wilson";
import type { RankedDivision, RankedTier } from "@/lib/riot/types";

export type MetaBand = "PEER" | "HIGH";

export type MetaBuildRow = {
  fingerprint: string;
  items: number[];
  games: number;
  wins: number;
  wr: number;
  wilsonLower: number;
  confidence: ConfidenceLevel;
};

export type MetaRuneRow = {
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
  wilsonLower: number;
  confidence: ConfidenceLevel;
};

export type MetaMonoPlayer = {
  puuid: string;
  label: string;
  tier: string;
  games: number;
  wins: number;
  wr: number;
  topBuild: MetaBuildRow | null;
  topRune: MetaRuneRow | null;
};

export type MetaChampionResult = {
  band: MetaBand;
  platform: string;
  championId: number;
  tier: string | null;
  division: string | null;
  samplePlayers: number;
  sampleGames: number;
  overallWr: number;
  builds: MetaBuildRow[];
  runes: MetaRuneRow[];
  monos: MetaMonoPlayer[];
  cached: boolean;
  partial: boolean;
  note: string;
};

export type MetaCollectInput = {
  platform: string;
  championId: number;
  band: MetaBand;
  tier?: RankedTier | null;
  division?: RankedDivision | null;
};

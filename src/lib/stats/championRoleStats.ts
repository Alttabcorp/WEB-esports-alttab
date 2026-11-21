import type { MatchHistoryRow } from "@/lib/db/persist";
import { ROLE_LABELS, type RoleKey } from "@/lib/stats/roles";
import { winRate } from "@/lib/stats/wilson";

export type ChampRoleStat = {
  championId: number;
  championName: string;
  role: RoleKey;
  games: number;
  wins: number;
  losses: number;
  wr: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  cs: number;
  csPerMin: number;
  durationSec: number;
};

export type ChampOverview = {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  wr: number;
  kda: number;
  csPerMin: number;
  roles: ChampRoleStat[];
};

/**
 * Agrega histórico salvo por campeão × rota (lane).
 */
export function buildChampionRoleStats(
  matches: MatchHistoryRow[],
): {
  byChampRole: ChampRoleStat[];
  byChampion: ChampOverview[];
} {
  type Acc = {
    championId: number;
    championName: string;
    role: RoleKey;
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    durationSec: number;
  };

  const map = new Map<string, Acc>();

  for (const m of matches) {
    const role = (m.role || "UNKNOWN") as RoleKey;
    const key = `${m.championId}:${role}`;
    if (!map.has(key)) {
      map.set(key, {
        championId: m.championId,
        championName: m.championName,
        role,
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        cs: 0,
        durationSec: 0,
      });
    }
    const a = map.get(key)!;
    a.games += 1;
    if (m.win) a.wins += 1;
    a.kills += m.kills;
    a.deaths += m.deaths;
    a.assists += m.assists;
    a.cs += m.cs;
    a.durationSec += m.gameDuration;
  }

  const byChampRole: ChampRoleStat[] = [...map.values()]
    .map((a) => {
      const minutes = Math.max(a.durationSec / 60, 1);
      const deaths = Math.max(a.deaths, 1);
      return {
        championId: a.championId,
        championName: a.championName,
        role: a.role,
        games: a.games,
        wins: a.wins,
        losses: a.games - a.wins,
        wr: winRate(a.wins, a.games),
        kills: a.kills,
        deaths: a.deaths,
        assists: a.assists,
        kda: (a.kills + a.assists) / deaths,
        cs: a.cs,
        csPerMin: a.cs / minutes,
        durationSec: a.durationSec,
      };
    })
    .sort((a, b) => b.games - a.games);

  const champMap = new Map<number, ChampOverview & { _k: number; _d: number; _a: number; _cs: number; _dur: number; _w: number }>();

  for (const row of byChampRole) {
    if (!champMap.has(row.championId)) {
      champMap.set(row.championId, {
        championId: row.championId,
        championName: row.championName,
        games: 0,
        wins: 0,
        wr: 0,
        kda: 0,
        csPerMin: 0,
        roles: [],
        _k: 0,
        _d: 0,
        _a: 0,
        _cs: 0,
        _dur: 0,
        _w: 0,
      });
    }
    const c = champMap.get(row.championId)!;
    c.games += row.games;
    c.wins += row.wins;
    c._w += row.wins;
    c._k += row.kills;
    c._d += row.deaths;
    c._a += row.assists;
    c._cs += row.cs;
    c._dur += row.durationSec;
    c.roles.push(row);
  }

  const byChampion: ChampOverview[] = [...champMap.values()]
    .map((c) => {
      const minutes = Math.max(c._dur / 60, 1);
      const deaths = Math.max(c._d, 1);
      return {
        championId: c.championId,
        championName: c.championName,
        games: c.games,
        wins: c.wins,
        wr: winRate(c.wins, c.games),
        kda: (c._k + c._a) / deaths,
        csPerMin: c._cs / minutes,
        roles: c.roles.sort((a, b) => b.games - a.games),
      };
    })
    .sort((a, b) => b.games - a.games);

  return { byChampRole, byChampion };
}

export function roleFilterLabel(role: RoleKey | "ALL"): string {
  if (role === "ALL") return "Todas as lanes";
  return ROLE_LABELS[role] ?? role;
}

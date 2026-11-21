import type { MatchDto } from "@/lib/riot/types";

export type ChampEndgameBaseline = {
  championId: number;
  championName: string;
  games: number;
  avgCsPerMin: number;
  avgGoldPerMin: number;
  /** WR quando CS/min abaixo da média do champ. */
  wrWhenBehindCs: number | null;
  behindCsGames: number;
};

/**
 * Baselines de fim de jogo (sem timeline): CS/min e gold/min vs média do champ.
 */
export function buildEndgameBaselines(
  matches: MatchDto[],
  puuid: string,
): ChampEndgameBaseline[] {
  type Acc = {
    name: string;
    games: number;
    csPerMin: number[];
    goldPerMin: number[];
    behindCs: { win: boolean }[];
  };
  const map = new Map<number, Acc>();

  for (const match of matches) {
    const me = match.info.participants.find((p) => p.puuid === puuid);
    if (!me) continue;
    const mins = Math.max(1, match.info.gameDuration / 60);
    const cs =
      (me.totalMinionsKilled ?? 0) + (me.neutralMinionsKilled ?? 0);
    const gold = me.goldEarned ?? 0;
    const cspm = cs / mins;
    const gpm = gold / mins;
    if (!map.has(me.championId)) {
      map.set(me.championId, {
        name: me.championName,
        games: 0,
        csPerMin: [],
        goldPerMin: [],
        behindCs: [],
      });
    }
    const a = map.get(me.championId)!;
    a.games += 1;
    a.csPerMin.push(cspm);
    a.goldPerMin.push(gpm);
  }

  const out: ChampEndgameBaseline[] = [];
  for (const [championId, a] of map) {
    if (a.games < 5) continue;
    const avgCs =
      a.csPerMin.reduce((s, v) => s + v, 0) / a.csPerMin.length;
    const avgGold =
      a.goldPerMin.reduce((s, v) => s + v, 0) / a.goldPerMin.length;

    // second pass for behind-cs WR needs match iteration again
    const behind: boolean[] = [];
    const behindWins: boolean[] = [];
    for (const match of matches) {
      const me = match.info.participants.find((p) => p.puuid === puuid);
      if (!me || me.championId !== championId) continue;
      const mins = Math.max(1, match.info.gameDuration / 60);
      const cs =
        (me.totalMinionsKilled ?? 0) + (me.neutralMinionsKilled ?? 0);
      if (cs / mins < avgCs * 0.9) {
        behind.push(true);
        behindWins.push(me.win);
      }
    }

    out.push({
      championId,
      championName: a.name,
      games: a.games,
      avgCsPerMin: Math.round(avgCs * 10) / 10,
      avgGoldPerMin: Math.round(avgGold),
      wrWhenBehindCs:
        behindWins.length >= 3
          ? behindWins.filter(Boolean).length / behindWins.length
          : null,
      behindCsGames: behindWins.length,
    });
  }

  return out.sort((a, b) => b.games - a.games).slice(0, 10);
}

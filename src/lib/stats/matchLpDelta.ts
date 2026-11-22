import type { MatchDto } from "@/lib/riot/types";
import {
  FLEX_QUEUE,
  QUEUE_ID_BY_TYPE,
  SOLO_QUEUE,
} from "@/lib/stats/lpLedger";
import {
  buildMatchLpLedger,
  type RankSnapLite,
} from "@/lib/stats/matchLpLedger";
import {
  DEFAULT_AVG_LP_PER_LOSS,
  DEFAULT_AVG_LP_PER_WIN,
} from "@/lib/stats/dayGoal";

export type MatchLpDeltaSource = "snapshot" | "estimate";

export type MatchLpDeltaMap = Map<
  string,
  { lpDelta: number; source: MatchLpDeltaSource }
>;

type SnapWithQueue = RankSnapLite & { queueType: string };

/**
 * ΔPDL por matchId, isolando Solo (420) e Flex (440).
 * Snapshot entre partidas quando possível; senão estimativa win/loss.
 */
export function estimateMatchLpDeltas(input: {
  matches: MatchDto[];
  puuid: string;
  snapshots: SnapWithQueue[];
  avgWin?: number;
  avgLoss?: number;
}): MatchLpDeltaMap {
  const avgWin = input.avgWin ?? DEFAULT_AVG_LP_PER_WIN;
  const avgLoss = input.avgLoss ?? DEFAULT_AVG_LP_PER_LOSS;
  const out: MatchLpDeltaMap = new Map();

  for (const queueType of [SOLO_QUEUE, FLEX_QUEUE]) {
    const queueId = QUEUE_ID_BY_TYPE[queueType];
    const matches = input.matches.filter((m) => m.info.queueId === queueId);
    if (matches.length === 0) continue;
    const snaps = input.snapshots
      .filter((s) => s.queueType === queueType)
      .map((s) => ({ ladderScore: s.ladderScore, createdAt: s.createdAt }));
    const ledger = buildMatchLpLedger({
      matches,
      puuid: input.puuid,
      snapshots: snaps,
      avgWin,
      avgLoss,
    });
    for (const row of ledger.rows) {
      out.set(row.matchId, { lpDelta: row.lpDelta, source: row.source });
    }
  }

  // Filas não-ranked: só estimativa
  for (const m of input.matches) {
    if (out.has(m.metadata.matchId)) continue;
    const me = m.info.participants.find((p) => p.puuid === input.puuid);
    if (!me) continue;
    out.set(m.metadata.matchId, {
      lpDelta: me.win ? avgWin : -avgLoss,
      source: "estimate",
    });
  }

  return out;
}

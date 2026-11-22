import { describe, expect, it } from "vitest";
import { estimateMatchLpDeltas } from "./matchLpDelta";
import type { MatchDto } from "@/lib/riot/types";
import { FLEX_QUEUE, SOLO_QUEUE } from "./lpLedger";

function fakeMatch(
  matchId: string,
  queueId: number,
  createdAt: number,
  win: boolean,
  puuid = "me",
): MatchDto {
  return {
    metadata: { matchId, participants: [puuid] },
    info: {
      gameCreation: createdAt,
      gameDuration: 1800,
      gameMode: "CLASSIC",
      gameType: "MATCHED_GAME",
      queueId,
      mapId: 11,
      participants: [
        {
          puuid,
          teamId: 100,
          championId: 1,
          championName: "Ahri",
          win,
          kills: 1,
          deaths: 1,
          assists: 1,
          totalMinionsKilled: 100,
          neutralMinionsKilled: 0,
          item0: 0,
          item1: 0,
          item2: 0,
          item3: 0,
          item4: 0,
          item5: 0,
          item6: 0,
          summoner1Id: 4,
          summoner2Id: 14,
          champLevel: 11,
          goldEarned: 8000,
          totalDamageDealtToChampions: 10000,
          visionScore: 10,
          teamPosition: "MIDDLE",
          individualPosition: "MIDDLE",
        } as MatchDto["info"]["participants"][0],
      ],
    },
  } as MatchDto;
}

describe("estimateMatchLpDeltas", () => {
  it("isola Solo e Flex por queueId", () => {
    const t0 = Date.parse("2024-06-01T12:00:00-03:00");
    const matches = [
      fakeMatch("solo-1", 420, t0 + 3600_000, true),
      fakeMatch("flex-1", 440, t0 + 7200_000, true),
    ];
    const map = estimateMatchLpDeltas({
      matches,
      puuid: "me",
      snapshots: [
        {
          queueType: SOLO_QUEUE,
          ladderScore: 1000,
          createdAt: new Date(t0),
        },
        {
          queueType: SOLO_QUEUE,
          ladderScore: 1018,
          createdAt: new Date(t0 + 4000_000),
        },
        {
          queueType: FLEX_QUEUE,
          ladderScore: 500,
          createdAt: new Date(t0),
        },
        {
          queueType: FLEX_QUEUE,
          ladderScore: 510,
          createdAt: new Date(t0 + 8000_000),
        },
      ],
    });

    expect(map.get("solo-1")?.lpDelta).toBe(18);
    expect(map.get("solo-1")?.source).toBe("snapshot");
    expect(map.get("flex-1")?.lpDelta).toBe(10);
    expect(map.get("flex-1")?.source).toBe("snapshot");
  });

  it("estima quando não há snapshot", () => {
    const map = estimateMatchLpDeltas({
      matches: [fakeMatch("x", 420, Date.now(), false)],
      puuid: "me",
      snapshots: [],
      avgWin: 18,
      avgLoss: 16,
    });
    expect(map.get("x")).toEqual({ lpDelta: -16, source: "estimate" });
  });
});

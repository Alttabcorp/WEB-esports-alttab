import { describe, expect, it } from "vitest";
import { buildMatchLpLedger, expectedLpForChampion } from "./matchLpLedger";
import type { MatchDto } from "@/lib/riot/types";

function fakeMatch(
  id: string,
  createdAt: number,
  win: boolean,
): MatchDto {
  return {
    metadata: { matchId: id, participants: ["me"] },
    info: {
      gameCreation: createdAt,
      gameDuration: 1800,
      gameMode: "CLASSIC",
      gameType: "MATCHED_GAME",
      mapId: 11,
      queueId: 420,
      gameVersion: "14.10.1",
      participants: [
        {
          puuid: "me",
          championId: 103,
          championName: "Ahri",
          teamId: 100,
          win,
          teamPosition: "MIDDLE",
          individualPosition: "MIDDLE",
          item0: 0,
          item1: 0,
          item2: 0,
          item3: 0,
          item4: 0,
          item5: 0,
          item6: 0,
        },
      ],
    },
  } as unknown as MatchDto;
}

describe("matchLpLedger", () => {
  it("estima EV de champ", () => {
    expect(
      expectedLpForChampion({
        wr: 0.6,
        avgLpPerWin: 18,
        avgLpPerLoss: 16,
      }),
    ).toBeGreaterThan(0);
  });

  it("atribui delta entre snapshots", () => {
    const t0 = Date.parse("2024-06-01T12:00:00Z");
    const insights = buildMatchLpLedger({
      puuid: "me",
      matches: [
        fakeMatch("m1", t0 + 60_000, true),
        fakeMatch("m2", t0 + 120_000, false),
      ],
      snapshots: [
        { ladderScore: 1000, createdAt: new Date(t0) },
        { ladderScore: 1020, createdAt: new Date(t0 + 200_000) },
      ],
    });
    expect(insights.rows).toHaveLength(2);
    const sum = insights.rows.reduce((s, r) => s + r.lpDelta, 0);
    expect(Math.round(sum)).toBe(20);
    expect(insights.rows.every((r) => r.source === "snapshot")).toBe(true);
  });
});

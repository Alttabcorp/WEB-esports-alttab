import { describe, expect, it } from "vitest";
import type { MatchDto, MatchParticipant } from "@/lib/riot/types";
import { aggregatePlayerMatches } from "./aggregate";

function participant(
  overrides: Partial<MatchParticipant> & { puuid: string },
): MatchParticipant {
  return {
    championId: 1,
    championName: "Annie",
    teamId: 100,
    win: true,
    kills: 5,
    deaths: 2,
    assists: 7,
    totalMinionsKilled: 120,
    neutralMinionsKilled: 10,
    visionScore: 15,
    totalDamageDealtToChampions: 18000,
    item0: 3031,
    item1: 3072,
    item2: 3085,
    item3: 3006,
    item4: 0,
    item5: 0,
    item6: 3340,
    teamPosition: "MIDDLE",
    individualPosition: "MIDDLE",
    lane: "MIDDLE",
    role: "SOLO",
    champLevel: 16,
    goldEarned: 12000,
    timePlayed: 1800,
    ...overrides,
  };
}

function match(
  id: string,
  participants: MatchParticipant[],
): MatchDto {
  return {
    metadata: {
      matchId: id,
      participants: participants.map((p) => p.puuid),
    },
    info: {
      gameCreation: Date.now(),
      gameDuration: 1800,
      gameMode: "CLASSIC",
      gameType: "MATCHED_GAME",
      queueId: 420,
      mapId: 11,
      participants,
    },
  };
}

describe("aggregatePlayerMatches", () => {
  it("ranks champions with enough sample and computes lift", () => {
    const me = "player-1";
    const matches: MatchDto[] = [];

    for (let i = 0; i < 6; i++) {
      matches.push(
        match(`m-annie-${i}`, [
          participant({
            puuid: me,
            championId: 1,
            championName: "Annie",
            win: i < 5,
            teamId: 100,
          }),
          participant({
            puuid: `enemy-${i}`,
            championId: 103,
            championName: "Ahri",
            win: i >= 5,
            teamId: 200,
            teamPosition: "MIDDLE",
            individualPosition: "MIDDLE",
          }),
        ]),
      );
    }

    for (let i = 0; i < 3; i++) {
      matches.push(
        match(`m-garen-${i}`, [
          participant({
            puuid: me,
            championId: 86,
            championName: "Garen",
            win: false,
            teamId: 100,
            teamPosition: "TOP",
            individualPosition: "TOP",
            item0: 3078,
            item1: 3047,
          }),
          participant({
            puuid: `enemy-top-${i}`,
            championId: 122,
            championName: "Darius",
            win: true,
            teamId: 200,
            teamPosition: "TOP",
            individualPosition: "TOP",
          }),
        ]),
      );
    }

    const result = aggregatePlayerMatches(matches, me);

    expect(result.analyzedGames).toBe(9);
    expect(result.topRecommendations[0]?.championName).toBe("Annie");
    expect(result.topRecommendations[0]?.games).toBe(6);
    expect(result.roles.some((r) => r.role === "MIDDLE")).toBe(true);
    expect(result.champions[0]?.topBuilds.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import type { MatchDto, MatchParticipant } from "@/lib/riot/types";
import {
  buildTemporalInsights,
  patchFromGameVersion,
  SESSION_GAP_MS,
} from "./temporal";

function p(win: boolean, puuid = "me"): MatchParticipant {
  return {
    puuid,
    championId: 1,
    championName: "A",
    teamId: 100,
    win,
    kills: 1,
    deaths: 1,
    assists: 1,
    totalMinionsKilled: 10,
    neutralMinionsKilled: 0,
    visionScore: 1,
    totalDamageDealtToChampions: 1000,
    item0: 0,
    item1: 0,
    item2: 0,
    item3: 0,
    item4: 0,
    item5: 0,
    item6: 0,
    teamPosition: "TOP",
    individualPosition: "TOP",
    lane: "TOP",
    role: "SOLO",
    champLevel: 10,
    goldEarned: 1000,
    timePlayed: 1200,
  };
}

function m(
  createdAt: number,
  win: boolean,
  version = "14.23.1",
): MatchDto {
  return {
    metadata: { matchId: `m-${createdAt}`, participants: ["me"] },
    info: {
      gameCreation: createdAt,
      gameDuration: 1200,
      gameMode: "CLASSIC",
      gameType: "MATCHED_GAME",
      gameVersion: version,
      queueId: 420,
      mapId: 11,
      participants: [p(win)],
    },
  };
}

describe("patchFromGameVersion", () => {
  it("keeps major.minor", () => {
    expect(patchFromGameVersion("14.23.590.6953")).toBe("14.23");
  });
});

describe("buildTemporalInsights", () => {
  it("detects session decay and streak trap alerts with enough samples", () => {
    const base = Date.parse("2024-06-03T20:00:00-03:00"); // Monday evening BRT
    const matches: MatchDto[] = [];

    // 10 sessions: win first, lose second
    for (let s = 0; s < 10; s++) {
      const t0 = base + s * SESSION_GAP_MS * 2;
      matches.push(m(t0, true));
      matches.push(m(t0 + 40 * 60 * 1000, false));
    }

    // After 3 wins, next often loses — build 8 samples
    let t = base + 30 * SESSION_GAP_MS;
    for (let i = 0; i < 8; i++) {
      matches.push(m(t, true));
      t += 30 * 60 * 1000;
      matches.push(m(t, true));
      t += 30 * 60 * 1000;
      matches.push(m(t, true));
      t += 30 * 60 * 1000;
      matches.push(m(t, false)); // after 3 wins
      t += SESSION_GAP_MS * 2;
    }

    const insights = buildTemporalInsights(matches, "me", 0.5);
    expect(insights.byPatch[0]?.patch).toBe("14.23");
    expect(insights.sessionIndex.find((s) => s.index === 1)?.wr).toBeGreaterThan(
      insights.sessionIndex.find((s) => s.index === 2)?.wr ?? 1,
    );
    expect(insights.alerts.some((a) => a.id === "session-decay")).toBe(true);
    expect(
      insights.alerts.some((a) => a.id.startsWith("streak-trap")),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { computeDayLpSummary, ladderScore } from "./lpLedger";

describe("ladderScore", () => {
  it("orders divisions within a tier", () => {
    expect(ladderScore("GOLD", "IV", 0)).toBeLessThan(
      ladderScore("GOLD", "I", 50),
    );
  });

  it("promotes across tiers", () => {
    expect(ladderScore("GOLD", "I", 99)).toBeLessThan(
      ladderScore("PLATINUM", "IV", 0),
    );
  });
});

describe("computeDayLpSummary", () => {
  it("computes day delta from snapshots", () => {
    const day = Date.parse("2024-06-03T00:00:00-03:00");
    const summary = computeDayLpSummary({
      now: day + 8 * 60 * 60_000,
      snapshots: [
        {
          queueType: "RANKED_SOLO_5x5",
          tier: "GOLD",
          rank: "II",
          lp: 40,
          wins: 10,
          losses: 8,
          ladderScore: ladderScore("GOLD", "II", 40),
          createdAt: new Date(day + 60 * 60_000),
        },
        {
          queueType: "RANKED_SOLO_5x5",
          tier: "GOLD",
          rank: "II",
          lp: 68,
          wins: 12,
          losses: 9,
          ladderScore: ladderScore("GOLD", "II", 68),
          createdAt: new Date(day + 5 * 60 * 60_000),
        },
      ],
      gamesToday: [
        { win: true, createdAt: day + 2 * 60 * 60_000 },
        { win: true, createdAt: day + 4 * 60 * 60_000 },
        { win: false, createdAt: day + 5 * 60 * 60_000 },
      ],
    });

    expect(summary.lpDelta).toBe(28);
    expect(summary.winsToday).toBe(2);
    expect(summary.lossesToday).toBe(1);
    expect(summary.lpPerHour).not.toBeNull();
  });
});

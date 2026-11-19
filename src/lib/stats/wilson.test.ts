import { describe, expect, it } from "vitest";
import {
  confidenceFromSample,
  winRate,
  wilsonLowerBound,
} from "./wilson";

describe("wilsonLowerBound", () => {
  it("returns 0 for empty sample", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });

  it("penalizes tiny perfect samples vs larger ones", () => {
    const oneGame = wilsonLowerBound(1, 1);
    const tenGames = wilsonLowerBound(10, 10);
    expect(tenGames).toBeGreaterThan(oneGame);
  });

  it("is below raw win rate for imperfect samples", () => {
    const wins = 7;
    const games = 10;
    expect(wilsonLowerBound(wins, games)).toBeLessThan(winRate(wins, games));
  });
});

describe("confidenceFromSample", () => {
  it("maps sample sizes to confidence bands", () => {
    expect(confidenceFromSample(2)).toBe("low");
    expect(confidenceFromSample(5)).toBe("medium");
    expect(confidenceFromSample(20)).toBe("high");
  });
});

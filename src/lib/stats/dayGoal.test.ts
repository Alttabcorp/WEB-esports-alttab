import { describe, expect, it } from "vitest";
import {
  computeDayGoalProgress,
  dayGoalVerb,
  resolveGoalForQueue,
} from "./dayGoal";

describe("dayGoal", () => {
  it("estima wins restantes para a meta", () => {
    const g = computeDayGoalProgress({
      target: 30,
      stopLoss: -40,
      delta: 12,
      avgLpPerWin: 18,
    });
    expect(g.gamesRemainingEst).toBe(1);
    expect(g.status).toBe("onTrack");
    expect(dayGoalVerb(g)).toMatch(/win/i);
  });

  it("marca meta batida", () => {
    const g = computeDayGoalProgress({
      target: 30,
      delta: 32,
    });
    expect(g.goalHit).toBe(true);
    expect(g.status).toBe("goalHit");
  });

  it("resolveGoalForQueue: Flex herda Solo quando Flex é null", () => {
    const g = resolveGoalForQueue(
      { dailyLpTarget: 30, dailyLpStop: -40, dailyLpTargetFlex: null },
      "flex",
    );
    expect(g.target).toBe(30);
    expect(g.stopLoss).toBe(-40);
    expect(g.inheritedFromSolo).toBe(true);
  });

  it("resolveGoalForQueue: Flex usa meta própria", () => {
    const g = resolveGoalForQueue(
      {
        dailyLpTarget: 30,
        dailyLpStop: -40,
        dailyLpTargetFlex: 20,
        dailyLpStopFlex: -25,
      },
      "flex",
    );
    expect(g.target).toBe(20);
    expect(g.stopLoss).toBe(-25);
    expect(g.inheritedFromSolo).toBe(false);
  });
});

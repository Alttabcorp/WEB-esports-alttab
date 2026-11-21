import { describe, expect, it } from "vitest";
import { computeDayGoalProgress, dayGoalVerb } from "./dayGoal";

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
});

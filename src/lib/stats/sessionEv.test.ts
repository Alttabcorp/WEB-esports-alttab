import { describe, expect, it } from "vitest";
import { computeSessionEv } from "./sessionEv";
import { computeDayGoalProgress } from "./dayGoal";
import type { TemporalInsights } from "./temporal";

const emptyTemporal = (): TemporalInsights =>
  ({
    timezone: "America/Sao_Paulo",
    byHour: [],
    byDayOfWeek: [],
    byPatch: [],
    currentPatch: null,
    sessionIndex: [],
    afterWinStreaks: [],
    afterLossStreaks: [],
    byRefillGap: [],
    bySessionLength: [],
    recentForm: null,
    champByHour: [],
    roleByHour: [],
    avoidList: [],
    bestPlayWindow: null,
    bestDay: null,
    alerts: [],
  }) as TemporalInsights;

describe("sessionEv", () => {
  it("para em stop-loss", () => {
    const goal = computeDayGoalProgress({
      target: 30,
      stopLoss: -40,
      delta: -45,
    });
    const ev = computeSessionEv({
      temporal: emptyTemporal(),
      goal,
      nextSessionIndex: 2,
      lossStreak: 0,
      winStreak: 0,
    });
    expect(ev.label).toBe("stop");
  });

  it("sobe score com janela boa e meta ok", () => {
    const temporal = emptyTemporal();
    temporal.bestPlayWindow = {
      key: "18",
      label: "18–21h",
      games: 20,
      wins: 14,
      wr: 0.7,
      wilsonLower: 0.5,
      lift: 0.12,
      confidence: "high",
    };
    const goal = computeDayGoalProgress({ target: 30, delta: 10 });
    const ev = computeSessionEv({
      temporal,
      goal,
      nextSessionIndex: 1,
      lossStreak: 0,
      winStreak: 0,
      now: Date.parse("2024-06-03T19:30:00-03:00"),
    });
    expect(ev.score).toBeGreaterThanOrEqual(1);
  });
});

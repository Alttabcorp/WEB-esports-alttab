import { describe, expect, it } from "vitest";
import {
  buildPlayerScorecard,
  sortAlertsByPriority,
  suggestSessionLimit,
} from "./playerRhythm";
import type { TemporalInsights } from "./temporal";
import { PLAYER_TIMEZONE } from "./temporal";

function emptyTemporal(
  overrides: Partial<TemporalInsights> = {},
): TemporalInsights {
  return {
    timezone: PLAYER_TIMEZONE,
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
    ...overrides,
  };
}

describe("playerRhythm", () => {
  it("ordena avisos warn antes de info e good", () => {
    const sorted = sortAlertsByPriority([
      { severity: "good" as const },
      { severity: "warn" as const },
      { severity: "info" as const },
    ]);
    expect(sorted.map((a) => a.severity)).toEqual(["warn", "info", "good"]);
  });

  it("scorecard soma ΔPDL dos últimos N dias", () => {
    const calendar = Array.from({ length: 10 }, (_, i) => ({
      day: `2026-01-${String(i + 1).padStart(2, "0")}`,
      // Últimos 7 dias (slice) com +2 cada → 14
      lpDelta: i >= 3 ? 2 : 10,
      startScore: null,
      endScore: null,
      snapshots: 1,
    }));
    const card = buildPlayerScorecard({
      calendar,
      temporal: emptyTemporal({
        recentForm: {
          key: "form",
          label: "Forma",
          games: 10,
          wins: 6,
          wr: 0.6,
          wilsonLower: 0.4,
          lift: 0.05,
          confidence: "medium",
        },
        bestPlayWindow: {
          key: "18",
          label: "18–21h",
          games: 20,
          wins: 12,
          wr: 0.6,
          wilsonLower: 0.45,
          lift: 0.08,
          confidence: "medium",
        },
      }),
      days: 7,
    });
    expect(card.lpDelta).toBe(14);
    expect(card.bestWindowLabel).toBe("18–21h");
  });

  it("sugere limite quando índice de sessão sangra", () => {
    const tip = suggestSessionLimit(
      emptyTemporal({
        sessionIndex: [
          {
            key: "4",
            label: "4ª+",
            index: 4,
            games: 12,
            wins: 3,
            wr: 0.25,
            wilsonLower: 0.1,
            lift: -0.2,
            confidence: "medium",
          },
        ],
      }),
    );
    expect(tip?.id).toBe("session-index-limit");
    expect(tip?.verb).toMatch(/4/);
  });
});

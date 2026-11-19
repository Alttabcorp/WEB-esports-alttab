import { describe, expect, it } from "vitest";
import type { AggregateResult } from "./aggregate";
import { buildContextualPool } from "./contextualPool";
import type { TemporalInsights } from "./temporal";

function emptyTemporal(): TemporalInsights {
  return {
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
    champByHour: [
      {
        key: "1@18",
        label: "A · 18h–21h",
        games: 8,
        wins: 6,
        wr: 0.75,
        wilsonLower: 0.45,
        lift: 0.2,
        confidence: "medium",
        championId: 1,
        championName: "Ahri",
        hourWindow: 18,
      },
    ],
    roleByHour: [],
    avoidList: [
      {
        key: "champ-2",
        label: "Bad",
        games: 10,
        wins: 2,
        wr: 0.2,
        wilsonLower: 0.05,
        lift: -0.2,
        confidence: "medium",
        kind: "champion",
        championId: 2,
        championName: "Bad",
      },
    ],
    bestPlayWindow: null,
    bestDay: null,
    alerts: [],
  };
}

describe("buildContextualPool", () => {
  it("prefers hot hour champ and skips avoid list", () => {
    const analysis = {
      overallWr: 0.5,
      champions: [
        {
          championId: 1,
          championName: "Ahri",
          games: 20,
          wins: 12,
          wr: 0.6,
          wilsonLower: 0.45,
          lift: 0.1,
          confidence: "high",
          kda: 3,
          csPerMin: 7,
          avgDamage: 1,
          topBuilds: [],
          topRunes: [],
          matchups: [],
          allySynergies: [],
          matchupBuilds: [],
          matchupRunes: [],
          matchupSpells: [],
        },
        {
          championId: 2,
          championName: "Bad",
          games: 20,
          wins: 4,
          wr: 0.2,
          wilsonLower: 0.1,
          lift: -0.3,
          confidence: "medium",
          kda: 1,
          csPerMin: 5,
          avgDamage: 1,
          topBuilds: [],
          topRunes: [],
          matchups: [],
          allySynergies: [],
          matchupBuilds: [],
          matchupRunes: [],
          matchupSpells: [],
        },
      ],
      temporal: emptyTemporal(),
    } as unknown as AggregateResult;

    // Fix hour window to 18 for deterministic test
    const picks = buildContextualPool({
      analysis,
      limit: 5,
      now: Date.parse("2024-06-03T19:00:00-03:00"),
    });

    expect(picks.some((p) => p.championId === 2)).toBe(false);
    expect(picks[0]?.championId).toBe(1);
  });
});

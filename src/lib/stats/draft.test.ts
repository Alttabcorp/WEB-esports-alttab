import { describe, expect, it } from "vitest";
import type { AggregateResult, ChampionInsight } from "./aggregate";
import { PLAYER_TIMEZONE } from "./temporal";
import { recommendDraftPicks } from "./draft";

function emptyRanked(overrides: Partial<ChampionInsight> & {
  championId: number;
  championName: string;
}): ChampionInsight {
  return {
    games: 10,
    wins: 6,
    kills: 50,
    deaths: 20,
    assists: 40,
    damage: 100000,
    cs: 1500,
    vision: 100,
    durationSec: 18000,
    wr: 0.6,
    wilsonLower: 0.4,
    lift: 0.05,
    confidence: "medium",
    kda: 4.5,
    csPerMin: 5,
    avgDamage: 10000,
    topBuilds: [
      {
        games: 5,
        wins: 3,
        kills: 0,
        deaths: 0,
        assists: 0,
        damage: 0,
        cs: 0,
        vision: 0,
        durationSec: 0,
        wr: 0.6,
        wilsonLower: 0.35,
        lift: 0.05,
        confidence: "medium",
        kda: 0,
        csPerMin: 0,
        avgDamage: 0,
        fingerprint: "3031-3072",
        items: [3031, 3072],
        championId: overrides.championId,
      },
    ],
    topRunes: [
      {
        games: 5,
        wins: 4,
        kills: 0,
        deaths: 0,
        assists: 0,
        damage: 0,
        cs: 0,
        vision: 0,
        durationSec: 0,
        wr: 0.8,
        wilsonLower: 0.45,
        lift: 0.1,
        confidence: "medium",
        kda: 0,
        csPerMin: 0,
        avgDamage: 0,
        fingerprint: "8000:8005-9111|8100:8139-8135",
        primaryStyle: 8000,
        keystone: 8005,
        subStyle: 8100,
        primaryPerkIds: [8005, 9111],
        subPerkIds: [8139, 8135],
        perkIds: [8005, 9111, 8139, 8135],
        championId: overrides.championId,
        role: "MIDDLE",
      },
    ],
    matchups: [],
    allySynergies: [],
    matchupBuilds: [],
    matchupRunes: [],
    matchupSpells: [],
    ...overrides,
  };
}

function baseAnalysis(champions: ChampionInsight[]): AggregateResult {
  return {
    analyzedGames: 20,
    wins: 10,
    losses: 10,
    overallWr: 0.5,
    champions,
    roles: [],
    topRecommendations: champions.slice(0, 3),
    bestMatchups: [],
    worstMatchups: [],
    topAllySynergies: [],
    temporal: {
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
    },
  };
}

describe("recommendDraftPicks", () => {
  it("ranks champion with strong lane matchup higher", () => {
    const annie = emptyRanked({
      championId: 1,
      championName: "Annie",
      wilsonLower: 0.35,
      matchups: [
        {
          myChampionId: 1,
          enemyChampionId: 238,
          enemyChampionName: "Zed",
          role: "MIDDLE",
          games: 12,
          wins: 9,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          cs: 0,
          vision: 0,
          durationSec: 0,
          wr: 0.75,
          wilsonLower: 0.55,
          lift: 0.25,
          confidence: "medium",
          kda: 0,
          csPerMin: 0,
          avgDamage: 0,
        },
      ],
    });

    const ahri = emptyRanked({
      championId: 103,
      championName: "Ahri",
      wilsonLower: 0.42,
      matchups: [
        {
          myChampionId: 103,
          enemyChampionId: 238,
          enemyChampionName: "Zed",
          role: "MIDDLE",
          games: 8,
          wins: 2,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          cs: 0,
          vision: 0,
          durationSec: 0,
          wr: 0.25,
          wilsonLower: 0.1,
          lift: -0.2,
          confidence: "medium",
          kda: 0,
          csPerMin: 0,
          avgDamage: 0,
        },
      ],
    });

    const result = recommendDraftPicks(baseAnalysis([annie, ahri]), {
      role: "MIDDLE",
      enemyChampionIds: [238],
    });

    expect(result.recommendations[0]?.championName).toBe("Annie");
    expect(result.recommendations[0]?.reasons[0]).toContain("Zed");
    expect(result.recommendations[0]?.topRune?.fingerprint).toBe(
      "8000:8005-9111|8100:8139-8135",
    );
  });

  it("boosts champion with ally synergy", () => {
    const ornn = emptyRanked({
      championId: 516,
      championName: "Ornn",
      wilsonLower: 0.35,
      matchups: [
        {
          myChampionId: 516,
          enemyChampionId: 122,
          enemyChampionName: "Darius",
          role: "TOP",
          games: 8,
          wins: 4,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          cs: 0,
          vision: 0,
          durationSec: 0,
          wr: 0.5,
          wilsonLower: 0.3,
          lift: 0,
          confidence: "medium",
          kda: 0,
          csPerMin: 0,
          avgDamage: 0,
        },
      ],
      allySynergies: [
        {
          myChampionId: 516,
          allyChampionId: 222,
          allyChampionName: "Jinx",
          games: 10,
          wins: 8,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          cs: 0,
          vision: 0,
          durationSec: 0,
          wr: 0.8,
          wilsonLower: 0.55,
          lift: 0.25,
          confidence: "medium",
          kda: 0,
          csPerMin: 0,
          avgDamage: 0,
        },
      ],
    });

    const sett = emptyRanked({
      championId: 875,
      championName: "Sett",
      wilsonLower: 0.4,
      matchups: [
        {
          myChampionId: 875,
          enemyChampionId: 122,
          enemyChampionName: "Darius",
          role: "TOP",
          games: 8,
          wins: 5,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          cs: 0,
          vision: 0,
          durationSec: 0,
          wr: 0.625,
          wilsonLower: 0.38,
          lift: 0.1,
          confidence: "medium",
          kda: 0,
          csPerMin: 0,
          avgDamage: 0,
        },
      ],
    });

    const result = recommendDraftPicks(baseAnalysis([ornn, sett]), {
      role: "TOP",
      enemyChampionIds: [122],
      allyChampionIds: [222],
    });

    expect(result.recommendations[0]?.championName).toBe("Ornn");
    expect(result.recommendations[0]?.reasons.some((r) => r.includes("Jinx"))).toBe(
      true,
    );
  });

  it("attaches matchup build rune and spells", () => {
    const ornn = emptyRanked({
      championId: 516,
      championName: "Ornn",
      matchups: [
        {
          myChampionId: 516,
          enemyChampionId: 122,
          enemyChampionName: "Darius",
          role: "TOP",
          games: 10,
          wins: 7,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          cs: 0,
          vision: 0,
          durationSec: 0,
          wr: 0.7,
          wilsonLower: 0.45,
          lift: 0.15,
          confidence: "medium",
          kda: 0,
          csPerMin: 0,
          avgDamage: 0,
        },
      ],
      matchupBuilds: [
        {
          myChampionId: 516,
          enemyChampionId: 122,
          enemyChampionName: "Darius",
          role: "TOP",
          fingerprint: "3068-3075",
          items: [3068, 3075],
          games: 6,
          wins: 5,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          cs: 0,
          vision: 0,
          durationSec: 0,
          wr: 0.83,
          wilsonLower: 0.48,
          lift: 0.2,
          confidence: "medium",
          kda: 0,
          csPerMin: 0,
          avgDamage: 0,
        },
      ],
      matchupRunes: [
        {
          myChampionId: 516,
          enemyChampionId: 122,
          enemyChampionName: "Darius",
          role: "TOP",
          fingerprint: "8400:8437-8446|8300:8345-8347",
          primaryStyle: 8400,
          keystone: 8437,
          subStyle: 8300,
          primaryPerkIds: [8437, 8446],
          subPerkIds: [8345, 8347],
          perkIds: [8437, 8446, 8345, 8347],
          games: 6,
          wins: 5,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          cs: 0,
          vision: 0,
          durationSec: 0,
          wr: 0.83,
          wilsonLower: 0.48,
          lift: 0.2,
          confidence: "medium",
          kda: 0,
          csPerMin: 0,
          avgDamage: 0,
        },
      ],
      matchupSpells: [
        {
          myChampionId: 516,
          enemyChampionId: 122,
          enemyChampionName: "Darius",
          role: "TOP",
          fingerprint: "4-12",
          spellIds: [4, 12],
          games: 6,
          wins: 5,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          cs: 0,
          vision: 0,
          durationSec: 0,
          wr: 0.83,
          wilsonLower: 0.48,
          lift: 0.2,
          confidence: "medium",
          kda: 0,
          csPerMin: 0,
          avgDamage: 0,
        },
      ],
    });

    const result = recommendDraftPicks(baseAnalysis([ornn]), {
      role: "TOP",
      enemyChampionIds: [122],
    });

    expect(result.recommendations[0]?.vsBuild?.fingerprint).toBe("3068-3075");
    expect(result.recommendations[0]?.vsRune?.keystone).toBe(8437);
    expect(result.recommendations[0]?.vsSpells?.spellIds).toEqual([4, 12]);
  });

  it("excludes banned champions", () => {
    const annie = emptyRanked({
      championId: 1,
      championName: "Annie",
      matchups: [
        {
          myChampionId: 1,
          enemyChampionId: 238,
          enemyChampionName: "Zed",
          role: "MIDDLE",
          games: 10,
          wins: 6,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          cs: 0,
          vision: 0,
          durationSec: 0,
          wr: 0.6,
          wilsonLower: 0.4,
          lift: 0.1,
          confidence: "medium",
          kda: 0,
          csPerMin: 0,
          avgDamage: 0,
        },
      ],
    });

    const result = recommendDraftPicks(baseAnalysis([annie]), {
      role: "MIDDLE",
      enemyChampionIds: [238],
      bannedChampionIds: [1],
    });

    expect(result.recommendations).toHaveLength(0);
  });

  it("excludes enemy and ally picks already on the board", () => {
    const annie = emptyRanked({
      championId: 1,
      championName: "Annie",
      games: 20,
      wins: 14,
      wr: 0.7,
      wilsonLower: 0.55,
      matchups: [
        {
          myChampionId: 1,
          enemyChampionId: 238,
          enemyChampionName: "Zed",
          role: "MIDDLE",
          games: 10,
          wins: 7,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          cs: 0,
          vision: 0,
          durationSec: 0,
          wr: 0.7,
          wilsonLower: 0.5,
          lift: 0.1,
          confidence: "medium",
          kda: 0,
          csPerMin: 0,
          avgDamage: 0,
        },
      ],
    });
    const ahri = emptyRanked({
      championId: 103,
      championName: "Ahri",
      games: 12,
      wins: 7,
      wr: 0.58,
      wilsonLower: 0.4,
      matchups: [
        {
          myChampionId: 103,
          enemyChampionId: 238,
          enemyChampionName: "Zed",
          role: "MIDDLE",
          games: 8,
          wins: 4,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          cs: 0,
          vision: 0,
          durationSec: 0,
          wr: 0.5,
          wilsonLower: 0.35,
          lift: 0,
          confidence: "medium",
          kda: 0,
          csPerMin: 0,
          avgDamage: 0,
        },
      ],
    });

    const stolen = recommendDraftPicks(baseAnalysis([annie, ahri]), {
      role: "MIDDLE",
      enemyChampionIds: [1],
      allyChampionIds: [],
      bannedChampionIds: [],
    });
    expect(stolen.recommendations.map((r) => r.championId)).toEqual([103]);

    const allyTook = recommendDraftPicks(baseAnalysis([annie, ahri]), {
      role: "MIDDLE",
      enemyChampionIds: [],
      allyChampionIds: [1],
      bannedChampionIds: [],
    });
    expect(allyTook.recommendations.map((r) => r.championId)).toEqual([103]);
  });
});

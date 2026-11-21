import { describe, expect, it } from "vitest";
import {
  buildInGameDecision,
  buildLcdSignals,
} from "./lcdSignals";
import type { LiveClientSnapshot } from "./clientData";

function snap(partial: {
  gameTime?: number;
  deaths?: number;
  kills?: number;
  assists?: number;
  hp?: number;
  maxHp?: number;
  cs?: number;
  gold?: number;
  laner?: { name: string; kills: number; deaths: number; assists: number; cs: number };
}): LiveClientSnapshot {
  const me = {
    riotId: "a#BR1",
    championName: "Ahri",
    level: 11,
    currentGold: partial.gold ?? 1200,
    currentHealth: partial.hp ?? 1000,
    maxHealth: partial.maxHp ?? 1000,
    kills: partial.kills ?? 2,
    deaths: partial.deaths ?? 0,
    assists: partial.assists ?? 3,
    creepScore: partial.cs ?? 80,
    items: [],
  };
  const players = [
    {
      riotId: "a#BR1",
      summonerName: "a",
      championName: "Ahri",
      team: "ORDER",
      level: 11,
      kills: me.kills,
      deaths: me.deaths,
      assists: me.assists,
      creepScore: me.creepScore,
      items: [],
      isMe: true,
    },
  ];
  if (partial.laner) {
    players.push({
      riotId: "b#BR1",
      summonerName: "b",
      championName: partial.laner.name,
      team: "CHAOS",
      level: 11,
      kills: partial.laner.kills,
      deaths: partial.laner.deaths,
      assists: partial.laner.assists,
      creepScore: partial.laner.cs,
      items: [],
      isMe: false,
    });
  }
  return {
    source: "live-client",
    receivedAt: Date.now(),
    bridgeOnline: true,
    phase: "inGame",
    inGame: true,
    puuid: "p",
    draft: null,
    game: {
      gameMode: "CLASSIC",
      gameTime: (partial.gameTime ?? 12) * 60,
      mapName: "Map11",
    },
    me,
    players,
    recentEvents: [],
  };
}

describe("lcdSignals / in-game decision", () => {
  it("prioriza HP crítico", () => {
    const d = buildInGameDecision(
      snap({ hp: 100, maxHp: 1000, deaths: 5, gameTime: 18 }),
    );
    expect(d?.verb).toMatch(/HP crítico/i);
  });

  it("sugere safe vs laner atrás", () => {
    const d = buildInGameDecision(
      snap({
        gameTime: 10,
        cs: 40,
        kills: 0,
        deaths: 1,
        laner: {
          name: "Syndra",
          kills: 3,
          deaths: 0,
          assists: 1,
          cs: 90,
        },
      }),
      { enemyLanerName: "Syndra" },
    );
    expect(d?.id).toContain("vs-laner-behind");
  });

  it("late ahead → feche com objetivo", () => {
    const signals = buildLcdSignals(
      snap({
        gameTime: 28,
        kills: 8,
        deaths: 1,
        assists: 10,
        cs: 220,
        laner: {
          name: "Zed",
          kills: 1,
          deaths: 4,
          assists: 0,
          cs: 140,
        },
      }),
    );
    // Ally gold proxy high via me only — add allies ahead via kills
    expect(
      signals.some((s) => s.id === "late-close" || s.id === "ahead" || s.id === "vs-laner-ahead"),
    ).toBe(true);
  });

  it("spike de build completa", () => {
    const d = buildInGameDecision(
      snap({
        gameTime: 10,
        kills: 1,
        deaths: 1,
        assists: 1,
        cs: 70,
        laner: {
          name: "Zed",
          kills: 1,
          deaths: 1,
          assists: 1,
          cs: 72,
        },
      }),
      { buildComplete: true, enemyLanerName: "Zed" },
    );
    expect(d?.verb).toMatch(/spikou/i);
  });
});

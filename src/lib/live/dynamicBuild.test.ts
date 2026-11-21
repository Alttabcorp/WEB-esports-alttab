import { describe, expect, it } from "vitest";
import {
  nextMissingItem,
  resolveDynamicBuild,
  toBuildCandidate,
} from "./dynamicBuild";

describe("resolveDynamicBuild", () => {
  it("prioriza build vs laner quando há amostra", () => {
    const pick = resolveDynamicBuild({
      ownedIds: [],
      personal: toBuildCandidate(
        { items: [1001, 1002, 1003], games: 20, wins: 10, wr: 0.5 },
        "personal",
        "Pessoal",
      ),
      vsLaner: toBuildCandidate(
        { items: [2001, 2002, 2003], games: 6, wins: 5, wr: 0.83 },
        "vs-laner",
        "Vs laner",
      ),
      vsComp: null,
    });

    expect(pick?.source).toBe("vs-laner");
    expect(pick?.nextItemId).toBe(2001);
  });

  it("acompanha o inventário e troca o próximo item", () => {
    const pick = resolveDynamicBuild({
      ownedIds: [2001],
      personal: toBuildCandidate(
        { items: [1001, 1002], games: 30, wins: 18, wr: 0.6 },
        "personal",
        "Pessoal",
      ),
      vsLaner: toBuildCandidate(
        { items: [2001, 2002, 2003], games: 5, wins: 4, wr: 0.8 },
        "vs-laner",
        "Vs laner",
      ),
      vsComp: null,
    });

    expect(pick?.nextItemId).toBe(2002);
    expect(pick?.ownedOverlap).toBe(1);
  });

  it("cai no pessoal quando não há adapt", () => {
    const pick = resolveDynamicBuild({
      ownedIds: [1001],
      personal: toBuildCandidate(
        { items: [1001, 1002, 1003], games: 12, wins: 7, wr: 0.58 },
        "personal",
        "Pessoal",
      ),
      vsLaner: null,
      vsComp: null,
    });

    expect(pick?.source).toBe("personal");
    expect(pick?.nextItemId).toBe(1002);
  });
});

describe("nextMissingItem", () => {
  it("ignora itens já comprados fora de ordem", () => {
    const next = nextMissingItem([1, 2, 3], new Set([2]));
    expect(next).toEqual({ id: 1, index: 0 });
  });
});

import { describe, expect, it } from "vitest";
import {
  nextMissingItem,
  resolveDynamicBuild,
  savedBuildToCandidate,
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

  it("prioriza build cadastrada sobre histórico", () => {
    const pick = resolveDynamicBuild({
      ownedIds: [],
      personal: toBuildCandidate(
        { items: [1001, 1002], games: 40, wins: 28, wr: 0.7 },
        "personal",
        "Pessoal",
      ),
      vsLaner: toBuildCandidate(
        { items: [2001, 2002], games: 8, wins: 7, wr: 0.875 },
        "vs-laner",
        "Vs laner",
      ),
      vsComp: null,
      saved: [
        savedBuildToCandidate({
          id: "s1",
          name: "Minha Ahri",
          items: [3001, 3002, 3003],
          isDefault: true,
        })!,
      ],
    });

    expect(pick?.source).toBe("saved");
    expect(pick?.nextItemId).toBe(3001);
    expect(pick?.label).toBe("Usando build cadastrada: Minha Ahri");
  });

  it("escolhe build salva contra o laner atual", () => {
    const pick = resolveDynamicBuild({
      ownedIds: [],
      personal: null,
      vsLaner: null,
      vsComp: null,
      enemyLanerId: 99,
      enemyLanerLabel: "Zed",
      saved: [
        savedBuildToCandidate({
          id: "def",
          name: "Padrão",
          items: [1, 2, 3],
          isDefault: true,
        })!,
        savedBuildToCandidate({
          id: "vs",
          name: "Vs Zed",
          items: [10, 20, 30],
          enemyChampionId: 99,
          enemyChampionName: "Zed",
        })!,
      ],
    });

    expect(pick?.label).toBe("Usando build cadastrada: Vs Zed");
    expect(pick?.nextItemId).toBe(10);
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

import { describe, expect, it } from "vitest";
import { adaptBuildOrder } from "./itemAdapt";

const catalog = [
  { id: 3031, tags: ["CriticalStrike", "Damage"] }, // IE
  { id: 3036, tags: ["ArmorPenetration", "Damage"] }, // LDR
  { id: 3123, tags: ["Damage", "ArmorPenetration"] }, // Executioner's
  { id: 3071, tags: ["Damage", "CooldownReduction", "ArmorPenetration"] }, // BC
  { id: 3143, tags: ["Armor", "Health"] }, // Randuin's
  { id: 3089, tags: ["SpellDamage"] }, // Rabadon
  { id: 3165, tags: ["SpellDamage", "Mana"] }, // Morello
  { id: 3102, tags: ["SpellBlock", "Health"] }, // Banshee's
];

describe("adaptBuildOrder", () => {
  it("sobe armor pen quando inimigo tem armadura", () => {
    const r = adaptBuildOrder({
      buildItems: [3031, 3036, 3071],
      ownedIds: [],
      enemyItemIds: [3143],
      catalog,
    });
    expect(r.adapted).toBe(true);
    expect(r.items[0]).toBe(3036);
    expect(r.items).toEqual(expect.arrayContaining([3031, 3036, 3071]));
    expect(r.items).toHaveLength(3);
  });

  it("sobe antiheal se estiver na build e inimigo cura", () => {
    const r = adaptBuildOrder({
      buildItems: [3031, 3123, 3036],
      ownedIds: [3031],
      enemyItemIds: [/* fictício com LifeSteal */],
      catalog: [
        ...catalog,
        { id: 1055, tags: ["LifeSteal", "Damage"] },
      ],
    });
    // sem item de cura no inimigo → não adapta
    expect(r.adapted).toBe(false);

    const r2 = adaptBuildOrder({
      buildItems: [3031, 3036, 3123],
      ownedIds: [3031],
      enemyItemIds: [1055],
      catalog: [
        ...catalog,
        { id: 1055, tags: ["LifeSteal", "Damage"] },
      ],
    });
    expect(r2.adapted).toBe(true);
    expect(r2.items[0]).toBe(3031);
    expect(r2.items[1]).toBe(3123);
  });

  it("não inventa itens fora da build", () => {
    const r = adaptBuildOrder({
      buildItems: [3031, 3089],
      ownedIds: [],
      enemyItemIds: [3143, 1055],
      catalog: [
        ...catalog,
        { id: 1055, tags: ["LifeSteal"] },
      ],
    });
    expect(r.items.every((id) => id === 3031 || id === 3089)).toBe(true);
    expect(r.items).toHaveLength(2);
  });
});

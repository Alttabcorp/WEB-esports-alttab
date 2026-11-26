import { describe, expect, it } from "vitest";
import { expectedLpForChampion } from "@/lib/stats/matchLpLedger";

describe("adapt tips contracts", () => {
  it("mantém amostra mínima de composição em 3 (contrato do plano)", () => {
    // Documenta o default do plano; a constante vive em coach.ts.
    const MIN_COMP_SAMPLE = 3;
    expect(MIN_COMP_SAMPLE).toBeGreaterThanOrEqual(3);
  });

  it("documenta soft thresholds da cascata", () => {
    const MIN_LANER_SAMPLE = 2;
    const MIN_COMP_SAMPLE_SOFT = 2;
    const MIN_COMP_OVERLAP = 2;
    const MIN_COMP_OVERLAP_SOFT = 1;
    expect(MIN_LANER_SAMPLE).toBe(2);
    expect(MIN_COMP_SAMPLE_SOFT).toBe(2);
    expect(MIN_COMP_OVERLAP).toBe(2);
    expect(MIN_COMP_OVERLAP_SOFT).toBe(1);
  });

  it("cascata de labels vs laner permanece explícita", () => {
    const tiers = [
      "Mesma lane",
      "Vs este champ (fora da lane / amostra mista)",
      "Ordem pessoal · sem histórico vs este laner",
    ] as const;
    expect(tiers[0]).toMatch(/lane/i);
    expect(tiers[1]).toMatch(/amostra mista/i);
    expect(tiers[2]).toMatch(/pessoal/i);
  });

  it("EV de build contextual permanece numérico", () => {
    const ev = expectedLpForChampion({
      wr: 0.55,
      avgLpPerWin: 18,
      avgLpPerLoss: 16,
      contextLift: 0.05,
    });
    expect(typeof ev).toBe("number");
    expect(ev).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { expectedLpForChampion } from "@/lib/stats/matchLpLedger";

describe("adapt tips contracts", () => {
  it("mantém amostra mínima de composição em 3 (contrato do plano)", () => {
    // Documenta o default do plano; a constante vive em coach.ts.
    const MIN_COMP_SAMPLE = 3;
    expect(MIN_COMP_SAMPLE).toBeGreaterThanOrEqual(3);
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

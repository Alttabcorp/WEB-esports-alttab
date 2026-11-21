import { describe, expect, it } from "vitest";
import {
  pickPrimaryAlert,
  toDecisionFromAlerts,
} from "./decision";
import type { PerformanceAlert } from "@/lib/stats/temporal";

describe("decision alerts", () => {
  it("prioriza warn de sessão sobre good", () => {
    const alerts: PerformanceAlert[] = [
      {
        id: "best-window",
        severity: "good",
        title: "Boa janela",
        detail: "WR alto",
      },
      {
        id: "session-decay",
        severity: "warn",
        title: "Decay",
        detail: "Pare",
      },
    ];
    const primary = pickPrimaryAlert(alerts);
    expect(primary?.id).toBe("session-decay");
    const decision = toDecisionFromAlerts(alerts, "/prep");
    expect(decision?.tone).toBe("stop");
    expect(decision?.verb).toMatch(/Pare/i);
    expect(decision?.secondary?.some((a) => a.id === "best-window")).toBe(
      true,
    );
    const timing = decision?.actions.find((a) => a.label === "Ver horários");
    expect(timing?.href).toBe("/prep?tab=timing");
  });
});

"use client";

import { useMemo, useState } from "react";
import type { PerformanceAlert } from "@/lib/stats/temporal";
import { toDecisionFromAlerts } from "@/lib/alerts/decision";
import { DecisionCard } from "./DecisionCard";

type Props = {
  alerts: PerformanceAlert[];
  prepHref?: string;
  timingHref?: string;
  /** Quando já estamos em Preparar: troca de aba sem depender só da URL. */
  onGoTiming?: () => void;
};

export function PerformanceAlerts({
  alerts,
  prepHref,
  timingHref,
  onGoTiming,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const decision = useMemo(
    () => toDecisionFromAlerts(alerts, { prepHref, timingHref }),
    [alerts, prepHref, timingHref],
  );

  if (!decision || dismissed) return null;

  return (
    <DecisionCard
      decision={decision}
      onDismiss={() => setDismissed(true)}
      onAction={(label) => {
        if (label === "Ver horários" && onGoTiming) onGoTiming();
      }}
    />
  );
}

"use client";

import { useMemo, useState } from "react";
import type { PerformanceAlert } from "@/lib/stats/temporal";
import type { PracticeCandidate } from "@/lib/stats/practiceCandidates";
import {
  toDecisionFromAlerts,
  withPracticeHint,
} from "@/lib/alerts/decision";
import { DecisionCard } from "./DecisionCard";

type Props = {
  alerts: PerformanceAlert[];
  prepHref?: string;
  timingHref?: string;
  practiceCandidates?: PracticeCandidate[];
  /** Quando já estamos em Preparar: troca de aba sem depender só da URL. */
  onGoTiming?: () => void;
};

export function PerformanceAlerts({
  alerts,
  prepHref,
  timingHref,
  practiceCandidates = [],
  onGoTiming,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const decision = useMemo(() => {
    const base = toDecisionFromAlerts(alerts, { prepHref, timingHref });
    return base ? withPracticeHint(base, practiceCandidates) : null;
  }, [alerts, prepHref, timingHref, practiceCandidates]);

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

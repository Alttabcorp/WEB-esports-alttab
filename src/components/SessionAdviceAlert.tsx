"use client";

import { useMemo } from "react";
import type { SessionAdvice } from "@/lib/live/sessionAdvice";
import { pct } from "@/lib/format";
import { toDecisionFromSessionAdvice } from "@/lib/alerts/decision";
import { DecisionCard } from "./DecisionCard";
import { Button } from "@/components/ui";

type Props = {
  advice: SessionAdvice;
  onDismiss: () => void;
  onRefresh?: () => void;
};

export function SessionAdviceAlert({ advice, onDismiss, onRefresh }: Props) {
  const decision = useMemo(() => {
    const base = toDecisionFromSessionAdvice(advice);
    const detailParts = [advice.summary || advice.title];
    if (advice.reasons[0]) detailParts.push(advice.reasons[0]);
    return {
      ...base,
      detail: detailParts.filter(Boolean).join(" — "),
      actions:
        advice.decision === "stop"
          ? [{ label: "Encerrar sessão", kind: "primary" as const }]
          : [
              { label: "Abrir Coach", href: "/coach", kind: "primary" as const },
              { label: "Voltar ao hub", href: "/", kind: "ghost" as const },
            ],
    };
  }, [advice]);

  return (
    <div className="space-y-3">
      <DecisionCard
        decision={decision}
        onDismiss={onDismiss}
        onAction={(label) => {
          if (label === "Encerrar sessão") onDismiss();
        }}
      />
      <div className="flex flex-wrap gap-3 px-1 text-xs text-[var(--muted)]">
        <span>
          Hoje: {advice.today.wins}W {advice.today.losses}L
          {advice.today.games > 0 ? ` · ${pct(advice.today.wr)}` : ""}
        </span>
        <span>
          Sessão: {advice.session.wins}W {advice.session.losses}L · próxima #
          {advice.session.nextIndex}
        </span>
        {advice.lp.delta != null ? (
          <span className="tabular font-semibold text-[var(--muted-strong)]">
            PDL {advice.lp.queueLabel ?? "Ranked"}{" "}
            {advice.lp.delta >= 0 ? "+" : ""}
            {advice.lp.delta}/{advice.lp.goal}
            {advice.lp.soloDelta != null || advice.lp.flexDelta != null
              ? ` · Solo ${
                  advice.lp.soloDelta == null
                    ? "—"
                    : `${advice.lp.soloDelta >= 0 ? "+" : ""}${advice.lp.soloDelta}`
                } / Flex ${
                  advice.lp.flexDelta == null
                    ? "—"
                    : `${advice.lp.flexDelta >= 0 ? "+" : ""}${advice.lp.flexDelta}`
                }`
              : ""}
            {advice.lp.lastMatchDelta != null
              ? ` · última ${advice.lp.lastMatchDelta >= 0 ? "+" : ""}${advice.lp.lastMatchDelta}`
              : ""}
          </span>
        ) : null}
        {advice.nextPlan ? (
          <span className="text-[var(--alttab-soft)]">{advice.nextPlan.verb}</span>
        ) : null}
        {advice.bestWindowLabel ? (
          <span>
            Melhor horário: {advice.bestWindowLabel}
            {advice.inBestWindow ? " (agora)" : ""}
          </span>
        ) : null}
      </div>
      {advice.reasons.length > 1 ? (
        <details className="px-1">
          <summary className="cursor-pointer text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
            Mais motivos ({advice.reasons.length})
          </summary>
          <ul className="mt-2 space-y-1 text-sm text-[var(--muted-strong)]">
            {advice.reasons.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {onRefresh ? (
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            Recalcular
          </Button>
        ) : null}
        {advice.phase === "postGame" &&
        (!advice.syncedNewMatch || advice.lastGame.win == null) ? (
          <p className="text-xs text-[var(--muted)]">
            Se o resultado ainda não apareceu, aguarde 1–2 min e recalcule.
          </p>
        ) : null}
      </div>
    </div>
  );
}

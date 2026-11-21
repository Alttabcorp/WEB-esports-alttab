"use client";

import { useState } from "react";
import type { DecisionModel } from "@/lib/alerts/decision";
import { Button } from "@/components/ui";

type Props = {
  decision: DecisionModel;
  onDismiss?: () => void;
  onAction?: (label: string) => void;
  className?: string;
};

const toneClass: Record<DecisionModel["tone"], string> = {
  stop: "border-[var(--danger)]/35 bg-rose-50",
  warn: "border-[var(--warn)]/40 bg-amber-50",
  go: "border-[var(--success)]/35 bg-emerald-50",
  info: "border-[var(--border-strong)] bg-[var(--alttab)]/8",
};

const verbClass: Record<DecisionModel["tone"], string> = {
  stop: "text-[var(--danger)]",
  warn: "text-[var(--warn)]",
  go: "text-[var(--success)]",
  info: "text-[var(--alttab)]",
};

export function DecisionCard({
  decision,
  onDismiss,
  onAction,
  className = "",
}: Props) {
  const secondary = decision.secondary ?? [];
  const hasPractice = secondary.some((a) => a.id === "practice-normals");
  const [openOthers, setOpenOthers] = useState(hasPractice);

  return (
    <section
      className={`rounded-[var(--radius)] border px-4 py-4 sm:px-5 ${toneClass[decision.tone]} ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="data-label mb-1">Tomada de decisão</p>
          <h2
            className={`text-xl font-semibold tracking-tight sm:text-2xl ${verbClass[decision.tone]}`}
          >
            {decision.verb}
          </h2>
          <p className="mt-2 type-body text-[0.9rem]">
            {decision.detail}
          </p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-[var(--radius)] px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          >
            Dispensar
          </button>
        ) : null}
      </div>

      {decision.actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {decision.actions.map((a) => {
            const variant =
              a.kind === "primary"
                ? "primary"
                : a.kind === "secondary"
                  ? "secondary"
                  : "ghost";
            // href sempre vence — onAction só para ações sem rota (ex.: Recalcular).
            if (a.href) {
              return (
                <Button key={a.label} href={a.href} size="sm" variant={variant}>
                  {a.label}
                </Button>
              );
            }
            if (onAction) {
              return (
                <Button
                  key={a.label}
                  size="sm"
                  variant={variant}
                  onClick={() => onAction(a.label)}
                >
                  {a.label}
                </Button>
              );
            }
            return null;
          })}
        </div>
      ) : null}

      {secondary.length > 0 ? (
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={() => setOpenOthers((v) => !v)}
            className="text-xs font-medium text-[var(--muted-strong)] hover:text-[var(--foreground)]"
          >
            {openOthers ? "Ocultar" : "Outros avisos"} ({secondary.length})
          </button>
          {openOthers ? (
            <ul className="mt-2 space-y-2">
              {secondary.map((a) => (
                <li
                  key={a.id}
                  className="rounded-[var(--radius)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted-strong)] ring-1 ring-[var(--border)]"
                >
                  <p className="font-medium text-[var(--foreground)]">
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{a.detail}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

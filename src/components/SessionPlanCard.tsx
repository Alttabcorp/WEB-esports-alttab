"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { SessionAdvice } from "@/lib/live/sessionAdvice";
import { Button, Panel } from "@/components/ui";

type Props = {
  platform: string;
  puuid: string;
};

export function SessionPlanCard({ platform, puuid }: Props) {
  const [advice, setAdvice] = useState<SessionAdvice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/live/session-advice?region=${encodeURIComponent(platform)}&puuid=${encodeURIComponent(puuid)}&phase=preQueue`,
        );
        const data = (await res.json()) as {
          error?: string;
          advice?: SessionAdvice;
        };
        if (!res.ok) {
          setError(data.error ?? "Falha ao carregar plano");
          return;
        }
        setError(null);
        setAdvice(data.advice ?? null);
      } catch {
        setError("Erro de rede");
      }
    });
  }, [platform, puuid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const tone =
    advice?.decision === "continue"
      ? "border-[var(--success)]/35 bg-[var(--success)]/10"
      : advice?.decision === "stop"
        ? "border-[var(--danger)]/35 bg-[var(--danger)]/10"
        : "border-[var(--warn)]/35 bg-[var(--warn)]/10";

  const badge =
    advice?.decision === "continue"
      ? "Jogar"
      : advice?.decision === "stop"
        ? "Parar"
        : "Cautela";

  return (
    <Panel className={`space-y-3 p-4 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="data-label">Sessão de hoje · pré-fila</p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {advice?.title ?? (pending ? "Calculando plano…" : "Plano do dia")}
          </h3>
        </div>
        {advice ? (
          <span className="rounded-lg bg-black/30 px-2.5 py-1 text-xs font-semibold text-white">
            {badge}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-200">{error}</p>
      ) : null}

      {advice ? (
        <>
          <p className="text-sm text-[var(--muted-strong)]">{advice.summary}</p>
          <ul className="space-y-1 text-sm text-[var(--muted)]">
            {advice.reasons.slice(0, 4).map((r) => (
              <li key={r}>· {r}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
            <span>
              Hoje {advice.today.wins}W {advice.today.losses}L
            </span>
            {advice.lp.delta != null ? (
              <span className="tabular">
                PDL {advice.lp.delta >= 0 ? "+" : ""}
                {advice.lp.delta} (meta +{advice.lp.goal} / stop{" "}
                {advice.lp.stopLoss})
              </span>
            ) : (
              <span>PDL do dia ainda sem ledger</span>
            )}
            {advice.bestWindowLabel ? (
              <span>
                Janela: {advice.bestWindowLabel}
                {advice.inBestWindow ? " · agora" : ""}
              </span>
            ) : null}
          </div>
        </>
      ) : null}

      <Button variant="ghost" size="sm" onClick={refresh} disabled={pending}>
        {pending ? "Atualizando…" : "Atualizar plano"}
      </Button>
    </Panel>
  );
}

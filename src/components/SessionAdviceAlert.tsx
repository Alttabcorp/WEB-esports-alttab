"use client";

import type { SessionAdvice } from "@/lib/live/sessionAdvice";
import { pct } from "@/lib/format";

type Props = {
  advice: SessionAdvice;
  onDismiss: () => void;
  onRefresh?: () => void;
};

export function SessionAdviceAlert({ advice, onDismiss, onRefresh }: Props) {
  const tone =
    advice.decision === "continue"
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-50"
      : advice.decision === "stop"
        ? "border-rose-500/40 bg-rose-500/15 text-rose-50"
        : "border-amber-500/40 bg-amber-500/15 text-amber-50";

  const badge =
    advice.decision === "continue"
      ? "CONTINUAR"
      : advice.decision === "stop"
        ? "PARAR"
        : "CUIDADO";

  const phaseLabel =
    advice.phase === "preQueue" ? "Pré-fila" : "Pós-partida";

  return (
    <div className={`rounded-xl border px-4 py-4 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-wide opacity-80">
            {phaseLabel} · maximizar PDL · {badge}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {advice.title}
          </h3>
          <p className="mt-1 text-sm opacity-90">{advice.summary}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          Fechar
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs opacity-90">
        <span>
          Hoje: {advice.today.wins}W {advice.today.losses}L
          {advice.today.games > 0 ? ` · ${pct(advice.today.wr)}` : ""}
        </span>
        <span>
          Sessão: {advice.session.wins}W {advice.session.losses}L · próxima #
          {advice.session.nextIndex}
        </span>
        {advice.lp.delta != null ? (
          <span className="tabular font-semibold">
            PDL {advice.lp.delta >= 0 ? "+" : ""}
            {advice.lp.delta}
            {advice.lp.perHour != null
              ? ` · ${advice.lp.perHour >= 0 ? "+" : ""}${advice.lp.perHour.toFixed(0)}/h`
              : ""}
          </span>
        ) : null}
        {advice.bestWindowLabel ? (
          <span>
            Melhor horário: {advice.bestWindowLabel}
            {advice.inBestWindow ? " (agora)" : ""}
          </span>
        ) : null}
      </div>

      {advice.reasons.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-sm opacity-95">
          {advice.reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="opacity-50">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
          >
            Recalcular
          </button>
        ) : null}
        {advice.phase === "postGame" &&
        (!advice.syncedNewMatch || advice.lastGame.win == null) ? (
          <p className="text-xs opacity-70">
            Se o resultado ainda não apareceu, aguarde 1–2 min e recalcule.
          </p>
        ) : null}
      </div>
    </div>
  );
}

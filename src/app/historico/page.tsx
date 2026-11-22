import { MatchHistoryPanel } from "@/components/MatchHistoryPanel";
import { PrepGate } from "@/components/PrepGate";
import { SessionFlowStrip } from "@/components/SessionFlowStrip";
import { loadPrepContext } from "@/lib/prep/loadPrepContext";

export default async function HistoricoPage() {
  const ctx = await loadPrepContext();

  if (!ctx.ok) {
    return (
      <PrepGate
        title={ctx.title}
        detail={ctx.detail}
        configOnly={ctx.kind === "no_profile"}
      />
    );
  }

  return (
    <div className="space-y-3 pb-8">
      <div>
        <p className="data-label">Revisar</p>
        <h1 className="mt-0.5 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
          Histórico
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Partidas recentes com ΔPDL — feche a sessão e planeje a próxima.
        </p>
      </div>

      <SessionFlowStrip />

      <MatchHistoryPanel
        matches={ctx.matchHistory}
        ddragonVersion={ctx.ddragonVersion}
        idToKey={ctx.idToKey}
      />
    </div>
  );
}

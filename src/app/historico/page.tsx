import { MatchHistoryPanel } from "@/components/MatchHistoryPanel";
import { PrepGate } from "@/components/PrepGate";
import { PrepSubnav } from "@/components/PrepSubnav";
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

  const alertCount = ctx.analysis.temporal?.alerts?.length ?? 0;

  return (
    <div className="space-y-3 pb-8">
      <div>
        <p className="data-label">Sua conta</p>
        <h1 className="mt-0.5 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
          Histórico
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Partidas recentes com ΔPDL por partida (snapshot ou estimativa) na
          fila acompanhada.
        </p>
      </div>

      <PrepSubnav alertCount={alertCount} />

      <MatchHistoryPanel
        matches={ctx.matchHistory}
        ddragonVersion={ctx.ddragonVersion}
        idToKey={ctx.idToKey}
      />
    </div>
  );
}

import { MatchHistoryPanel } from "@/components/MatchHistoryPanel";
import { PrepGate } from "@/components/PrepGate";
import { Button } from "@/components/ui";
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
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-pretty text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
          Revisar
        </h1>
        <p className="mt-1 max-w-prose text-sm text-[var(--muted)]">
          Partidas recentes com ΔPDL — feche a sessão e planeje a próxima.
        </p>
      </div>

      <MatchHistoryPanel
        matches={ctx.matchHistory}
        ddragonVersion={ctx.ddragonVersion}
        idToKey={ctx.idToKey}
      />

      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
        <Button href="/" size="sm">
          Abrir Hoje
        </Button>
        <Button href="/coach" variant="secondary" size="sm">
          Coach
        </Button>
      </div>
    </div>
  );
}

import { DayLpCard } from "@/components/DayLpCard";
import { PrepGate } from "@/components/PrepGate";
import { TimingDecisionPanel } from "@/components/TimingDecisionPanel";
import { loadPrepContext } from "@/lib/prep/loadPrepContext";

export default async function QuandoPage() {
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
    <div className="space-y-4 pb-10">
      <div>
        <h1 className="text-pretty text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
          Quando
        </h1>
        <p className="mt-1 max-w-prose text-sm text-[var(--muted)]">
          Jogar agora, avisos do histórico e o ritmo de PDL — o núcleo da
          decisão diária.
        </p>
      </div>

      <DayLpCard
        solo={ctx.dayLpSolo}
        flex={ctx.dayLpFlex}
        summary={ctx.dayLp}
        trackQueue={ctx.queue}
      />

      {ctx.analysis.temporal ? (
        <TimingDecisionPanel
          temporal={ctx.analysis.temporal}
          overallWr={ctx.analysis.overallWr}
          sessionEv={ctx.sessionEv}
          lpInsights={ctx.lpInsights}
          calendar={ctx.lpCalendar}
          currentPatch={ctx.currentPatch}
          patchNote={ctx.patchNote}
          prepHref="/"
          timingHref="/quando"
          practiceCandidates={ctx.practiceCandidates}
          ddragonVersion={ctx.ddragonVersion}
          idToKey={ctx.idToKey}
        />
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Sem dados temporais ainda — sincronize partidas em Config.
        </p>
      )}
    </div>
  );
}

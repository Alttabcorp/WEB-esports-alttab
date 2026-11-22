import { DecisionRoundupView } from "@/components/DecisionRoundupView";
import { PrepGate } from "@/components/PrepGate";
import { getCoachNotes } from "@/lib/db/persist";
import { loadPrepContext } from "@/lib/prep/loadPrepContext";
import { todayDateKey } from "@/lib/stats/temporal";

export default async function RodadaPage() {
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

  const notes =
    (await getCoachNotes()) ??
    ({
      dailyNote: "",
      dailyNoteDate: null,
      dailyStale: false,
      generalNote: "",
      todayKey: todayDateKey(),
    } as const);

  const alertCount = ctx.analysis.temporal?.alerts?.length ?? 0;

  return (
    <DecisionRoundupView
      analysis={ctx.analysis}
      ddragonVersion={ctx.ddragonVersion}
      idToKey={ctx.idToKey}
      runeCatalog={ctx.runeCatalog}
      dayLpSolo={ctx.dayLpSolo}
      dayLpFlex={ctx.dayLpFlex}
      trackQueue={ctx.queue}
      todayPool={ctx.todayPool}
      preferredRole={ctx.preferredRole}
      dayGoal={ctx.dayGoal}
      sessionEv={ctx.sessionEv}
      practiceCandidates={ctx.practiceCandidates}
      notes={notes}
      alertCount={alertCount}
    />
  );
}

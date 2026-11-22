import { DecisionRoundupView } from "@/components/DecisionRoundupView";
import { SearchForm } from "@/components/SearchForm";
import { Button, Panel } from "@/components/ui";
import { getCoachNotes } from "@/lib/db/persist";
import { loadPrepContext } from "@/lib/prep/loadPrepContext";
import { todayDateKey } from "@/lib/stats/temporal";

export default async function HomePage() {
  const ctx = await loadPrepContext();

  if (!ctx.ok) {
    if (ctx.kind === "no_profile") {
      return (
        <div className="flex flex-col items-center gap-8 py-4 sm:py-10">
          <div className="max-w-xl text-center">
            <p className="data-label mb-2">ALTTAB Esports</p>
            <h1 className="type-display text-3xl text-[var(--foreground)] sm:text-4xl">
              League Persua
            </h1>
            <p className="mt-3 type-body">
              Configure seu perfil uma vez. As partidas ficam neste servidor —
              histórico sem rebuscar a Riot a cada visita.
            </p>
          </div>
          <div className="flex w-full max-w-2xl flex-col items-center gap-4">
            <Button href="/config" size="lg" className="w-full">
              Configurar perfil
            </Button>
            <Panel className="w-full p-4">
              <p className="data-label mb-2">Ou busque um invocador</p>
              <SearchForm />
            </Panel>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-lg space-y-4 py-10">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          {ctx.title}
        </h1>
        <p className="text-sm text-[var(--muted)]">{ctx.detail}</p>
        <Button href="/config">Ir para Config</Button>
      </div>
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
      gameName={ctx.profile.gameName}
      tagLine={ctx.profile.tagLine}
      platform={ctx.profile.platform}
      profileIconId={ctx.profile.summoner?.profileIconId ?? null}
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
      matchCount={ctx.count}
    />
  );
}

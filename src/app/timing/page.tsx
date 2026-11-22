import { DayLpCard } from "@/components/DayLpCard";
import { PrepGate } from "@/components/PrepGate";
import { PrepSubnav } from "@/components/PrepSubnav";
import { TimingDecisionPanel } from "@/components/TimingDecisionPanel";
import { loadPrepContext } from "@/lib/prep/loadPrepContext";

export default async function TimingPage() {
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
    <div className="space-y-4 pb-10">
      <div>
        <p className="data-label">Estatísticas de sessão</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Quando jogar
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
          Decisão da fila, PDL e padrões do seu histórico — o diferencial do
          League Persua.
        </p>
      </div>

      <PrepSubnav alertCount={alertCount} />

      <DayLpCard solo={ctx.dayLpSolo} flex={ctx.dayLpFlex} summary={ctx.dayLp} />

      {ctx.analysis.temporal ? (
        <TimingDecisionPanel
          temporal={ctx.analysis.temporal}
          overallWr={ctx.analysis.overallWr}
          sessionEv={ctx.sessionEv}
          lpInsights={ctx.lpInsights}
          calendar={ctx.lpCalendar}
          currentPatch={ctx.currentPatch}
          patchNote={ctx.patchNote}
          prepHref="/preparar"
          timingHref="/timing"
          practiceCandidates={ctx.practiceCandidates}
          ddragonVersion={ctx.ddragonVersion}
          idToKey={ctx.idToKey}
        />
      ) : (
        <p className="text-sm text-[var(--muted)]">Sem dados temporais ainda.</p>
      )}

      {ctx.endgameBaselines.length > 0 ? (
        <details className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--foreground)] marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              Baseline de farm (fim de jogo)
              <span className="text-xs font-normal text-[var(--muted)]">
                opcional
              </span>
            </span>
          </summary>
          <div className="space-y-2 border-t border-[var(--border)] px-4 pb-4 pt-2">
            <p className="text-sm text-[var(--muted)]">
              CS/min e gold/min médios — proxy sem timeline Riot.
            </p>
            <ul className="space-y-2">
              {ctx.endgameBaselines.slice(0, 6).map((b) => (
                <li
                  key={b.championId}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="font-medium text-[var(--foreground)]">
                    {b.championName}
                  </span>
                  <span className="tabular text-[var(--muted)]">
                    {b.avgCsPerMin} CS/min · {b.avgGoldPerMin} g/min
                    {b.wrWhenBehindCs != null
                      ? ` · atrás em CS: ${Math.round(b.wrWhenBehindCs * 100)}% WR (${b.behindCsGames})`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}
    </div>
  );
}

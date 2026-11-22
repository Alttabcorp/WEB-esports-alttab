import { Suspense } from "react";
import { AnaliseTabs } from "@/components/AnaliseTabs";
import { DayLpCard } from "@/components/DayLpCard";
import { PrepGate } from "@/components/PrepGate";
import { RankingExplorer } from "@/components/RankingExplorer";
import { StatsExplorer } from "@/components/StatsExplorer";
import { TimingDecisionPanel } from "@/components/TimingDecisionPanel";
import { loadPrepContext } from "@/lib/prep/loadPrepContext";
import { buildChampionRoleStats } from "@/lib/stats/championRoleStats";

type PageProps = {
  searchParams: Promise<{ tab?: string; champ?: string }>;
};

export default async function AnalisePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const champParam = sp.champ ? Number(sp.champ) : null;
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
  const initialChampionId =
    Number.isFinite(champParam) && champParam
      ? champParam
      : (ctx.todayPool[0]?.championId ??
        ctx.analysis.topRecommendations[0]?.championId ??
        null);

  const { byChampion, byChampRole } = buildChampionRoleStats(ctx.matchHistory);

  return (
    <div className="space-y-4 pb-10">
      <div>
        <p className="data-label">Aprofundar</p>
        <h1 className="mt-0.5 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
          Análise
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Ranking, estatísticas e padrões de horário — fora da jornada diária.
        </p>
      </div>

      <Suspense
        fallback={
          <p className="text-sm text-[var(--muted)]">Carregando análise…</p>
        }
      >
        <AnaliseTabs
          ranking={
            <RankingExplorer
              champions={ctx.analysis.champions}
              matchHistory={ctx.matchHistory}
              ddragonVersion={ctx.ddragonVersion}
              idToKey={ctx.idToKey}
              runeCatalog={ctx.runeCatalog}
              platform={ctx.profile.platform}
              ranked={ctx.profile.ranked}
              lpInsights={ctx.lpInsights}
              alertCount={alertCount}
              initialChampionId={initialChampionId}
              embedded
            />
          }
          stats={
            <StatsExplorer
              champions={ctx.analysis.champions}
              roleInsights={ctx.analysis.roles}
              champOverviews={byChampion}
              byChampRole={byChampRole}
              matchHistory={ctx.matchHistory}
              ddragonVersion={ctx.ddragonVersion}
              idToKey={ctx.idToKey}
              runeCatalog={ctx.runeCatalog}
              prepHref="/"
              overallWr={ctx.analysis.overallWr}
              analyzedGames={ctx.analysis.analyzedGames}
              practiceCandidates={ctx.practiceCandidates}
              initialChampionId={initialChampionId}
            />
          }
          quando={
            <div className="space-y-4">
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
                  timingHref="/analise?tab=quando"
                  practiceCandidates={ctx.practiceCandidates}
                  ddragonVersion={ctx.ddragonVersion}
                  idToKey={ctx.idToKey}
                />
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  Sem dados temporais ainda.
                </p>
              )}
            </div>
          }
        />
      </Suspense>
    </div>
  );
}

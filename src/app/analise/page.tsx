import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AnaliseTabs } from "@/components/AnaliseTabs";
import { PrepGate } from "@/components/PrepGate";
import { RankingExplorer } from "@/components/RankingExplorer";
import { StatsExplorer } from "@/components/StatsExplorer";
import { loadPrepContext } from "@/lib/prep/loadPrepContext";
import { buildChampionRoleStats } from "@/lib/stats/championRoleStats";

type PageProps = {
  searchParams: Promise<{ tab?: string; champ?: string }>;
};

export default async function AnalisePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  if (sp.tab === "quando") {
    redirect("/quando");
  }

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
        <h1 className="text-pretty text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
          Análise
        </h1>
        <p className="mt-1 max-w-prose text-sm text-[var(--muted)]">
          Ranking e estatísticas por campeão — aprofundar fora da jornada.
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
        />
      </Suspense>
    </div>
  );
}

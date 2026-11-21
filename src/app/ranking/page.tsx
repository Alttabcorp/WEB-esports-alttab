import { Suspense } from "react";
import { PrepGate } from "@/components/PrepGate";
import { RankingExplorer } from "@/components/RankingExplorer";
import { loadPrepContext } from "@/lib/prep/loadPrepContext";

type PageProps = {
  searchParams: Promise<{ champ?: string }>;
};

export default async function RankingPage({ searchParams }: PageProps) {
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

  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Carregando ranking…</p>}>
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
        initialChampionId={
          Number.isFinite(champParam) && champParam
            ? champParam
            : (ctx.todayPool[0]?.championId ??
              ctx.analysis.topRecommendations[0]?.championId ??
              null)
        }
      />
    </Suspense>
  );
}

import { PrepDecisionView } from "@/components/PrepDecisionView";
import { PrepGate } from "@/components/PrepGate";
import { loadPrepContext } from "@/lib/prep/loadPrepContext";
import type { QueueFilter } from "@/lib/riot/types";

type PageProps = {
  searchParams: Promise<{
    refresh?: string;
    queue?: string;
    count?: string;
  }>;
};

export default async function PrepararPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const forceRefresh = sp.refresh === "1" || sp.refresh === "true";
  const queue = sp.queue as QueueFilter | undefined;
  const count = sp.count ? Number(sp.count) : undefined;

  const ctx = await loadPrepContext({
    forceRefresh,
    queueOverride: queue,
    countOverride: Number.isFinite(count) ? count : undefined,
  });

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
    <PrepDecisionView
      gameName={ctx.profile.gameName}
      tagLine={ctx.profile.tagLine}
      platform={ctx.profile.platform}
      puuid={ctx.profile.puuid}
      summoner={ctx.profile.summoner}
      ranked={ctx.profile.ranked}
      analysis={ctx.analysis}
      ddragonVersion={ctx.ddragonVersion}
      idToKey={ctx.idToKey}
      runeCatalog={ctx.runeCatalog}
      dayLp={ctx.dayLp}
      dayLpSolo={ctx.dayLpSolo}
      dayLpFlex={ctx.dayLpFlex}
      trackQueue={ctx.queue}
      todayPool={ctx.todayPool}
      preferredRole={ctx.preferredRole}
      queue={ctx.queue}
      dayGoal={ctx.dayGoal}
      sessionEv={ctx.sessionEv}
      practiceCandidates={ctx.practiceCandidates}
      count={ctx.count}
      source={ctx.source}
      cached={ctx.cached}
    />
  );
}

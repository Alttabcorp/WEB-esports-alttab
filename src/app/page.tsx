import Link from "next/link";
import { ProfileHub } from "@/components/ProfileHub";
import { SearchForm } from "@/components/SearchForm";
import { Button, Panel } from "@/components/ui";
import {
  toDecisionFromAlerts,
  withPracticeHint,
} from "@/lib/alerts/decision";
import {
  getAppProfile,
  getDayLpByQueue,
  getFreshAnalysisRun,
  getStoredMatchesForPlayer,
  listRankSnapshots,
} from "@/lib/db/persist";
import { QUEUE_LABEL } from "@/lib/stats/lpLedger";
import { getChampionIdToKey, getDdragonVersion } from "@/lib/ddragon";
import type { PlatformRegion } from "@/lib/riot/regions";
import type { QueueFilter } from "@/lib/riot/types";
import { buildContextualPool } from "@/lib/stats/contextualPool";
import { computeDayGoalProgress } from "@/lib/stats/dayGoal";
import { buildMatchLpLedger } from "@/lib/stats/matchLpLedger";
import {
  buildPracticeCandidates,
  type PracticeCandidate,
} from "@/lib/stats/practiceCandidates";
import { computeSessionEv } from "@/lib/stats/sessionEv";
import { buildTemporalInsights, SESSION_GAP_MS } from "@/lib/stats/temporal";
import type { RoleKey } from "@/lib/stats/roles";
import { winRate } from "@/lib/stats/wilson";

export default async function HomePage() {
  const [profile, ddragonVersion] = await Promise.all([
    getAppProfile(),
    getDdragonVersion(),
  ]);

  let dayLpDelta: number | null = null;
  let dayLpSoloDelta: number | null = null;
  let dayLpFlexDelta: number | null = null;
  let dayLpQueueLabel: string | null = null;
  let decision = null as ReturnType<typeof toDecisionFromAlerts>;
  let bestWindow: string | null = null;
  let recentFormWr: number | null = null;
  let pool: ReturnType<typeof buildContextualPool> = [];
  let idToKey: Record<number, string> = {};
  let goal = null as ReturnType<typeof computeDayGoalProgress> | null;
  let sessionEv = null as ReturnType<typeof computeSessionEv> | null;
  let practiceCandidates: PracticeCandidate[] = [];

  if (profile) {
    const queue = profile.queue as QueueFilter;
    const [matches, dayLpByQueue, analysis, champMap, snapshots] =
      await Promise.all([
      getStoredMatchesForPlayer(profile.playerId, {
        count: Math.min(profile.matchCount, 120),
        queue,
      }),
      getDayLpByQueue(profile.playerId, profile.puuid),
      getFreshAnalysisRun(profile.playerId, queue, profile.matchCount),
      getChampionIdToKey(ddragonVersion),
      listRankSnapshots(profile.playerId, { sinceMs: 14 * 24 * 60 * 60_000 }),
    ]);
    const dayLp = dayLpByQueue.active;
    dayLpDelta = dayLp?.lpDelta ?? null;
    dayLpSoloDelta = dayLpByQueue.solo.lpDelta ?? null;
    dayLpFlexDelta = dayLpByQueue.flex.lpDelta ?? null;
    dayLpQueueLabel = QUEUE_LABEL[dayLp.queueType] ?? null;
    idToKey = champMap;

    const ledger = buildMatchLpLedger({
      matches,
      puuid: profile.puuid,
      snapshots: snapshots.map((s) => ({
        ladderScore: s.ladderScore,
        createdAt: s.createdAt,
      })),
    });

    let wins = 0;
    for (const m of matches) {
      const me = m.info.participants.find((p) => p.puuid === profile.puuid);
      if (me?.win) wins += 1;
    }
    const overallWr = winRate(wins, matches.length);
    const temporal = buildTemporalInsights(matches, profile.puuid, overallWr);
    bestWindow = temporal.bestPlayWindow?.label ?? null;
    recentFormWr = temporal.recentForm?.wr ?? null;

    goal = computeDayGoalProgress({
      target: profile.dailyLpTarget,
      stopLoss: profile.dailyLpStop,
      delta: dayLp?.lpDelta ?? null,
      perHour: dayLp?.lpPerHour ?? null,
      avgLpPerWin: ledger.avgLpPerWin,
    });

    // Session streaks from recent matches
    const chrono = matches
      .map((m) => {
        const me = m.info.participants.find((p) => p.puuid === profile.puuid);
        if (!me) return null;
        return { createdAt: m.info.gameCreation, win: me.win };
      })
      .filter((g): g is { createdAt: number; win: boolean } => g != null)
      .sort((a, b) => a.createdAt - b.createdAt);
    const now = Date.now();
    let sessionStart = chrono.length;
    for (let i = chrono.length - 1; i >= 0; i--) {
      if (now - chrono[i].createdAt > SESSION_GAP_MS) break;
      if (
        i < chrono.length - 1 &&
        chrono[i + 1].createdAt - chrono[i].createdAt > SESSION_GAP_MS
      )
        break;
      sessionStart = i;
    }
    const session = chrono.slice(sessionStart);
    let lossStreak = 0;
    let winStreak = 0;
    for (let i = session.length - 1; i >= 0; i--) {
      if (session[i].win) {
        if (lossStreak > 0) break;
        winStreak += 1;
      } else {
        if (winStreak > 0) break;
        lossStreak += 1;
      }
    }

    if (analysis) {
      pool = buildContextualPool({
        analysis,
        preferredRole: profile.preferredRole as RoleKey,
        limitPerRole: 2,
        avgLpPerWin: ledger.avgLpPerWin,
        avgLpPerLoss: ledger.avgLpPerLoss,
      });
    }

    sessionEv = computeSessionEv({
      temporal,
      goal,
      nextSessionIndex: session.length + 1,
      lossStreak,
      winStreak,
      topPick: pool[0] ?? null,
    });

    const prepHref = "/preparar";
    if (analysis) {
      practiceCandidates = buildPracticeCandidates({
        analysis,
        pool,
        avgLpPerWin: ledger.avgLpPerWin,
        avgLpPerLoss: ledger.avgLpPerLoss,
      });
    }
    decision = toDecisionFromAlerts(temporal.alerts, {
      prepHref,
      timingHref: "/timing",
    });
    // Prefer session EV stop/warn on hub when stronger than soft alerts
    if (
      sessionEv.label === "stop" &&
      (!decision || decision.tone === "info" || decision.tone === "go")
    ) {
      decision = {
        id: "session-ev-stop",
        tone: "stop",
        verb: sessionEv.verb,
        detail: sessionEv.detail,
        actions: [
          { label: "Ver horários", href: "/timing", kind: "primary" },
          { label: "Abrir Coach", href: "/coach", kind: "ghost" },
        ],
        secondary: decision
          ? [
              {
                id: decision.id,
                severity: "info" as const,
                title: decision.verb,
                detail: decision.detail,
              },
            ]
          : [],
      };
    }
    if (decision) {
      decision = withPracticeHint(decision, practiceCandidates);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 py-4 sm:py-10">
      <div className="max-w-xl text-center">
        <p className="data-label mb-2">ALTTAB Esports</p>
        <h1 className="type-display text-3xl text-[var(--foreground)] sm:text-4xl">
          League Persua
        </h1>
        <p className="mt-3 type-body">
          {profile
            ? "Meta de PDL, fila do momento e pick — depois Coach no 2º monitor."
            : "Configure seu perfil uma vez. As partidas ficam neste servidor — histórico sem rebuscar a Riot a cada visita."}
        </p>
      </div>

      {profile ? (
        <ProfileHub
          profile={profile}
          ddragonVersion={ddragonVersion}
          dayLpDelta={dayLpDelta}
          dayLpSoloDelta={dayLpSoloDelta}
          dayLpFlexDelta={dayLpFlexDelta}
          dayLpQueueLabel={dayLpQueueLabel}
          decision={decision}
          bestWindow={bestWindow}
          recentFormWr={recentFormWr}
          pool={pool}
          idToKey={idToKey}
          goal={goal}
          sessionEv={sessionEv}
          practiceCandidates={practiceCandidates}
        />
      ) : (
        <div className="flex w-full max-w-2xl flex-col items-center gap-4">
          <Button href="/config" size="lg" className="w-full">
            Configurar meu perfil
          </Button>
          <Panel className="w-full p-4">
            <details>
              <summary className="cursor-pointer text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
                Ou analisar um invocador sem salvar
              </summary>
              <div className="mt-4">
                <SearchForm />
              </div>
            </details>
          </Panel>
        </div>
      )}

      {profile ? (
        <Panel inset className="w-full max-w-2xl p-4">
          <details>
            <summary className="cursor-pointer text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
              Analisar outro invocador
            </summary>
            <div className="mt-4">
              <SearchForm
                defaultRegion={profile.platform as PlatformRegion}
                defaultQueue={profile.queue as QueueFilter}
              />
            </div>
          </details>
        </Panel>
      ) : null}

      {!profile ? (
        <p className="text-center text-xs text-[var(--muted)]">
          Já tem perfil?{" "}
          <Link
            href="/config"
            className="text-[var(--alttab-soft)] hover:underline"
          >
            Abrir configuração
          </Link>
        </p>
      ) : null}
    </div>
  );
}

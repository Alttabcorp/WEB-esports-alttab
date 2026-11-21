import Image from "next/image";
import type { AppProfileView } from "@/lib/db/persist";
import { pct } from "@/lib/format";
import { championIconUrl, profileIconUrl } from "@/lib/ddragon";
import { ROLE_LABELS, type RoleKey } from "@/lib/stats/roles";
import type { DecisionModel } from "@/lib/alerts/decision";
import type { PoolPick } from "@/lib/stats/contextualPool";
import type { DayGoalProgress } from "@/lib/stats/dayGoal";
import type { SessionEvResult } from "@/lib/stats/sessionEv";
import type { PracticeCandidate } from "@/lib/stats/practiceCandidates";
import { ClearProfileButton } from "./ClearProfileButton";
import { BridgeStatusChip } from "./BridgeStatusChip";
import { DecisionCard } from "./DecisionCard";
import { DayGoalCard } from "./DayGoalCard";
import { PracticeNormalsPanel } from "./PracticeNormalsPanel";
import { Button, Panel } from "@/components/ui";

type Props = {
  profile: AppProfileView;
  ddragonVersion: string;
  dayLpDelta?: number | null;
  decision?: DecisionModel | null;
  bestWindow?: string | null;
  recentFormWr?: number | null;
  pool?: PoolPick[];
  idToKey?: Record<number, string>;
  goal?: DayGoalProgress | null;
  sessionEv?: SessionEvResult | null;
  practiceCandidates?: PracticeCandidate[];
};

export function ProfileHub({
  profile,
  ddragonVersion,
  dayLpDelta = null,
  decision = null,
  bestWindow = null,
  recentFormWr = null,
  pool = [],
  idToKey = {},
  goal = null,
  sessionEv = null,
  practiceCandidates = [],
}: Props) {
  const prepHref = "/preparar";
  const timingHref = "/timing";
  const syncHref = `/preparar?refresh=1&queue=${profile.queue}&count=${profile.matchCount}`;
  const champHref = "/ranking";
  const role = profile.preferredRole as RoleKey;
  const lpLabel =
    dayLpDelta == null
      ? "—"
      : dayLpDelta > 0
        ? `+${dayLpDelta}`
        : String(dayLpDelta);
  const top = pool[0] ?? null;

  const hubDecision: DecisionModel | null =
    decision ??
    (sessionEv
      ? {
          id: "hub-session-ev",
          tone:
            sessionEv.label === "stop"
              ? "stop"
              : sessionEv.label === "go"
                ? "go"
                : "warn",
          verb: sessionEv.verb,
          detail: sessionEv.reasons[0]
            ? `${sessionEv.detail} · ${sessionEv.reasons[0]}`
            : sessionEv.detail,
          actions: [
            { label: "Abrir Coach", href: "/coach", kind: "primary" },
            { label: "Ver horários", href: timingHref, kind: "ghost" },
          ],
        }
      : null);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {hubDecision ? <DecisionCard decision={hubDecision} /> : null}

      <Panel className="w-full p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Image
            src={profileIconUrl(ddragonVersion, profile.profileIconId ?? 29)}
            alt={profile.gameName}
            width={56}
            height={56}
            className="rounded-[var(--radius)] ring-1 ring-[var(--border)]"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="data-label">Sua sessão</p>
              <BridgeStatusChip puuid={profile.puuid} />
            </div>
            <h2 className="truncate text-xl font-semibold text-[var(--foreground)]">
              {profile.gameName}
              <span className="font-medium text-[var(--alttab)]">
                #{profile.tagLine}
              </span>
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {profile.platform.toUpperCase()} ·{" "}
              {ROLE_LABELS[role] ?? profile.preferredRole}
              {recentFormWr != null
                ? ` · forma ${pct(recentFormWr)}`
                : ""}
              {` · PDL hoje ${lpLabel}`}
              {bestWindow ? ` · melhor ${bestWindow}` : ""}
            </p>
          </div>
        </div>

        {top ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
            <Image
              src={championIconUrl(
                ddragonVersion,
                idToKey[top.championId] ?? top.championName,
              )}
              alt=""
              width={40}
              height={40}
              className="rounded-[var(--radius)] ring-1 ring-[var(--alttab)]"
            />
            <div className="min-w-0 flex-1">
              <p className="data-label">Pick agora</p>
              <p className="font-semibold text-[var(--foreground)]">
                {top.championName}
                <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                  {pct(top.wr)} WR · PDL {top.expectedLp >= 0 ? "+" : ""}
                  {top.expectedLp}
                </span>
              </p>
            </div>
            <Button href={champHref} variant="secondary" size="sm">
              Ver no ranking
            </Button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button href="/coach" size="lg" className="flex-1">
            Abrir Coach
          </Button>
          <Button
            href={prepHref}
            variant="secondary"
            size="lg"
            className="flex-1"
          >
            Preparar
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <Button href="/ranking" variant="ghost" size="sm">
            Ranking
          </Button>
          <Button href="/estatisticas" variant="ghost" size="sm">
            Estatísticas
          </Button>
          <Button href={timingHref} variant="ghost" size="sm">
            Quando
          </Button>
          <Button href={syncHref} variant="ghost" size="sm">
            Sync
          </Button>
          <Button href="/config" variant="ghost" size="sm">
            Config
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
          <p className="text-xs text-[var(--muted)]">
            Meta +{profile.dailyLpTarget} · stop {profile.dailyLpStop}
          </p>
          <ClearProfileButton />
        </div>
      </Panel>

      {goal ? <DayGoalCard goal={goal} sessionEv={sessionEv} /> : null}

      {practiceCandidates.length > 0 ? (
        <PracticeNormalsPanel
          candidates={practiceCandidates}
          ddragonVersion={ddragonVersion}
          idToKey={idToKey}
          compact
        />
      ) : null}
    </div>
  );
}

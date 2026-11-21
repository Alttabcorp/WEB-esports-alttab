import Image from "next/image";
import type { AppProfileView } from "@/lib/db/persist";
import { encodeRiotId, pct } from "@/lib/format";
import { championIconUrl, profileIconUrl } from "@/lib/ddragon";
import { ROLE_LABELS, type RoleKey } from "@/lib/stats/roles";
import type { DecisionModel } from "@/lib/alerts/decision";
import type { PoolPick } from "@/lib/stats/contextualPool";
import type { DayGoalProgress } from "@/lib/stats/dayGoal";
import type { SessionEvResult } from "@/lib/stats/sessionEv";
import { ClearProfileButton } from "./ClearProfileButton";
import { BridgeStatusChip } from "./BridgeStatusChip";
import { DecisionCard } from "./DecisionCard";
import { DayGoalCard } from "./DayGoalCard";
import { Button, Panel, Stat } from "@/components/ui";

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
}: Props) {
  const slug = encodeRiotId(profile.gameName, profile.tagLine);
  const base = `/summoner/${profile.platform}/${slug}`;
  const qs = `queue=${profile.queue}&count=${profile.matchCount}`;
  const prepHref = `${base}?${qs}`;
  const timingHref = `${prepHref}&tab=timing`;
  const syncHref = `${prepHref}&refresh=1`;
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

      {goal ? <DayGoalCard goal={goal} sessionEv={sessionEv} /> : null}

      <Panel className="w-full p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Image
            src={profileIconUrl(ddragonVersion, profile.profileIconId ?? 29)}
            alt={profile.gameName}
            width={64}
            height={64}
            className="rounded-[var(--radius)] ring-1 ring-[var(--border)]"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="data-label">Sua sessão</p>
              <BridgeStatusChip puuid={profile.puuid} />
            </div>
            <h2 className="truncate text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
              {profile.gameName}
              <span className="font-medium text-[var(--alttab)]">
                #{profile.tagLine}
              </span>
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {profile.platform.toUpperCase()} ·{" "}
              {ROLE_LABELS[role] ?? profile.preferredRole}
              {recentFormWr != null
                ? ` · forma recente ${pct(recentFormWr)}`
                : ""}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat label="PDL hoje" value={lpLabel} />
          <Stat
            label="Melhor horário"
            value={bestWindow ?? "—"}
            hint={bestWindow ? undefined : "precisa de dados"}
          />
          <Stat
            label="Partidas"
            value={String(profile.storedMatchCount)}
            hint="no servidor"
          />
        </div>

        {top ? (
          <div className="mt-5 flex flex-wrap items-center gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
            <Image
              src={championIconUrl(
                ddragonVersion,
                idToKey[top.championId] ?? top.championName,
              )}
              alt=""
              width={48}
              height={48}
              className="rounded-[var(--radius)] ring-1 ring-[var(--alttab)]"
            />
            <div className="min-w-0 flex-1">
              <p className="data-label">Pick sugerido agora</p>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {top.championName}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">
                {pct(top.wr)} WR · EV{" "}
                {top.expectedLp >= 0 ? "+" : ""}
                {top.expectedLp} PDL · {top.games} jogos
                {top.reasons[0] ? ` · ${top.reasons[0]}` : ""}
              </p>
            </div>
            <Button href={prepHref} variant="secondary" size="sm">
              Ver build
            </Button>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
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
          <Button href={syncHref} variant="ghost" size="sm">
            Sincronizar
          </Button>
          <Button href={timingHref} variant="ghost" size="sm">
            Horários / PDL
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
    </div>
  );
}

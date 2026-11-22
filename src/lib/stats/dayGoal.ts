import {
  DEFAULT_DAY_LP_GOAL,
  DEFAULT_DAY_LP_STOP,
} from "@/lib/stats/lpLedger";
import type { QueueFilter } from "@/lib/riot/types";

/** LP médio típico de uma vitória Solo/Duo (estimativa sem ledger fino). */
export const DEFAULT_AVG_LP_PER_WIN = 18;
export const DEFAULT_AVG_LP_PER_LOSS = 16;

export type GoalProfileFields = {
  dailyLpTarget: number;
  dailyLpStop: number;
  dailyLpTargetFlex?: number | null;
  dailyLpStopFlex?: number | null;
};

/**
 * Meta/stop da fila ativa. Flex usa campos Flex se preenchidos; senão herda Solo.
 */
export function resolveGoalForQueue(
  profile: GoalProfileFields,
  queue: QueueFilter | string | null | undefined,
): { target: number; stopLoss: number; inheritedFromSolo: boolean } {
  const soloTarget = clampLpTarget(profile.dailyLpTarget);
  const soloStop = clampLpStop(profile.dailyLpStop);
  const isFlex = queue === "flex";
  if (!isFlex) {
    return {
      target: soloTarget,
      stopLoss: soloStop,
      inheritedFromSolo: false,
    };
  }
  const hasFlexTarget =
    profile.dailyLpTargetFlex != null &&
    Number.isFinite(profile.dailyLpTargetFlex);
  const hasFlexStop =
    profile.dailyLpStopFlex != null && Number.isFinite(profile.dailyLpStopFlex);
  return {
    target: hasFlexTarget
      ? clampLpTarget(profile.dailyLpTargetFlex)
      : soloTarget,
    stopLoss: hasFlexStop
      ? clampLpStop(profile.dailyLpStopFlex)
      : soloStop,
    inheritedFromSolo: !hasFlexTarget || !hasFlexStop,
  };
}

export type DayGoalProgress = {
  target: number;
  stopLoss: number;
  delta: number | null;
  perHour: number | null;
  remainingLp: number | null;
  /** Wins estimados para bater a meta (ceil). */
  gamesRemainingEst: number | null;
  progressPct: number | null;
  goalHit: boolean;
  stopHit: boolean;
  status: "ahead" | "onTrack" | "behind" | "goalHit" | "stopHit" | "unknown";
};

export function clampLpTarget(n: number | null | undefined): number {
  if (n == null || !Number.isFinite(n)) return DEFAULT_DAY_LP_GOAL;
  return Math.max(5, Math.min(100, Math.round(n)));
}

export function clampLpStop(n: number | null | undefined): number {
  if (n == null || !Number.isFinite(n)) return DEFAULT_DAY_LP_STOP;
  return Math.max(-100, Math.min(-5, Math.round(n)));
}

export function computeDayGoalProgress(input: {
  target?: number | null;
  stopLoss?: number | null;
  delta: number | null;
  perHour?: number | null;
  avgLpPerWin?: number;
}): DayGoalProgress {
  const target = clampLpTarget(input.target);
  const stopLoss = clampLpStop(input.stopLoss);
  const delta = input.delta;
  const avgWin = input.avgLpPerWin ?? DEFAULT_AVG_LP_PER_WIN;
  const goalHit = delta != null && delta >= target;
  const stopHit = delta != null && delta <= stopLoss;

  if (delta == null) {
    return {
      target,
      stopLoss,
      delta: null,
      perHour: input.perHour ?? null,
      remainingLp: null,
      gamesRemainingEst: null,
      progressPct: null,
      goalHit: false,
      stopHit: false,
      status: "unknown",
    };
  }

  const remainingLp = Math.max(0, target - delta);
  const gamesRemainingEst =
    remainingLp <= 0 ? 0 : Math.ceil(remainingLp / Math.max(1, avgWin));
  const progressPct = Math.max(
    0,
    Math.min(100, Math.round((delta / Math.max(1, target)) * 100)),
  );

  let status: DayGoalProgress["status"] = "onTrack";
  if (stopHit) status = "stopHit";
  else if (goalHit) status = "goalHit";
  else if (delta >= target * 0.6 || (input.perHour != null && input.perHour >= 8))
    status = "ahead";
  else if (delta < 0 || (input.perHour != null && input.perHour < 0))
    status = "behind";

  return {
    target,
    stopLoss,
    delta,
    perHour: input.perHour ?? null,
    remainingLp,
    gamesRemainingEst,
    progressPct,
    goalHit,
    stopHit,
    status,
  };
}

export function dayGoalVerb(progress: DayGoalProgress): string {
  switch (progress.status) {
    case "goalHit":
      return "Meta batida — proteja o PDL";
    case "stopHit":
      return "Stop-loss — pare agora";
    case "behind":
      return progress.gamesRemainingEst != null
        ? `Atrasado — faltam ~${progress.gamesRemainingEst} win(s)`
        : "Atrasado na meta";
    case "ahead":
      return progress.gamesRemainingEst != null && progress.gamesRemainingEst > 0
        ? `No ritmo — ~${progress.gamesRemainingEst} win(s) para a meta`
        : "No ritmo da meta";
    case "onTrack":
      return progress.gamesRemainingEst != null
        ? `Faltam ~${progress.gamesRemainingEst} win(s) para +${progress.target}`
        : `Meta do dia: +${progress.target}`;
    default:
      return `Meta do dia: +${progress.target}`;
  }
}

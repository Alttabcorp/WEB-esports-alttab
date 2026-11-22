import type { TemporalInsights } from "@/lib/stats/temporal";
import type { DayGoalProgress } from "@/lib/stats/dayGoal";
import type { PoolPick } from "@/lib/stats/contextualPool";
import { PLAYER_TIMEZONE } from "@/lib/stats/temporal";

export type SessionEvInput = {
  temporal: TemporalInsights | null;
  goal: DayGoalProgress;
  /** Índice da próxima partida na sessão (1 = primeira). */
  nextSessionIndex: number;
  /** Derrotas seguidas na sessão atual. */
  lossStreak: number;
  /** Vitórias seguidas na sessão atual. */
  winStreak: number;
  topPick?: PoolPick | null;
  now?: number;
  /** Label da fila ativa (Solo/Duo, Flex) para reasons. */
  queueLabel?: string | null;
};

export type SessionEvResult = {
  /** Score −10…+10 (aprox). */
  score: number;
  /** −1…+1 normalizado. */
  normalized: number;
  label: "go" | "caution" | "stop";
  verb: string;
  detail: string;
  reasons: string[];
};

function zonedHour(ms: number, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  });
  let hour = Number(
    fmt.formatToParts(new Date(ms)).find((p) => p.type === "hour")?.value ?? 0,
  );
  if (hour === 24) hour = 0;
  return hour;
}

/**
 * EV da fila agora: combina janela, forma, índice de sessão, streaks, meta e pick.
 */
export function computeSessionEv(input: SessionEvInput): SessionEvResult {
  const now = input.now ?? Date.now();
  const reasons: string[] = [];
  let score = 0;
  const temporal = input.temporal;

  const q = input.queueLabel?.trim() || "Ranked";

  if (input.goal.stopHit) {
    score -= 5;
    reasons.push(`Stop-loss ${q} (${input.goal.delta} PDL).`);
  } else if (input.goal.goalHit) {
    score -= 3;
    reasons.push(`Meta ${q} +${input.goal.target} batida — proteja o lucro.`);
  } else if (input.goal.delta != null && input.goal.delta < 0) {
    score -= 1;
    reasons.push(`PDL ${q} do dia ${input.goal.delta}.`);
  } else if (input.goal.status === "ahead") {
    score += 1;
    reasons.push(`No ritmo da meta de PDL (${q}).`);
  }

  if (temporal?.bestPlayWindow) {
    const hour = zonedHour(now, PLAYER_TIMEZONE);
    const windowStart = Math.floor(hour / 3) * 3;
    const inBest =
      Number(temporal.bestPlayWindow.key) === windowStart &&
      temporal.bestPlayWindow.lift >= 0.03;
    if (inBest) {
      score += 2;
      reasons.push(`Melhor horário (${temporal.bestPlayWindow.label}).`);
    } else if (temporal.bestPlayWindow.lift >= 0.08) {
      score -= 1;
      reasons.push(`Fora do melhor bloco (${temporal.bestPlayWindow.label}).`);
    }
  }

  if (temporal?.recentForm) {
    if (temporal.recentForm.lift >= 0.05) {
      score += 1;
      reasons.push("Forma recente quente.");
    } else if (temporal.recentForm.lift <= -0.08) {
      score -= 1;
      reasons.push("Forma recente fria.");
    }
  }

  const idxHist = temporal?.sessionIndex.find(
    (s) => s.index === input.nextSessionIndex && s.games >= 5,
  );
  if (idxHist) {
    if (idxHist.lift <= -0.1) {
      score -= 2;
      reasons.push(
        `${input.nextSessionIndex}ª da sessão fraca (${Math.round(idxHist.wr * 100)}% WR).`,
      );
    } else if (idxHist.lift >= 0.05) {
      score += 1;
      reasons.push(`Boa ${input.nextSessionIndex}ª da sessão.`);
    }
  }

  if (input.lossStreak >= 2) {
    score -= 3;
    reasons.push(`${input.lossStreak} derrotas seguidas — tilt.`);
  } else if (input.winStreak >= 3) {
    const trap = temporal?.afterWinStreaks.find(
      (s) => s.afterWins === input.winStreak && s.lift <= -0.08,
    );
    if (trap) {
      score -= 2;
      reasons.push(`Armadilha após ${input.winStreak} wins.`);
    }
  }

  if (input.topPick) {
    if (input.topPick.contextBonus >= 0.05) {
      score += 1;
      reasons.push(`Pick forte agora: ${input.topPick.championName}.`);
    } else if (input.topPick.contextBonus <= -0.05) {
      score -= 1;
      reasons.push(`Pick frágil neste contexto: ${input.topPick.championName}.`);
    }
  }

  const clamped = Math.max(-10, Math.min(10, score));
  const normalized = clamped / 10;
  const label: SessionEvResult["label"] =
    clamped >= 2 ? "go" : clamped <= -2 ? "stop" : "caution";

  const verb =
    label === "go"
      ? "Janela boa — pode filar"
      : label === "stop"
        ? "Evite fila agora"
        : "Cuidado — só 1 ranked focada";

  const detail =
    input.goal.gamesRemainingEst != null && !input.goal.goalHit
      ? `${verb}. Meta +${input.goal.target}: ~${input.goal.gamesRemainingEst} win(s).`
      : verb;

  return {
    score: clamped,
    normalized,
    label,
    verb,
    detail,
    reasons: reasons.slice(0, 5),
  };
}

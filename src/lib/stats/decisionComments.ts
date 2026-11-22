import type { AggregateResult } from "@/lib/stats/aggregate";
import type { PoolPick } from "@/lib/stats/contextualPool";
import type { DayGoalProgress } from "@/lib/stats/dayGoal";
import { dayGoalVerb } from "@/lib/stats/dayGoal";
import type { DayLpSummary } from "@/lib/stats/lpLedger";
import { QUEUE_LABEL } from "@/lib/stats/lpLedger";
import type { PracticeCandidate } from "@/lib/stats/practiceCandidates";
import type { SessionEvResult } from "@/lib/stats/sessionEv";
import { pct } from "@/lib/format";

export type DecisionCommentBlock = {
  title: string;
  items: string[];
};

/**
 * Comentários de decisão gerados pelas estatísticas —
 * “do dia” = sessão/PDL atual; “geral” = padrões do histórico.
 */
export function buildDecisionComments(input: {
  sessionEv: SessionEvResult | null;
  dayGoal: DayGoalProgress | null;
  dayLpSolo: DayLpSummary | null;
  dayLpFlex: DayLpSummary | null;
  trackQueue: string;
  todayPool: PoolPick[];
  analysis: AggregateResult;
  practiceCandidates: PracticeCandidate[];
}): { daily: DecisionCommentBlock; general: DecisionCommentBlock } {
  const daily: string[] = [];
  const general: string[] = [];

  const { sessionEv, dayGoal, dayLpSolo, dayLpFlex, analysis } = input;
  const temporal = analysis.temporal;

  if (sessionEv) {
    daily.push(`${sessionEv.verb}: ${sessionEv.detail}`);
    for (const r of sessionEv.reasons.slice(0, 4)) {
      if (!daily.includes(r) && !daily.some((d) => d.includes(r))) {
        daily.push(r);
      }
    }
  }

  if (dayGoal) {
    daily.push(dayGoalVerb(dayGoal));
  }

  for (const q of [dayLpSolo, dayLpFlex]) {
    if (!q || q.gamesToday <= 0) continue;
    const label = QUEUE_LABEL[q.queueType] ?? q.queueType;
    const delta =
      q.lpDelta == null
        ? ""
        : ` · ${q.lpDelta > 0 ? "+" : ""}${q.lpDelta} PDL`;
    daily.push(
      `${label} hoje: ${q.winsToday}W ${q.lossesToday}L (${q.gamesToday} jogos)${delta}.`,
    );
  }

  const top = input.todayPool[0];
  if (top) {
    daily.push(
      `Pick sugerido: ${top.championName} (${pct(top.wr)} WR, PDL ${
        top.expectedLp >= 0 ? "+" : ""
      }${top.expectedLp})${
        top.reasons[0] ? ` — ${top.reasons[0]}` : ""
      }.`,
    );
  }

  if (temporal?.recentForm && temporal.recentForm.games >= 5) {
    general.push(
      `Forma recente: ${pct(temporal.recentForm.wr)} nas últimas ${temporal.recentForm.games} (${
        temporal.recentForm.lift >= 0 ? "+" : ""
      }${pct(temporal.recentForm.lift)} vs média).`,
    );
  }

  if (temporal?.bestPlayWindow) {
    general.push(
      `Melhor horário no histórico: ${temporal.bestPlayWindow.label} (${pct(
        temporal.bestPlayWindow.wr,
      )} WR em ${temporal.bestPlayWindow.games} jogos).`,
    );
  }

  if (temporal?.bestDay) {
    general.push(
      `Melhor dia da semana: ${temporal.bestDay.label} (${pct(
        temporal.bestDay.wr,
      )} WR).`,
    );
  }

  for (const alert of temporal?.alerts?.slice(0, 5) ?? []) {
    general.push(`${alert.title}: ${alert.detail}`);
  }

  for (const c of input.practiceCandidates.slice(0, 2)) {
    general.push(`Avaliar em normais: ${c.championName} — ${c.reason}.`);
  }

  if (analysis.analyzedGames < 30) {
    general.push(
      `Amostra ainda pequena (${analysis.analyzedGames} partidas) — recomendações ficam mais firmes com 200+.`,
    );
  }

  if (daily.length === 0) {
    daily.push(
      "Sem sinal forte para hoje ainda — sincronize o histórico ou jogue uma ranked.",
    );
  }
  if (general.length === 0) {
    general.push(
      "Padrões gerais aparecem com mais partidas no banco (horário, forma, streaks).",
    );
  }

  return {
    daily: {
      title: "Comentário do dia",
      items: daily.slice(0, 6),
    },
    general: {
      title: "Comentário geral",
      items: general.slice(0, 8),
    },
  };
}

import { pct } from "@/lib/format";
import type { DayLpCalendarEntry } from "@/lib/stats/lpCalendar";
import type { DayGoalProgress } from "@/lib/stats/dayGoal";
import {
  PLAYER_TIMEZONE,
  type AvoidItem,
  type TemporalInsights,
} from "@/lib/stats/temporal";

export type PlayerScorecard = {
  days: 7 | 28;
  daysWithData: number;
  lpDelta: number | null;
  recentFormWr: number | null;
  recentFormGames: number | null;
  bestWindowLabel: string | null;
};

export type ActionableInsight = {
  id: string;
  title: string;
  verb: string;
  detail: string;
  tone: "go" | "warn" | "info";
};

export type HeatCell = {
  /** 0–6 Dom–Sáb */
  dow: number;
  /** Bloco de 3h: 0,3,6… */
  hourWindow: number;
  /** Intensidade relativa 0–1 a partir do lift (ou null se sem dado). */
  intensity: number | null;
  wr: number | null;
  games: number;
  label: string;
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
 * Scorecard 7 ou 28 dias a partir do calendário PDL + temporal.
 */
export function buildPlayerScorecard(input: {
  calendar: DayLpCalendarEntry[];
  temporal: TemporalInsights | null;
  days: 7 | 28;
}): PlayerScorecard {
  const slice = input.calendar.slice(-input.days);
  const withDelta = slice.filter((d) => d.lpDelta != null);
  const lpDelta =
    withDelta.length > 0
      ? withDelta.reduce((s, d) => s + (d.lpDelta ?? 0), 0)
      : null;
  const form = input.temporal?.recentForm ?? null;
  return {
    days: input.days,
    daysWithData: withDelta.length,
    lpDelta,
    recentFormWr: form?.wr ?? null,
    recentFormGames: form?.games ?? null,
    bestWindowLabel: input.temporal?.bestPlayWindow?.label ?? null,
  };
}

/**
 * Limite de sessão sugerido: primeiro índice/tamanho com lift negativo relevante.
 */
export function suggestSessionLimit(
  temporal: TemporalInsights,
): ActionableInsight | null {
  const byIndex = [...(temporal.sessionIndex ?? [])]
    .filter((s) => s.index >= 2 && s.games >= 4)
    .sort((a, b) => a.index - b.index);
  const decay = byIndex.find((s) => s.lift <= -0.08);
  if (decay) {
    return {
      id: "session-index-limit",
      title: "Limite de sessão",
      verb: `Pare antes da ${decay.index}ª`,
      detail: `${pct(decay.wr)} WR na ${decay.index}ª+ partida (${decay.games} amostras, ${pct(decay.lift)} vs média).`,
      tone: "warn",
    };
  }

  const byLen = [...(temporal.bySessionLength ?? [])]
    .filter((s) => s.games >= 4)
    .sort((a, b) => a.gamesInSession - b.gamesInSession);
  const long = byLen.find((s) => s.lift <= -0.08 && s.gamesInSession >= 3);
  if (long) {
    return {
      id: "session-length-limit",
      title: "Limite de sessão",
      verb: long.label,
      detail: `${pct(long.wr)} WR em sessões desse tamanho (${long.games} amostras).`,
      tone: "warn",
    };
  }

  const best = byIndex.find((s) => s.lift >= 0.05);
  if (best) {
    return {
      id: "session-sweet-spot",
      title: "Limite de sessão",
      verb: `Melhor na ${best.index}ª`,
      detail: `${pct(best.wr)} WR nesse índice (${best.games} amostras).`,
      tone: "go",
    };
  }
  return null;
}

/**
 * Regra de pausa a partir de byRefillGap.
 */
export function suggestPauseRule(
  temporal: TemporalInsights,
): ActionableInsight | null {
  const gaps = [...(temporal.byRefillGap ?? [])].filter((g) => g.games >= 4);
  if (!gaps.length) return null;

  const quick = gaps.find(
    (g) =>
      (g.key === "0-15" || g.gapMinMinutes <= 15) && g.lift <= -0.05,
  );
  const best = [...gaps].sort((a, b) => b.lift - a.lift)[0];

  if (quick && best && best.lift > quick.lift + 0.03) {
    return {
      id: "pause-rule",
      title: "Regra de pausa",
      verb: `Pausar ≥${Math.max(15, best.gapMinMinutes)} min`,
      detail: `Refill rápido (${quick.label}): ${pct(quick.wr)} WR. ${best.label}: ${pct(best.wr)} WR (${best.games} jogos).`,
      tone: "warn",
    };
  }
  if (best && best.lift >= 0.05) {
    return {
      id: "pause-best-gap",
      title: "Regra de pausa",
      verb: best.label,
      detail: `${pct(best.wr)} WR após essa pausa (${best.games} jogos, ${pct(best.lift)} vs média).`,
      tone: "go",
    };
  }
  if (quick) {
    return {
      id: "pause-quick-trap",
      title: "Regra de pausa",
      verb: "Evite refill imediato",
      detail: `${pct(quick.wr)} WR após pausa curta (${quick.games} jogos).`,
      tone: "warn",
    };
  }
  return null;
}

/**
 * Evitar agora: avoidList + champs fracos no bloco horário atual.
 */
export function avoidNowInsights(
  temporal: TemporalInsights,
  now = Date.now(),
): ActionableInsight[] {
  const hour = zonedHour(now, PLAYER_TIMEZONE);
  const window = Math.floor(hour / 3) * 3;
  const out: ActionableInsight[] = [];

  const weakHour = (temporal.champByHour ?? [])
    .filter(
      (c) =>
        c.hourWindow === window && c.games >= 3 && c.lift <= -0.08,
    )
    .sort((a, b) => a.lift - b.lift)
    .slice(0, 2);

  for (const c of weakHour) {
    out.push({
      id: `avoid-hour-${c.championId}`,
      title: "Evitar agora",
      verb: c.championName,
      detail: `${pct(c.wr)} WR neste bloco (${c.label}, ${c.games} jogos).`,
      tone: "warn",
    });
  }

  const avoids = (temporal.avoidList ?? []).slice(0, 3);
  for (const a of avoids) {
    if (out.some((x) => x.verb === a.championName)) continue;
    out.push({
      id: `avoid-${a.kind}-${a.championId}-${a.enemyChampionId ?? 0}`,
      title: "Evitar no pool",
      verb:
        a.kind === "matchup" && a.enemyChampionName
          ? `${a.championName} vs ${a.enemyChampionName}`
          : a.championName,
      detail: `${pct(a.wr)} WR · ${a.games} jogos (${pct(a.lift)} vs média).`,
      tone: "warn",
    });
    if (out.length >= 4) break;
  }

  return out;
}

/**
 * Heatmap simples: cruza força por dia-da-semana e por bloco horário
 * (produto dos lifts normalizados — não é cruzamento real de célula,
 * mas dá mapa legível “onde você performa”).
 */
export function buildHourDowHeatmap(
  temporal: TemporalInsights,
): HeatCell[] {
  const days = temporal.byDayOfWeek ?? [];
  const hours = temporal.byHour ?? [];
  if (!days.length || !hours.length) return [];

  const dayMap = new Map(days.map((d) => [Number(d.key), d]));
  const hourMap = new Map(hours.map((h) => [Number(h.key), h]));

  const lifts = [
    ...days.map((d) => d.lift),
    ...hours.map((h) => h.lift),
  ];
  const maxAbs = Math.max(0.01, ...lifts.map((l) => Math.abs(l)));

  const cells: HeatCell[] = [];
  for (let dow = 0; dow < 7; dow++) {
    const day = dayMap.get(dow);
    for (let hourWindow = 0; hourWindow < 24; hourWindow += 3) {
      const hour = hourMap.get(hourWindow);
      const games = Math.min(day?.games ?? 0, hour?.games ?? 0);
      if (!day || !hour || games < 1) {
        cells.push({
          dow,
          hourWindow,
          intensity: null,
          wr: null,
          games: 0,
          label: `${day?.label ?? dow} · ${hour?.label ?? hourWindow}h`,
        });
        continue;
      }
      const combined = (day.lift + hour.lift) / 2;
      const intensity = Math.max(-1, Math.min(1, combined / maxAbs));
      cells.push({
        dow,
        hourWindow,
        intensity,
        wr: (day.wr + hour.wr) / 2,
        games,
        label: `${day.label} · ${hour.label}`,
      });
    }
  }
  return cells;
}

export function streakInsight(
  temporal: TemporalInsights,
): ActionableInsight | null {
  const loss = (temporal.afterLossStreaks ?? []).find(
    (s) => s.games >= 3 && s.lift <= -0.08,
  );
  if (loss) {
    return {
      id: "loss-streak",
      title: "Após derrotas",
      verb: `Cuidado após ${loss.afterLosses}L`,
      detail: `${pct(loss.wr)} WR na próxima (${loss.games} vezes).`,
      tone: "warn",
    };
  }
  const win = (temporal.afterWinStreaks ?? []).find(
    (s) => s.games >= 3 && s.lift >= 0.05,
  );
  if (win) {
    return {
      id: "win-streak",
      title: "Após vitórias",
      verb: `Bom ritmo após ${win.afterWins}W`,
      detail: `${pct(win.wr)} WR na próxima (${win.games} vezes).`,
      tone: "go",
    };
  }
  return null;
}

export function sortAlertsByPriority<
  T extends { severity: "info" | "warn" | "good" },
>(alerts: T[]): T[] {
  const rank = { warn: 0, info: 1, good: 2 } as const;
  return [...alerts].sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export function goalAnchorLabel(goal: DayGoalProgress | null): {
  verb: string;
  metric: string;
  hint: string;
} {
  if (!goal) {
    return {
      verb: "Sem meta",
      metric: "—",
      hint: "Defina meta/stop em Config",
    };
  }
  const delta =
    goal.delta == null
      ? "—"
      : goal.delta > 0
        ? `+${goal.delta}`
        : String(goal.delta);
  if (goal.stopHit) {
    return {
      verb: "Stop-loss",
      metric: delta,
      hint: `Limite ${goal.stopLoss} atingido`,
    };
  }
  if (goal.goalHit) {
    return {
      verb: "Meta batida",
      metric: delta,
      hint: `Alvo +${goal.target}`,
    };
  }
  return {
    verb: `Meta +${goal.target}`,
    metric: delta,
    hint:
      goal.status === "ahead"
        ? "No ritmo"
        : goal.status === "behind"
          ? "Abaixo do ritmo"
          : "Em andamento",
  };
}

export type { AvoidItem };

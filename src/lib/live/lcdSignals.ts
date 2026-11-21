import type { DecisionModel, DecisionTone } from "@/lib/alerts/decision";
import type { LiveClientSnapshot } from "@/lib/live/clientData";

export type LcdSignalTone = "ok" | "caution" | "danger";

export type LcdSignal = {
  id: string;
  tone: LcdSignalTone;
  verb: string;
  detail: string;
};

export type InGameDecisionContext = {
  /** Próximo item da build pessoal (slot ainda não comprado). */
  nextItemId?: number | null;
  /** Nome do campeão do laner inimigo (LCD / draft). */
  enemyLanerName?: string | null;
  /** Build pessoal já completa no inventário. */
  buildComplete?: boolean;
};

function goldProxy(p: {
  kills: number;
  assists: number;
  creepScore: number;
}): number {
  return p.kills * 300 + p.assists * 100 + p.creepScore * 20;
}

function kdaOf(p: { kills: number; deaths: number; assists: number }): number {
  return p.deaths === 0
    ? p.kills + p.assists
    : (p.kills + p.assists) / Math.max(1, p.deaths);
}

function toneToDecision(tone: LcdSignalTone): DecisionTone {
  if (tone === "danger") return "stop";
  if (tone === "ok") return "go";
  return "warn";
}

/**
 * Sinais leves a partir do Live Client (sem timeline Riot).
 * Heurísticas honestas — não afirmam “jogo perdido” como fato.
 */
export function buildLcdSignals(
  snap: LiveClientSnapshot | null,
  ctx: InGameDecisionContext = {},
): LcdSignal[] {
  if (!snap?.me || !snap.inGame) return [];
  const me = snap.me;
  const signals: LcdSignal[] = [];
  const mySide = snap.players.find((p) => p.isMe)?.team;
  const enemies = mySide
    ? snap.players.filter((p) => p.team !== mySide)
    : [];
  const allies = mySide
    ? snap.players.filter((p) => p.team === mySide)
    : [];

  const myKda = kdaOf(me);
  const enemyGoldProxy = enemies.reduce((s, p) => s + goldProxy(p), 0);
  const allyGoldProxy = allies.reduce((s, p) => s + goldProxy(p), 0);
  const goldGap = allyGoldProxy - enemyGoldProxy;
  const gameMin = (snap.game?.gameTime ?? 0) / 60;

  const lanerName = (ctx.enemyLanerName ?? "").trim().toLowerCase();
  const laner = lanerName
    ? enemies.find((p) => p.championName.toLowerCase() === lanerName)
    : null;

  if (me.currentHealth > 0 && me.maxHealth > 0) {
    const hp = me.currentHealth / me.maxHealth;
    if (hp < 0.25 && gameMin > 5) {
      signals.push({
        id: "low-hp",
        tone: "danger",
        verb: "HP crítico — base ou safe",
        detail: "Não dispute contest com pouca vida.",
      });
    }
  }

  if (me.deaths >= 4 && myKda < 1.2 && gameMin >= 12) {
    signals.push({
      id: "deaths-high",
      tone: "danger",
      verb: "Não force jogadas",
      detail: `${me.deaths} mortes — jogue para farm e objetivos, não para highlight.`,
    });
  } else if (me.deaths >= 2 && myKda < 1.5) {
    signals.push({
      id: "deaths-mid",
      tone: "caution",
      verb: "Resete a lane",
      detail: "KDA pressionado — priorize CS e visão antes de fight.",
    });
  }

  if (laner && gameMin >= 6) {
    const myProxy = goldProxy(me);
    const theirProxy = goldProxy(laner);
    const gap = myProxy - theirProxy;
    const csGap = me.creepScore - laner.creepScore;
    if (gap < -350 || csGap <= -20) {
      signals.push({
        id: "vs-laner-behind",
        tone: "caution",
        verb: "Jogue safe vs laner",
        detail: `${laner.championName} à frente (CS ${laner.creepScore} vs ${me.creepScore}) — farm e visão, sem all-in 1v1.`,
      });
    } else if (gap > 450 || csGap >= 18) {
      signals.push({
        id: "vs-laner-ahead",
        tone: "ok",
        verb: "Dispute — você está ahead",
        detail: `Vantagem vs ${laner.championName}. Negocie wave e busque pressão, sem overextend.`,
      });
    }
  }

  if (gameMin >= 25) {
    if (goldGap > 1000) {
      signals.push({
        id: "late-close",
        tone: "ok",
        verb: "Feche com baron/inhib",
        detail: "Late ahead — traduza vantagem em objetivo, não chase solto.",
      });
    } else if (goldGap < -800) {
      signals.push({
        id: "late-cede",
        tone: "caution",
        verb: "Ceda e farm",
        detail: "Late atrás — não dispute baron igual; pegue wave e escala.",
      });
    }
  } else if (gameMin >= 15 && goldGap < -800) {
    signals.push({
      id: "behind",
      tone: "caution",
      verb: "Time atrás — jogue para late",
      detail:
        "Proxy de ouro desfavorável. Evite fights iguais; pegue wave e escala.",
    });
  } else if (gameMin >= 15 && goldGap > 1200) {
    signals.push({
      id: "ahead",
      tone: "ok",
      verb: "Snowball — feche com objetivo",
      detail: "Vantagem aparente. Traduza em torre/dragão, não chase.",
    });
  }

  if (ctx.buildComplete) {
    signals.push({
      id: "item-spike",
      tone: "ok",
      verb: "Você spikou — busque fight/objetivo",
      detail: "Build pessoal completa. Procure fight com visão ou objetivo aberto.",
    });
  } else if (ctx.nextItemId) {
    signals.push({
      id: "next-item",
      tone: "ok",
      verb: "Foque no próximo item",
      detail: "Complete o item da build antes de forçar jogada sem spike.",
    });
  }

  return signals;
}

/**
 * Uma decisão dominante para o Decision Card in-game.
 * Prioridade: HP baixo > mortes > vs laner > time > spike/item.
 */
export function buildInGameDecision(
  snap: LiveClientSnapshot | null,
  ctx: InGameDecisionContext = {},
): DecisionModel | null {
  const signals = buildLcdSignals(snap, ctx);
  if (!signals.length) {
    if (!snap?.me || !snap.inGame) return null;
    return {
      id: "in-game-default",
      tone: "info",
      verb: "Farm e visão",
      detail: "Sem alerta forte — jogue a lane e prepare o próximo spike.",
      actions: [],
    };
  }

  const priority = [
    "low-hp",
    "deaths-high",
    "deaths-mid",
    "vs-laner-behind",
    "behind",
    "late-cede",
    "vs-laner-ahead",
    "late-close",
    "ahead",
    "item-spike",
    "next-item",
  ];
  const primary =
    priority
      .map((id) => signals.find((s) => s.id === id))
      .find((s): s is LcdSignal => Boolean(s)) ?? signals[0];

  const secondary = signals
    .filter((s) => s.id !== primary.id)
    .slice(0, 3)
    .map((s) => ({
      id: s.id,
      severity:
        s.tone === "danger"
          ? ("warn" as const)
          : s.tone === "ok"
            ? ("good" as const)
            : ("info" as const),
      title: s.verb,
      detail: s.detail,
    }));

  return {
    id: `in-game-${primary.id}`,
    tone: toneToDecision(primary.tone),
    verb: primary.verb,
    detail: primary.detail,
    actions: [],
    secondary: secondary.length ? secondary : undefined,
  };
}

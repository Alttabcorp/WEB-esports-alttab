import type { DraftRecommendation } from "@/lib/stats/draft";

export type DodgeAdvice = {
  shouldConsiderDodge: boolean;
  /** EV relativo negativo (quanto pior vs média do top pick). */
  evGap: number;
  verb: string;
  detail: string;
};

/**
 * Conselho leve de dodge: só quando o melhor pick disponível está
 * muito abaixo do baseline (baixa confiança + WR fraco / razões ruins).
 * Nunca executa dodge — só texto.
 */
export function evaluateDodgeAdvice(
  recommendations: DraftRecommendation[],
): DodgeAdvice | null {
  const top = recommendations[0];
  if (!top) return null;

  const second = recommendations[1];
  const gap = second ? top.score - second.score : top.score;
  const weak =
    top.confidence === "low" ||
    (top.gamesInRole < 5 && top.wrInRole < 0.48) ||
    top.wrInRole <= 0.42;

  const evGap = Math.round((0.5 - top.wrInRole) * 18 * 10) / 10;

  if (!weak || evGap < 2) {
    return {
      shouldConsiderDodge: false,
      evGap: Math.max(0, evGap),
      verb: "Board jogável",
      detail: `${top.championId ? "Melhor pick" : "Pick"} com EV aceitável — não dodge.`,
    };
  }

  if (gap < 0.05 && second) {
    return {
      shouldConsiderDodge: true,
      evGap,
      verb: "Considere dodge",
      detail: `Top picks fracos (~${Math.round(top.wrInRole * 100)}% WR na lane). Gap EV ≈ −${evGap} LP vs média.`,
    };
  }

  if (top.wrInRole <= 0.4 && top.gamesInRole >= 5) {
    return {
      shouldConsiderDodge: true,
      evGap,
      verb: "Dodge com alto EV",
      detail: `Melhor opção histórica ruim (${Math.round(top.wrInRole * 100)}% WR). Proteger PDL pode valer o LP do dodge.`,
    };
  }

  return {
    shouldConsiderDodge: false,
    evGap: Math.max(0, evGap),
    verb: "Board apertado",
    detail: "Amostra fraca — jogue safe ou espere melhor fila.",
  };
}

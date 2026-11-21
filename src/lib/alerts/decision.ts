import type { PerformanceAlert } from "@/lib/stats/temporal";
import type { SessionAdvice } from "@/lib/live/sessionAdvice";

export type DecisionTone = "stop" | "warn" | "go" | "info";

export type DecisionAction = {
  label: string;
  href?: string;
  kind?: "primary" | "secondary" | "ghost";
};

export type DecisionModel = {
  id: string;
  tone: DecisionTone;
  verb: string;
  detail: string;
  actions: DecisionAction[];
  secondary?: PerformanceAlert[];
};

const VERB_BY_ID: Record<string, string> = {
  "sample-small": "Sincronize mais partidas",
  "best-window": "Janela boa — pode jogar",
  "worst-hour": "Evite fila neste horário",
  "best-day": "Bom dia para grindar",
  "worst-day": "Evite ranked neste dia",
  "session-decay": "Pare a sessão agora",
  "streak-trap-win": "Cuidado com tilt de vitória",
  "streak-trap-loss": "Pare após derrotas em sequência",
  "tilt-risk": "Evite outra ranked agora",
  "refill-good": "Pausa ajudou — pode continuar",
  "long-session": "Sessão longa — considere parar",
};

function severityRank(s: PerformanceAlert["severity"]): number {
  if (s === "warn") return 0;
  if (s === "info") return 1;
  return 2;
}

function verbFor(alert: PerformanceAlert): string {
  if (VERB_BY_ID[alert.id]) return VERB_BY_ID[alert.id];
  if (alert.id.startsWith("streak-trap")) {
    return alert.id.includes("loss")
      ? "Pare após derrotas em sequência"
      : "Cuidado com tilt de vitória";
  }
  if (alert.severity === "warn") return alert.title;
  if (alert.severity === "good") return alert.title;
  return alert.title;
}

function actionsFor(
  alert: PerformanceAlert,
  links: { prepHref?: string; timingHref?: string },
): DecisionAction[] {
  if (alert.id === "sample-small") {
    return [
      { label: "Ir para Config", href: "/config", kind: "primary" },
      { label: "Abrir Coach", href: "/coach", kind: "secondary" },
    ];
  }
  if (alert.severity === "warn") {
    return [
      {
        label: "Ver horários",
        href: links.timingHref ?? links.prepHref,
        kind: "primary",
      },
      { label: "Abrir Coach", href: "/coach", kind: "ghost" },
    ];
  }
  return [
    { label: "Abrir Coach", href: "/coach", kind: "primary" },
    {
      label: "Preparar",
      href: links.prepHref,
      kind: "ghost",
    },
  ];
}

export function pickPrimaryAlert(
  alerts: PerformanceAlert[],
): PerformanceAlert | null {
  if (!alerts.length) return null;
  return [...alerts].sort((a, b) => {
    const sr = severityRank(a.severity) - severityRank(b.severity);
    if (sr !== 0) return sr;
    // Prefer session/streak over soft tips
    const weight = (id: string) =>
      id.includes("session") || id.includes("streak") || id.includes("tilt")
        ? 0
        : id.includes("worst")
          ? 1
          : 2;
    return weight(a.id) - weight(b.id);
  })[0];
}

export function toDecisionFromAlerts(
  alerts: PerformanceAlert[],
  prepHrefOrLinks?:
    | string
    | { prepHref?: string; timingHref?: string },
): DecisionModel | null {
  const primary = pickPrimaryAlert(alerts);
  if (!primary) return null;
  const secondary = alerts.filter((a) => a.id !== primary.id);
  const links =
    typeof prepHrefOrLinks === "string"
      ? {
          prepHref: prepHrefOrLinks,
          timingHref: `${prepHrefOrLinks}${prepHrefOrLinks.includes("?") ? "&" : "?"}tab=timing`,
        }
      : {
          prepHref: prepHrefOrLinks?.prepHref,
          timingHref:
            prepHrefOrLinks?.timingHref ??
            (prepHrefOrLinks?.prepHref
              ? `${prepHrefOrLinks.prepHref}${prepHrefOrLinks.prepHref.includes("?") ? "&" : "?"}tab=timing`
              : undefined),
        };

  const actions = actionsFor(primary, links).filter((a) => Boolean(a.href));

  const tone: DecisionTone =
    primary.severity === "warn"
      ? primary.id.includes("session") || primary.id.includes("streak")
        ? "stop"
        : "warn"
      : primary.severity === "good"
        ? "go"
        : "info";

  return {
    id: primary.id,
    tone,
    verb: verbFor(primary),
    detail: primary.detail,
    actions,
    secondary,
  };
}

export function toDecisionFromSessionAdvice(
  advice: SessionAdvice,
): DecisionModel {
  const tone: DecisionTone =
    advice.decision === "stop"
      ? "stop"
      : advice.decision === "continue"
        ? "go"
        : "warn";
  const verb =
    advice.lp.goalHit
      ? "Meta batida — pare"
      : advice.lp.stopHit
        ? "Stop-loss — pare agora"
        : advice.sessionEv?.verb
          ? advice.sessionEv.verb
          : advice.decision === "stop"
            ? "Pare agora"
            : advice.decision === "continue"
              ? "Pode continuar"
              : "Cuidado nesta sessão";

  const detailParts = [
    advice.summary || advice.title,
    advice.lp.delta != null
      ? `PDL ${advice.lp.delta >= 0 ? "+" : ""}${advice.lp.delta}/${advice.lp.goal}`
      : null,
    advice.nextPlan?.verb ?? null,
  ].filter(Boolean);

  return {
    id: `session-${advice.decision}`,
    tone,
    verb,
    detail: detailParts.join(" · "),
    actions:
      advice.decision === "stop"
        ? [{ label: "Voltar ao hub", href: "/", kind: "primary" }]
        : [
            { label: "Abrir Coach", href: "/coach", kind: "primary" },
            { label: "Preparar", href: "/", kind: "ghost" },
          ],
  };
}

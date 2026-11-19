export type RoleKey = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY" | "UNKNOWN";

const ROLE_ALIASES: Record<string, RoleKey> = {
  TOP: "TOP",
  JUNGLE: "JUNGLE",
  MIDDLE: "MIDDLE",
  MID: "MIDDLE",
  BOTTOM: "BOTTOM",
  ADC: "BOTTOM",
  UTILITY: "UTILITY",
  SUPPORT: "UTILITY",
  NONE: "UNKNOWN",
  INVALID: "UNKNOWN",
  "": "UNKNOWN",
};

export function normalizeRole(
  teamPosition?: string,
  individualPosition?: string,
): RoleKey {
  const raw = (teamPosition || individualPosition || "").toUpperCase();
  return ROLE_ALIASES[raw] ?? "UNKNOWN";
}

export const ROLE_LABELS: Record<RoleKey, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "ADC",
  UTILITY: "Suporte",
  UNKNOWN: "Indefinido",
};

import type { MatchParticipant, ParticipantPerks } from "@/lib/riot/types";

export type ExtractedRunes = {
  primaryStyle: number | null;
  subStyle: number | null;
  keystone: number | null;
  /** Keystone + 3 slots da árvore principal */
  primaryPerkIds: number[];
  /** 2 runas da árvore secundária */
  subPerkIds: number[];
  /** Stat shards: offense, flex, defense */
  statPerkIds: number[];
  /** Ordem de exibição: primary perks + sub perks */
  perkIds: number[];
  runeFingerprint: string | null;
};

export type ParsedRunePage = {
  primaryStyle: number;
  subStyle: number;
  keystone: number;
  primaryPerkIds: number[];
  subPerkIds: number[];
  statPerkIds: number[];
  perkIds: number[];
};

function styleByDescription(
  perks: ParticipantPerks,
  description: string,
): { style: number; perkIds: number[] } | null {
  const style = perks.styles.find(
    (s) => s.description.toLowerCase() === description.toLowerCase(),
  );
  if (!style) return null;
  return {
    style: style.style,
    perkIds: style.selections.map((s) => s.perk).filter((id) => id > 0),
  };
}

export function extractRunes(
  perks: ParticipantPerks | undefined | null,
): ExtractedRunes {
  if (!perks?.styles?.length) {
    return {
      primaryStyle: null,
      subStyle: null,
      keystone: null,
      primaryPerkIds: [],
      subPerkIds: [],
      statPerkIds: [],
      perkIds: [],
      runeFingerprint: null,
    };
  }

  const primary =
    styleByDescription(perks, "primaryStyle") ??
    (perks.styles[0]
      ? {
          style: perks.styles[0].style,
          perkIds: perks.styles[0].selections
            .map((s) => s.perk)
            .filter((id) => id > 0),
        }
      : null);

  const sub =
    styleByDescription(perks, "subStyle") ??
    (perks.styles[1]
      ? {
          style: perks.styles[1].style,
          perkIds: perks.styles[1].selections
            .map((s) => s.perk)
            .filter((id) => id > 0),
        }
      : null);

  const primaryStyle = primary?.style ?? null;
  const subStyle = sub?.style ?? null;
  const primaryPerkIds = primary?.perkIds ?? [];
  const subPerkIds = sub?.perkIds ?? [];
  const keystone = primaryPerkIds[0] ?? null;
  const statPerkIds = [
    perks.statPerks?.offense,
    perks.statPerks?.flex,
    perks.statPerks?.defense,
  ].filter((n): n is number => typeof n === "number" && n > 0);

  const perkIds = [...primaryPerkIds, ...subPerkIds];

  return {
    primaryStyle,
    subStyle,
    keystone,
    primaryPerkIds,
    subPerkIds,
    statPerkIds,
    perkIds,
    runeFingerprint: buildRuneFingerprint({
      primaryStyle,
      subStyle,
      primaryPerkIds,
      subPerkIds,
      statPerkIds,
    }),
  };
}

export function extractRunesFromParticipant(
  participant: MatchParticipant,
): ExtractedRunes {
  return extractRunes(participant.perks);
}

/**
 * Fingerprint da página completa:
 * `8000:8005-9111-9104-8014|8100:8135-8139|5005-5008-5002`
 * Secundárias ordenadas para não gerar “duplicatas” por ordem da Riot.
 */
export function buildRuneFingerprint(input: {
  primaryStyle: number | null;
  subStyle: number | null;
  primaryPerkIds: number[];
  subPerkIds: number[];
  statPerkIds?: number[];
}): string | null {
  const { primaryStyle, subStyle, primaryPerkIds, subPerkIds } = input;
  if (
    primaryStyle == null ||
    subStyle == null ||
    primaryPerkIds.length === 0 ||
    subPerkIds.length === 0
  ) {
    return null;
  }
  const primary = `${primaryStyle}:${primaryPerkIds.join("-")}`;
  const secondarySorted = [...subPerkIds].sort((a, b) => a - b);
  const secondary = `${subStyle}:${secondarySorted.join("-")}`;
  const stats =
    input.statPerkIds && input.statPerkIds.length > 0
      ? `|${input.statPerkIds.join("-")}`
      : "";
  return `${primary}|${secondary}${stats}`;
}

/**
 * Página “visual” (árvores + perks), sem shards de stats.
 * Usado para fundir entradas que parecem iguais na UI.
 */
export function coreRuneFingerprint(fp: string | null | undefined): string | null {
  if (!fp) return null;
  if (!fp.includes(":")) return fp;
  const parts = fp.split("|");
  if (parts.length < 2) return fp;
  const [primaryPart, subPart] = parts;
  if (!primaryPart || !subPart) return fp;
  const [subStyleRaw, subPerksRaw = ""] = subPart.split(":");
  const subSorted = subPerksRaw
    .split("-")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b)
    .join("-");
  return `${primaryPart}|${subStyleRaw}:${subSorted}`;
}

export function parseRuneFingerprint(
  fp: string | null | undefined,
): ParsedRunePage | null {
  if (!fp) return null;

  // Novo formato: style:perk-perk|style:perk-perk|stats?
  if (fp.includes(":")) {
    const [primaryPart, subPart, statsPart] = fp.split("|");
    if (!primaryPart || !subPart) return null;

    const [primaryStyleRaw, primaryPerksRaw] = primaryPart.split(":");
    const [subStyleRaw, subPerksRaw] = subPart.split(":");
    const primaryStyle = Number(primaryStyleRaw);
    const subStyle = Number(subStyleRaw);
    const primaryPerkIds = (primaryPerksRaw ?? "")
      .split("-")
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0);
    const subPerkIds = (subPerksRaw ?? "")
      .split("-")
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    const statPerkIds = (statsPart ?? "")
      .split("-")
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0);

    if (
      !Number.isFinite(primaryStyle) ||
      !Number.isFinite(subStyle) ||
      primaryPerkIds.length === 0
    ) {
      return null;
    }

    return {
      primaryStyle,
      subStyle,
      keystone: primaryPerkIds[0],
      primaryPerkIds,
      subPerkIds,
      statPerkIds,
      perkIds: [...primaryPerkIds, ...subPerkIds],
    };
  }

  // Formato legado: primary-keystone-sub
  const parts = fp.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n <= 0)) {
    return null;
  }
  return {
    primaryStyle: parts[0],
    keystone: parts[1],
    subStyle: parts[2],
    primaryPerkIds: [parts[1]],
    subPerkIds: [],
    statPerkIds: [],
    perkIds: [parts[1]],
  };
}

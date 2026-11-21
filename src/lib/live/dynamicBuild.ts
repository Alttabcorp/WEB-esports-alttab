import { wilsonLowerBound, winRate } from "@/lib/stats/wilson";

export type BuildCandidate = {
  items: number[];
  games: number;
  wins: number;
  wr?: number;
  source: "saved" | "vs-laner" | "vs-comp" | "personal";
  label: string;
  /** Build salva: id opcional para debug. */
  savedId?: string;
  /** Build salva contra um campeão específico. */
  enemyChampionId?: number | null;
  isDefault?: boolean;
};

export type DynamicBuildPick = {
  items: number[];
  nextItemId: number | null;
  nextIndex: number;
  source: BuildCandidate["source"];
  label: string;
  wr: number;
  games: number;
  reason: string;
  /** Quantos itens do inventário batem com esta build. */
  ownedOverlap: number;
};

function ownedSet(ownedIds: Iterable<number>): Set<number> {
  return new Set([...ownedIds].filter((id) => id > 0));
}

/** Itens já comprados que aparecem nesta build (ordem irrelevante). */
export function countOwnedOverlap(
  items: number[],
  owned: Set<number>,
): number {
  let n = 0;
  for (const id of items) {
    if (owned.has(id)) n += 1;
  }
  return n;
}

/** Próximo item da ordem da build ainda não no inventário. */
export function nextMissingItem(
  items: number[],
  owned: Set<number>,
): { id: number; index: number } | null {
  const idx = items.findIndex((id) => id > 0 && !owned.has(id));
  if (idx < 0) return null;
  return { id: items[idx], index: idx };
}

function scoreCandidate(
  c: BuildCandidate,
  owned: Set<number>,
  enemyLanerId: number | null,
): { score: number; overlap: number; next: { id: number; index: number } | null } {
  const overlap = countOwnedOverlap(c.items, owned);
  const next = nextMissingItem(c.items, owned);
  const wr = c.wr ?? winRate(c.wins, c.games);
  const wilson = wilsonLowerBound(c.wins, c.games);
  const progressBoost = owned.size > 0 ? overlap * 0.05 : 0;
  const completePenalty = next ? 0 : -0.02;

  if (c.source === "saved") {
    const vsMatch =
      c.enemyChampionId != null &&
      enemyLanerId != null &&
      c.enemyChampionId === enemyLanerId
        ? 0.25
        : 0;
    const vsMismatch =
      c.enemyChampionId != null &&
      enemyLanerId != null &&
      c.enemyChampionId !== enemyLanerId
        ? -0.35
        : 0;
    const defaultBoost = c.isDefault ? 0.08 : 0;
    // Base alta: builds cadastradas vencem histórico (salvo mismatch vs laner).
    return {
      score:
        0.78 +
        vsMatch +
        vsMismatch +
        defaultBoost +
        progressBoost +
        completePenalty,
      overlap,
      next,
    };
  }

  const sourceBoost =
    c.source === "vs-laner" ? 0.08 : c.source === "vs-comp" ? 0.04 : 0;
  const score =
    wilson +
    sourceBoost +
    progressBoost +
    Math.min(c.games, 12) * 0.004 +
    completePenalty +
    wr * 0.02;
  return { score, overlap, next };
}

/**
 * Escolhe a build ativa no momento: builds salvas > laner/comp > pessoal,
 * batendo inventário e devolvendo o próximo item dinâmico.
 */
export function resolveDynamicBuild(input: {
  ownedIds: Iterable<number>;
  personal: BuildCandidate | null;
  vsLaner: BuildCandidate | null;
  vsComp: BuildCandidate | null;
  saved?: BuildCandidate[];
  enemyLanerId?: number | null;
}): DynamicBuildPick | null {
  const owned = ownedSet(input.ownedIds);
  const enemyLanerId = input.enemyLanerId ?? null;
  const candidates = [
    ...(input.saved ?? []),
    input.vsLaner,
    input.vsComp,
    input.personal,
  ].filter(
    (c): c is BuildCandidate => Boolean(c && c.items.length > 0),
  );
  // Histórico precisa de games; salvas não.
  const usable = candidates.filter(
    (c) => c.source === "saved" || c.games > 0,
  );
  if (usable.length === 0) return null;

  let best: {
    c: BuildCandidate;
    score: number;
    overlap: number;
    next: { id: number; index: number } | null;
  } | null = null;

  for (const c of usable) {
    const scored = scoreCandidate(c, owned, enemyLanerId);
    if (!best || scored.score > best.score) {
      best = { c, ...scored };
    }
  }
  if (!best) return null;

  const wr = best.c.wr ?? winRate(best.c.wins, best.c.games);
  const reasonParts: string[] = [];
  if (best.c.source === "saved") {
    reasonParts.push("build cadastrada");
    if (
      best.c.enemyChampionId != null &&
      enemyLanerId != null &&
      best.c.enemyChampionId === enemyLanerId
    ) {
      reasonParts.push("contra este laner");
    } else if (best.c.isDefault) {
      reasonParts.push("padrão do campeão");
    }
  } else if (best.c.source === "vs-laner") {
    reasonParts.push("melhor WR vs este laner no seu histórico");
  } else if (best.c.source === "vs-comp") {
    reasonParts.push("build com overlap desta composição");
  } else {
    reasonParts.push("sua build mais estável neste champ");
  }
  if (best.overlap > 0) {
    reasonParts.push(`${best.overlap} item(ns) já no inventário`);
  }

  return {
    items: best.c.items,
    nextItemId: best.next?.id ?? null,
    nextIndex: best.next?.index ?? best.c.items.length,
    source: best.c.source,
    label: best.c.label,
    wr: best.c.source === "saved" ? wr || 1 : wr,
    games: best.c.source === "saved" ? best.c.games || 0 : best.c.games,
    reason: reasonParts.join(" · "),
    ownedOverlap: best.overlap,
  };
}

export function toBuildCandidate(
  tip: {
    items: number[];
    games: number;
    wins: number;
    wr?: number;
  } | null,
  source: Exclude<BuildCandidate["source"], "saved">,
  label: string,
): BuildCandidate | null {
  if (!tip || tip.items.length === 0 || tip.games <= 0) return null;
  return {
    items: tip.items,
    games: tip.games,
    wins: tip.wins,
    wr: tip.wr,
    source,
    label,
  };
}

export function savedBuildToCandidate(input: {
  id: string;
  name: string;
  items: number[];
  enemyChampionId?: number | null;
  isDefault?: boolean;
}): BuildCandidate | null {
  if (!input.items.length) return null;
  return {
    items: input.items,
    games: 0,
    wins: 0,
    wr: 1,
    source: "saved",
    label: input.name,
    savedId: input.id,
    enemyChampionId: input.enemyChampionId ?? null,
    isDefault: Boolean(input.isDefault),
  };
}

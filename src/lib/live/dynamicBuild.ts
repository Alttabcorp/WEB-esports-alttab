import { wilsonLowerBound, winRate } from "@/lib/stats/wilson";

export type BuildCandidate = {
  items: number[];
  games: number;
  wins: number;
  wr?: number;
  source: "vs-laner" | "vs-comp" | "personal";
  label: string;
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
): { score: number; overlap: number; next: { id: number; index: number } | null } {
  const overlap = countOwnedOverlap(c.items, owned);
  const next = nextMissingItem(c.items, owned);
  const wr = c.wr ?? winRate(c.wins, c.games);
  const wilson = wilsonLowerBound(c.wins, c.games);
  // Prioriza builds que já “casam” com o inventário atual + WR estável.
  const sourceBoost =
    c.source === "vs-laner" ? 0.08 : c.source === "vs-comp" ? 0.04 : 0;
  const progressBoost = owned.size > 0 ? overlap * 0.05 : 0;
  const completePenalty = next ? 0 : -0.02;
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
 * Escolhe a build ativa no momento: bate inventário + contexto (laner/comp)
 * e devolve o próximo item dinâmico.
 */
export function resolveDynamicBuild(input: {
  ownedIds: Iterable<number>;
  personal: BuildCandidate | null;
  vsLaner: BuildCandidate | null;
  vsComp: BuildCandidate | null;
}): DynamicBuildPick | null {
  const owned = ownedSet(input.ownedIds);
  const candidates = [input.vsLaner, input.vsComp, input.personal].filter(
    (c): c is BuildCandidate => Boolean(c && c.items.length > 0 && c.games > 0),
  );
  if (candidates.length === 0) return null;

  let best: {
    c: BuildCandidate;
    score: number;
    overlap: number;
    next: { id: number; index: number } | null;
  } | null = null;

  for (const c of candidates) {
    const scored = scoreCandidate(c, owned);
    if (!best || scored.score > best.score) {
      best = { c, ...scored };
    }
  }
  if (!best) return null;

  const wr = best.c.wr ?? winRate(best.c.wins, best.c.games);
  const reasonParts: string[] = [];
  if (best.c.source === "vs-laner") {
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
    wr,
    games: best.c.games,
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
  source: BuildCandidate["source"],
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

/**
 * Reordena (nunca inventa) próximos itens da build salva com base
 * nas tags Data Dragon do inventário inimigo.
 */

export type ItemTagLite = {
  id: number;
  tags: string[];
};

/** IDs conhecidos de Grievous Wounds (antiheal) — só promovidos se já estão na build. */
export const ANTIHEAL_ITEM_IDS = new Set([
  3123, // Executioner's Calling
  3033, // Mortal Reminder
  6609, // Chempunk Chainsword
  3165, // Morellonomicon
  3076, // Bramble Vest
  3075, // Thornmail
  6694, // Serylda's Grudge (não é antiheal; não incluir)
]);

// Serylda não é antiheal — remove se acidentalmente incluído
ANTIHEAL_ITEM_IDS.delete(6694);

const HEAL_TAGS = new Set([
  "LifeSteal",
  "SpellVamp",
  "HealthRegen",
  "ManaRegen",
]);

const ARMOR_TAGS = new Set(["Armor"]);
const MR_TAGS = new Set(["SpellBlock"]);
const ARMOR_PEN_TAGS = new Set(["ArmorPenetration"]);
const MAGIC_PEN_TAGS = new Set(["MagicPenetration"]);

function catalogMap(
  catalog: Iterable<ItemTagLite>,
): Map<number, ItemTagLite> {
  const m = new Map<number, ItemTagLite>();
  for (const e of catalog) m.set(e.id, e);
  return m;
}

function collectTags(
  itemIds: Iterable<number>,
  byId: Map<number, ItemTagLite>,
): Set<string> {
  const tags = new Set<string>();
  for (const id of itemIds) {
    if (id <= 0) continue;
    const entry = byId.get(id);
    if (!entry) continue;
    for (const t of entry.tags) tags.add(t);
  }
  return tags;
}

function priorityBoost(
  itemId: number,
  enemyTags: Set<string>,
  byId: Map<number, ItemTagLite>,
): number {
  let boost = 0;
  const item = byId.get(itemId);
  const itemTags = new Set(item?.tags ?? []);

  const enemyStackedArmor = [...enemyTags].some((t) => ARMOR_TAGS.has(t));
  const enemyStackedMr = [...enemyTags].some((t) => MR_TAGS.has(t));
  const enemyHeals = [...enemyTags].some((t) => HEAL_TAGS.has(t));

  if (enemyStackedArmor) {
    if ([...itemTags].some((t) => ARMOR_PEN_TAGS.has(t))) boost += 3;
  }
  if (enemyStackedMr) {
    if ([...itemTags].some((t) => MAGIC_PEN_TAGS.has(t))) boost += 3;
  }
  if (enemyHeals && ANTIHEAL_ITEM_IDS.has(itemId)) {
    boost += 4;
  }
  return boost;
}

/**
 * Mantém itens já comprados na posição relativa; reordena só o sufixo
 * ainda não adquirido, priorizando pen/antiheal quando o inventário
 * inimigo pede — sem adicionar IDs novos.
 */
export function adaptBuildOrder(input: {
  buildItems: number[];
  ownedIds: Iterable<number>;
  enemyItemIds: Iterable<number>;
  catalog: Iterable<ItemTagLite>;
}): { items: number[]; adapted: boolean; reason: string | null } {
  const items = input.buildItems.filter((id) => id > 0);
  if (items.length === 0) {
    return { items: [], adapted: false, reason: null };
  }

  const owned = new Set(
    [...input.ownedIds].filter((id) => id > 0),
  );
  const byId = catalogMap(input.catalog);
  const enemyTags = collectTags(input.enemyItemIds, byId);
  if (enemyTags.size === 0) {
    return { items: [...items], adapted: false, reason: null };
  }

  const kept: number[] = [];
  const remaining: number[] = [];
  for (const id of items) {
    if (owned.has(id)) kept.push(id);
    else remaining.push(id);
  }
  if (remaining.length <= 1) {
    return { items: [...items], adapted: false, reason: null };
  }

  const scored = remaining.map((id, idx) => ({
    id,
    idx,
    boost: priorityBoost(id, enemyTags, byId),
  }));
  const anyBoost = scored.some((s) => s.boost > 0);
  if (!anyBoost) {
    return { items: [...items], adapted: false, reason: null };
  }

  scored.sort((a, b) => {
    if (b.boost !== a.boost) return b.boost - a.boost;
    return a.idx - b.idx;
  });

  const next = [...kept, ...scored.map((s) => s.id)];
  const changed = next.some((id, i) => id !== items[i]);
  if (!changed) {
    return { items: [...items], adapted: false, reason: null };
  }

  const reasons: string[] = [];
  if ([...enemyTags].some((t) => ARMOR_TAGS.has(t))) {
    reasons.push("pen vs armadura");
  }
  if ([...enemyTags].some((t) => MR_TAGS.has(t))) {
    reasons.push("pen vs MR");
  }
  if ([...enemyTags].some((t) => HEAL_TAGS.has(t))) {
    reasons.push("antiheal vs cura");
  }

  return {
    items: next,
    adapted: true,
    reason: reasons.length ? reasons.join(" · ") : "reordenado vs itens inimigos",
  };
}

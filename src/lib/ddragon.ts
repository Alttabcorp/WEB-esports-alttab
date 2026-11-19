const FALLBACK_VERSION = "15.19.1";

let cachedVersion: string | null = null;

export async function getDdragonVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  try {
    const res = await fetch("https://ddragon.leagueoflegends.com/api/versions.json", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return FALLBACK_VERSION;
    const versions = (await res.json()) as string[];
    cachedVersion = versions[0] ?? FALLBACK_VERSION;
    return cachedVersion;
  } catch {
    return FALLBACK_VERSION;
  }
}

export function championIconUrl(version: string, championName: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`;
}

export function itemIconUrl(version: string, itemId: number): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
}

export function profileIconUrl(version: string, iconId: number): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`;
}

export type ChampionCatalogEntry = {
  id: number;
  key: string;
  name: string;
};

/** Map numeric championId → Data Dragon key via community CDN (cdn versioned). */
export async function getChampionIdToKey(
  version: string,
): Promise<Record<number, string>> {
  const catalog = await getChampionCatalog(version);
  const map: Record<number, string> = {};
  for (const champ of catalog) {
    map[champ.id] = champ.key;
  }
  return map;
}

export async function getChampionCatalog(
  version: string,
): Promise<ChampionCatalogEntry[]> {
  const res = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    data: Record<string, { key: string; id: string; name: string }>;
  };
  return Object.values(json.data)
    .map((champ) => ({
      id: Number(champ.key),
      key: champ.id,
      name: champ.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function runeStyleLabel(styleId: number): string {
  const labels: Record<number, string> = {
    8000: "Precision",
    8100: "Domination",
    8200: "Sorcery",
    8300: "Inspiration",
    8400: "Resolve",
  };
  return labels[styleId] ?? `Style ${styleId}`;
}

/** Data Dragon rune icons live under /cdn/img/ (not versioned like champion icons). */
export function runeIconUrl(iconPath: string): string {
  const cleaned = iconPath.replace(/^\//, "");
  return `https://ddragon.leagueoflegends.com/cdn/img/${cleaned}`;
}

export type RuneMeta = {
  id: number;
  key: string;
  name: string;
  icon: string;
  styleId: number;
  styleName: string;
  isKeystone: boolean;
};

export type RuneCatalog = {
  byId: Record<number, RuneMeta>;
  styles: Record<number, { id: number; name: string; icon: string }>;
};

type RunesReforgedJson = Array<{
  id: number;
  key: string;
  icon: string;
  name: string;
  slots: Array<{ runes: Array<{ id: number; key: string; icon: string; name: string }> }>;
}>;

export type SpellMeta = {
  id: number;
  key: string;
  name: string;
  image: string;
};

export type SpellCatalog = Record<number, SpellMeta>;

let cachedRuneCatalog: RuneCatalog | null = null;
let cachedSpellCatalog: SpellCatalog | null = null;

export function spellIconUrl(version: string, imageFile: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${imageFile}`;
}

export async function getSpellCatalog(version: string): Promise<SpellCatalog> {
  if (cachedSpellCatalog) return cachedSpellCatalog;
  const res = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/summoner.json`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) return {};
  const json = (await res.json()) as {
    data: Record<
      string,
      { key: string; id: string; name: string; image: { full: string } }
    >;
  };
  const map: SpellCatalog = {};
  for (const spell of Object.values(json.data)) {
    map[Number(spell.key)] = {
      id: Number(spell.key),
      key: spell.id,
      name: spell.name,
      image: spell.image.full,
    };
  }
  cachedSpellCatalog = map;
  return map;
}

export async function getRuneCatalog(version: string): Promise<RuneCatalog> {
  if (cachedRuneCatalog) return cachedRuneCatalog;

  const res = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) {
    return { byId: {}, styles: {} };
  }

  const json = (await res.json()) as RunesReforgedJson;
  const byId: Record<number, RuneMeta> = {};
  const styles: RuneCatalog["styles"] = {};

  for (const tree of json) {
    styles[tree.id] = { id: tree.id, name: tree.name, icon: tree.icon };
    tree.slots.forEach((slot, slotIndex) => {
      for (const rune of slot.runes) {
        byId[rune.id] = {
          id: rune.id,
          key: rune.key,
          name: rune.name,
          icon: rune.icon,
          styleId: tree.id,
          styleName: tree.name,
          isKeystone: slotIndex === 0,
        };
      }
    });
  }

  cachedRuneCatalog = { byId, styles };
  return cachedRuneCatalog;
}

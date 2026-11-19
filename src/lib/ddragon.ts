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

/** Map numeric championId → Data Dragon key via community CDN (cdn versioned). */
export async function getChampionIdToKey(
  version: string,
): Promise<Record<number, string>> {
  const res = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) return {};
  const json = (await res.json()) as {
    data: Record<string, { key: string; id: string }>;
  };
  const map: Record<number, string> = {};
  for (const champ of Object.values(json.data)) {
    map[Number(champ.key)] = champ.id;
  }
  return map;
}

import { MatchCoachScreen } from "@/components/MatchCoachScreen";
import { Button } from "@/components/ui";
import {
  getChampionCatalog,
  getChampionIdToKey,
  getDdragonVersion,
  getItemCatalog,
  getRuneCatalog,
} from "@/lib/ddragon";
import { encodeRiotId } from "@/lib/format";
import { getAppProfile } from "@/lib/db/persist";
import type { RoleKey } from "@/lib/stats/roles";

export default async function CoachPage() {
  const profile = await getAppProfile();

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10">
        <p className="data-label">League Persua</p>
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">Coach</h1>
        <p className="text-sm text-[var(--muted)]">
          Salve o perfil primeiro para abrir o coach do 2º monitor.
        </p>
        <Button href="/config">Ir para configuração</Button>
      </div>
    );
  }

  const ddragonVersion = await getDdragonVersion();
  const [idToKey, catalog, runeCatalog, itemCatalog] = await Promise.all([
    getChampionIdToKey(ddragonVersion),
    getChampionCatalog(ddragonVersion),
    getRuneCatalog(ddragonVersion),
    getItemCatalog(ddragonVersion),
  ]);

  const keyToId: Record<string, number> = {};
  for (const c of catalog) {
    keyToId[c.key] = c.id;
  }

  const slug = encodeRiotId(profile.gameName, profile.tagLine);
  const qs = `queue=${profile.queue}&count=${profile.matchCount}`;
  const prepHref = "/";
  const timingHref = "/quando";
  const draftHref = `/summoner/${profile.platform}/${slug}/draft?${qs}`;
  const preferredRole = (profile.preferredRole as RoleKey) || "MIDDLE";

  return (
    <MatchCoachScreen
      platform={profile.platform}
      puuid={profile.puuid}
      riotId={`${profile.gameName}#${profile.tagLine}`}
      queue={profile.queue}
      matchCount={profile.matchCount}
      preferredRole={preferredRole === "UNKNOWN" ? "MIDDLE" : preferredRole}
      ddragonVersion={ddragonVersion}
      idToKey={idToKey}
      keyToId={keyToId}
      runeCatalog={runeCatalog}
      itemCatalog={itemCatalog}
      draftHref={draftHref}
      prepHref={prepHref}
      timingHref={timingHref}
    />
  );
}

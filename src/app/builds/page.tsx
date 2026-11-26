import Link from "next/link";
import { SavedBuildsManager } from "@/components/SavedBuildsManager";
import { PrepGate } from "@/components/PrepGate";
import {
  getChampionCatalog,
  getDdragonVersion,
  getItemCatalog,
} from "@/lib/ddragon";
import { getAppProfile, listSavedBuilds } from "@/lib/db/persist";

export default async function BuildsPage() {
  const profile = await getAppProfile();
  if (!profile) {
    return (
      <PrepGate
        title="Salve seu perfil"
        detail="Configure o invocador em Config para cadastrar builds."
        configOnly
      />
    );
  }

  const ddragonVersion = await getDdragonVersion();
  const [champions, items, builds] = await Promise.all([
    getChampionCatalog(ddragonVersion),
    getItemCatalog(ddragonVersion),
    listSavedBuilds(),
  ]);

  const idToKey: Record<number, string> = {};
  for (const c of champions) idToKey[c.id] = c.key;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 py-4 sm:py-8">
      <div>
        <Link
          href="/"
          className="text-sm text-[var(--alttab-soft)] hover:underline"
        >
          ← Hoje
        </Link>
        <h1 className="mt-3 type-display text-3xl text-[var(--foreground)]">
          Builds
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Cadastre várias builds por campeão. O{" "}
          <Link href="/coach" className="text-[var(--alttab)] hover:underline">
            Coach
          </Link>{" "}
          prioriza essas builds no próximo item (e a versão “vs laner” quando
          bater o matchup). Sem partidas syncadas, o contexto vs laner/comp fica
          vazio — sincronize em{" "}
          <Link href="/config" className="text-[var(--alttab)] hover:underline">
            Config
          </Link>
          .
        </p>
      </div>

      {builds.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted-strong)]">
          Nenhuma build salva ainda. Cadastre a ordem de itens do seu pool — o
          Coach usa no in-game, inclusive contra o laner quando você marcar o
          inimigo.
        </p>
      ) : null}

      <SavedBuildsManager
        initialBuilds={builds}
        champions={champions}
        items={items}
        ddragonVersion={ddragonVersion}
        idToKey={idToKey}
      />
    </div>
  );
}

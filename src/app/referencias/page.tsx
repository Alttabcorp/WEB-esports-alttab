import Link from "next/link";
import { ReferencePlayersForm } from "@/components/ReferencePlayersForm";
import { Button, Panel } from "@/components/ui";
import { getAppProfile, listReferencePlayers } from "@/lib/db/persist";
import { getDdragonVersion } from "@/lib/ddragon";
import type { PlatformRegion } from "@/lib/riot/regions";

export default async function ReferenciasPage() {
  const [profile, references, ddragonVersion] = await Promise.all([
    getAppProfile(),
    listReferencePlayers(),
    getDdragonVersion(),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-4 sm:py-8">
      <div>
        <Link
          href="/"
          className="text-sm text-[var(--alttab-soft)] hover:underline"
        >
          ← Início
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">
          Jogadores de referência
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Cadastre monos e mains. No coach, compare builds e runas deles com as
          suas no campeão selecionado.
        </p>
      </div>

      {profile ? (
        <ReferencePlayersForm
          initial={references}
          ddragonVersion={ddragonVersion}
          defaultRegion={profile.platform as PlatformRegion}
        />
      ) : (
        <Panel className="space-y-4 p-5">
          <p className="text-sm text-[var(--muted-strong)]">
            Salve seu perfil primeiro para adicionar jogadores de referência.
          </p>
          <Button href="/config">Ir para configuração</Button>
        </Panel>
      )}
    </div>
  );
}

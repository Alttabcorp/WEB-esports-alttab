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
        <h1 className="mt-3 type-display text-3xl text-[var(--foreground)]">
          Jogadores de referência
        </h1>
        <p className="mt-2 type-body text-sm">
          Cadastre monos e mains para comparar builds. Isso{" "}
          <strong className="font-semibold text-[var(--foreground)]">
            não altera
          </strong>{" "}
          seu WR, PDL, horários nem o Coach — os dados ficam no player deles,
          separados do seu perfil.
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          No Preparar → campeão → aba Comparar você vê você | referências |
          meta (amostra anônima do ladder).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="/config" variant="secondary" size="sm">
            Config / bridge
          </Button>
          <Button href="/coach" variant="ghost" size="sm">
            Coach
          </Button>
        </div>
      </div>

      {profile ? (
        <Panel className="p-5">
          <ReferencePlayersForm
            initial={references}
            ddragonVersion={ddragonVersion}
            defaultRegion={profile.platform as PlatformRegion}
          />
        </Panel>
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

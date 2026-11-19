import Link from "next/link";
import { ProfileHub } from "@/components/ProfileHub";
import { SearchForm } from "@/components/SearchForm";
import { Button, Panel } from "@/components/ui";
import { getAppProfile } from "@/lib/db/persist";
import { getDdragonVersion } from "@/lib/ddragon";
import type { PlatformRegion } from "@/lib/riot/regions";
import type { QueueFilter } from "@/lib/riot/types";

export default async function HomePage() {
  const [profile, ddragonVersion] = await Promise.all([
    getAppProfile(),
    getDdragonVersion(),
  ]);

  return (
    <div className="flex flex-col items-center gap-8 py-4 sm:py-10">
      <div className="max-w-xl text-center">
        <p className="data-label mb-2">ALTTAB Esports</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold leading-tight tracking-wide text-white sm:text-4xl">
          League Persua
        </h1>
        <p className="mt-3 text-base text-[var(--muted-strong)]">
          {profile
            ? "Companion de ranked: prepare o pick, acompanhe builds e itens na partida."
            : "Configure seu perfil uma vez. As partidas ficam neste servidor — histórico sem rebuscar a Riot a cada visita."}
        </p>
      </div>

      {profile ? (
        <ProfileHub profile={profile} ddragonVersion={ddragonVersion} />
      ) : (
        <div className="flex w-full max-w-2xl flex-col items-center gap-4">
          <Button href="/config" size="lg" className="w-full">
            Configurar meu perfil
          </Button>
          <Panel className="w-full p-4">
            <details>
              <summary className="cursor-pointer text-sm text-[var(--muted)] hover:text-white">
                Ou analisar um invocador sem salvar
              </summary>
              <div className="mt-4">
                <SearchForm />
              </div>
            </details>
          </Panel>
        </div>
      )}

      {profile ? (
        <Panel className="w-full max-w-2xl p-4">
          <details>
            <summary className="cursor-pointer text-sm text-[var(--muted)] hover:text-white">
              Analisar outro invocador
            </summary>
            <div className="mt-4">
              <SearchForm
                defaultRegion={profile.platform as PlatformRegion}
                defaultQueue={profile.queue as QueueFilter}
              />
            </div>
          </details>
        </Panel>
      ) : null}

      {!profile ? (
        <p className="text-center text-xs text-[var(--muted)]">
          Já tem perfil?{" "}
          <Link href="/config" className="text-[var(--alttab-soft)] hover:underline">
            Abrir configuração
          </Link>
        </p>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { BridgeSetupPanel } from "@/components/BridgeSetupPanel";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import { Button } from "@/components/ui";
import { getAppProfile } from "@/lib/db/persist";

export default async function ConfigPage() {
  const profile = await getAppProfile();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-4 sm:py-8">
      <div>
        <Link
          href="/"
          className="text-sm text-[var(--alttab-soft)] hover:underline"
        >
          ← Início
        </Link>
        <h1 className="mt-3 type-display text-3xl text-[var(--foreground)]">Configuração</h1>
        <p className="mt-2 type-body text-sm">
          Perfil, sync Riot e bridge automático do PC de jogo.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="/coach" size="sm">
            Abrir Coach
          </Button>
          <Button href="/builds" variant="secondary" size="sm">
            Builds
          </Button>
          <Button href="/" variant="ghost" size="sm">
            Hub
          </Button>
        </div>
      </div>

      <section className="space-y-3" aria-labelledby="cfg-bridge">
        <div>
          <h2 id="cfg-bridge" className="type-title">
            Bridge do PC de jogo
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Três passos: Node → bootstrap → Coach no 2º monitor.
          </p>
        </div>
        <BridgeSetupPanel />
      </section>

      <section className="space-y-3" aria-labelledby="cfg-profile">
        <div>
          <h2 id="cfg-profile" className="type-title">
            Perfil e sync
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Defina invocador, fila e tamanho da amostra. Sincronize para gravar
            partidas no banco.
          </p>
        </div>
        <ProfileSettingsForm initial={profile} />
      </section>
    </div>
  );
}

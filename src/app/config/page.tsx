import Link from "next/link";
import { BridgeSetupPanel } from "@/components/BridgeSetupPanel";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
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
        <h1 className="mt-3 text-3xl font-bold text-white">Configuração</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Perfil, sincronização e bridge do PC de jogo.
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Jogadores de referência ficam em{" "}
          <Link
            href="/referencias"
            className="text-[var(--alttab-soft)] hover:underline"
          >
            Referências
          </Link>
          .
        </p>
      </div>

      <section className="space-y-3" aria-labelledby="cfg-profile">
        <div>
          <h2 id="cfg-profile" className="text-lg font-semibold text-white">
            Perfil e sync
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Defina invocador, fila e tamanho da amostra. Sincronize para gravar
            partidas no banco.
          </p>
        </div>
        <ProfileSettingsForm initial={profile} />
      </section>

      <section className="space-y-3" aria-labelledby="cfg-bridge">
        <div>
          <h2 id="cfg-bridge" className="text-lg font-semibold text-white">
            Bridge (Em partida)
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Conecta o cliente LoL no PC de jogo ao companion — builds e itens ao
            vivo.
          </p>
        </div>
        <BridgeSetupPanel />
      </section>
    </div>
  );
}

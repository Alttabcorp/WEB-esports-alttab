import Image from "next/image";
import type { AppProfileView } from "@/lib/db/persist";
import { encodeRiotId } from "@/lib/format";
import { profileIconUrl } from "@/lib/ddragon";
import { ROLE_LABELS, type RoleKey } from "@/lib/stats/roles";
import { ClearProfileButton } from "./ClearProfileButton";
import { Button, Panel } from "@/components/ui";

type Props = {
  profile: AppProfileView;
  ddragonVersion: string;
};

export function ProfileHub({ profile, ddragonVersion }: Props) {
  const slug = encodeRiotId(profile.gameName, profile.tagLine);
  const base = `/summoner/${profile.platform}/${slug}`;
  const qs = `queue=${profile.queue}&count=${profile.matchCount}`;
  const role = profile.preferredRole as RoleKey;
  const syncLabel = profile.lastSyncedAt
    ? `Último sync ${new Date(profile.lastSyncedAt).toLocaleString("pt-BR")}`
    : "Ainda sem sincronização Riot";

  return (
    <Panel strong className="w-full max-w-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Image
          src={profileIconUrl(ddragonVersion, profile.profileIconId ?? 29)}
          alt={profile.gameName}
          width={72}
          height={72}
          className="rounded-xl ring-1 ring-[var(--border-strong)]"
        />
        <div className="min-w-0 flex-1">
          <p className="data-label mb-1">Perfil ativo</p>
          <h2 className="truncate text-2xl font-bold text-white">
            {profile.gameName}
            <span className="text-[var(--alttab-soft)]">#{profile.tagLine}</span>
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {profile.platform.toUpperCase()} ·{" "}
            {ROLE_LABELS[role] ?? profile.preferredRole} · meta de{" "}
            {profile.matchCount} partidas
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2.5 text-sm text-[var(--muted-strong)]">
        <p>
          <span className="tabular font-semibold text-white">
            {profile.storedMatchCount}
          </span>{" "}
          partidas no banco · {syncLabel}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          O coach lê o banco local. Riot só entra na sincronização.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button href={`${base}?${qs}`} size="lg" className="flex-1">
          Abrir coach
        </Button>
        <Button
          href={`${base}/draft?${qs}`}
          variant="secondary"
          size="lg"
          className="flex-1"
        >
          Abrir seleção
        </Button>
        <Button
          href="/referencias"
          variant="ghost"
          size="lg"
          className="sm:flex-none"
        >
          Referências
        </Button>
        <Button href="/config" variant="ghost" size="lg" className="sm:flex-none">
          Config
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--muted)]">
          Companion de ranked · prepare, selecione, jogue
        </p>
        <ClearProfileButton />
      </div>
    </Panel>
  );
}

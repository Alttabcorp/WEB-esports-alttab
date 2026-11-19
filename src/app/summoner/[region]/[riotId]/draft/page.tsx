import Link from "next/link";
import { DraftCoach } from "@/components/DraftCoach";
import { getAppProfile } from "@/lib/db/persist";
import {
  getChampionCatalog,
  getChampionIdToKey,
  getDdragonVersion,
  getRuneCatalog,
  getSpellCatalog,
} from "@/lib/ddragon";
import { decodeRiotIdParam, encodeRiotId } from "@/lib/format";
import { parseRiotId } from "@/lib/riot/analyze";
import { isPlatformRegion } from "@/lib/riot/regions";
import type { RoleKey } from "@/lib/stats/roles";
import type { QueueFilter } from "@/lib/riot/types";

type PageProps = {
  params: Promise<{ region: string; riotId: string }>;
  searchParams: Promise<{ queue?: string; count?: string }>;
};

export default async function DraftPage({ params, searchParams }: PageProps) {
  const { region, riotId: riotIdParam } = await params;
  const sp = await searchParams;
  const riotIdDecoded = decodeRiotIdParam(riotIdParam);
  const queue = (sp.queue ?? "ranked") as QueueFilter;
  const count = Number(sp.count ?? "50");

  if (!isPlatformRegion(region)) {
    return (
      <ErrorState title="Região inválida" detail={`Região: ${region}`} />
    );
  }

  const parsed = parseRiotId(riotIdDecoded);
  if (!parsed) {
    return (
      <ErrorState title="Riot ID inválido" detail="Use o formato Nome#TAG." />
    );
  }

  const ddragonVersion = await getDdragonVersion();
  const [catalog, idToKey, runeCatalog, spellCatalog, appProfile] =
    await Promise.all([
      getChampionCatalog(ddragonVersion),
      getChampionIdToKey(ddragonVersion),
      getRuneCatalog(ddragonVersion),
      getSpellCatalog(ddragonVersion),
      getAppProfile(),
    ]);

  const riotId = `${parsed.gameName}#${parsed.tagLine}`;
  const backHref = `/summoner/${region}/${encodeRiotId(parsed.gameName, parsed.tagLine)}?queue=${queue}&count=${Number.isFinite(count) ? count : 50}`;
  const liveHref = `${backHref}&mode=live`;
  const defaultRole =
    (appProfile?.preferredRole as RoleKey | undefined) ?? "MIDDLE";

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href={backHref}
              className="text-[var(--alttab-soft)] hover:underline"
            >
              ← Preparar
            </Link>
            <Link
              href={liveHref}
              className="text-[var(--muted)] hover:text-white"
            >
              Em partida
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Seleção
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
            Durante o champ select: marque bans e picks. As recomendações usam
            seu histórico.
          </p>
        </div>
        <p className="rounded-lg border border-[var(--border)] bg-black/25 px-3 py-2 text-sm text-[var(--muted-strong)]">
          {parsed.gameName}
          <span className="text-[var(--alttab-soft)]">#{parsed.tagLine}</span>
          <span className="ml-2 text-[var(--muted)]">
            {region.toUpperCase()}
          </span>
        </p>
      </div>

      <DraftCoach
        region={region}
        riotId={riotId}
        queue={queue}
        count={Number.isFinite(count) ? count : 50}
        ddragonVersion={ddragonVersion}
        catalog={catalog}
        idToKey={idToKey}
        runeCatalog={runeCatalog}
        spellCatalog={spellCatalog}
        defaultRole={defaultRole}
      />
    </div>
  );
}

function ErrorState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-8 text-center">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <p className="mt-3 text-sm text-[var(--muted-strong)]">{detail}</p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-10 items-center rounded-lg bg-[var(--alttab)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--alttab-deep)]"
      >
        Voltar
      </Link>
    </div>
  );
}

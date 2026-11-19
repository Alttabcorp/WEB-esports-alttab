import Link from "next/link";
import { getAppProfile } from "@/lib/db/persist";
import { encodeRiotId } from "@/lib/format";

export async function NavLinks() {
  const profile = await getAppProfile();
  if (!profile) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/config"
          className="inline-flex min-h-9 items-center rounded-lg bg-[var(--alttab)] px-3 py-1.5 font-semibold text-white hover:bg-[var(--alttab-deep)]"
        >
          Configurar
        </Link>
      </div>
    );
  }

  const slug = encodeRiotId(profile.gameName, profile.tagLine);
  const qs = `queue=${profile.queue}&count=${profile.matchCount}`;
  const base = `/summoner/${profile.platform}/${slug}`;

  return (
    <nav
      aria-label="Principal"
      className="flex flex-wrap items-center justify-end gap-1 text-sm sm:gap-2"
    >
      <Link
        href={`${base}?${qs}`}
        className="inline-flex min-h-9 items-center rounded-lg px-2.5 py-1.5 text-[var(--muted-strong)] hover:bg-white/5 hover:text-white"
      >
        Preparar
      </Link>
      <Link
        href={`${base}/draft?${qs}`}
        className="inline-flex min-h-9 items-center rounded-lg px-2.5 py-1.5 text-[var(--muted-strong)] hover:bg-white/5 hover:text-white"
      >
        Seleção
      </Link>
      <Link
        href={`${base}?${qs}&mode=live`}
        className="inline-flex min-h-9 items-center rounded-lg bg-[var(--alttab)]/15 px-2.5 py-1.5 font-medium text-[var(--alttab-soft)] hover:bg-[var(--alttab)]/25"
      >
        Em partida
      </Link>
      <Link
        href="/referencias"
        className="inline-flex min-h-9 items-center rounded-lg px-2.5 py-1.5 text-[var(--muted-strong)] hover:bg-white/5 hover:text-white"
      >
        Referências
      </Link>
      <Link
        href="/config"
        className="inline-flex min-h-9 items-center rounded-lg px-2.5 py-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-white"
      >
        Config
      </Link>
    </nav>
  );
}

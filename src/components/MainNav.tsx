"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  hasProfile: boolean;
};

function linkClass(active: boolean, emphasize = false) {
  if (active) {
    return "inline-flex min-h-9 items-center border-b-2 border-[var(--alttab)] px-2.5 py-1.5 font-medium text-[var(--foreground)]";
  }
  if (emphasize) {
    return "inline-flex min-h-9 items-center rounded-[var(--radius)] bg-[var(--alttab)] px-2.5 py-1.5 font-medium text-white hover:bg-[var(--alttab-deep)]";
  }
  return "inline-flex min-h-9 items-center border-b-2 border-transparent px-2.5 py-1.5 text-[var(--muted-strong)] hover:text-[var(--foreground)]";
}

/** Link que vira texto quando já está ativo — evita soft-nav + loading.tsx. */
function NavItem({
  href,
  active,
  emphasize,
  children,
}: {
  href: string;
  active: boolean;
  emphasize?: boolean;
  children: React.ReactNode;
}) {
  if (active) {
    return (
      <span className={linkClass(true)} aria-current="page">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={linkClass(false, emphasize)} prefetch={false}>
      {children}
    </Link>
  );
}

const PREP_PREFIXES = [
  "/preparar",
  "/ranking",
  "/campeao",
  "/historico",
  "/summoner",
];

export function MainNav({ hasProfile }: Props) {
  const pathname = usePathname();
  const onCoach = pathname === "/coach";
  const onConfig = pathname === "/config" || pathname.startsWith("/referencias");
  const onStats = pathname.startsWith("/estatisticas");
  const onRanking = pathname === "/ranking";
  const onTiming = pathname === "/timing";
  const prepActive =
    !onRanking &&
    !onTiming &&
    PREP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const homeActive = pathname === "/";

  if (!hasProfile) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <NavItem href="/config" active={onConfig} emphasize>
          Configurar
        </NavItem>
      </div>
    );
  }

  return (
    <nav
      aria-label="Principal"
      className="flex flex-wrap items-center justify-end gap-1 text-sm"
    >
      <NavItem href="/" active={homeActive}>
        Hub
      </NavItem>
      <NavItem href="/preparar" active={prepActive}>
        Preparar
      </NavItem>
      <NavItem href="/timing" active={onTiming}>
        Quando
      </NavItem>
      <NavItem href="/ranking" active={onRanking}>
        Ranking
      </NavItem>
      <NavItem href="/estatisticas" active={onStats}>
        Estatísticas
      </NavItem>
      <NavItem href="/coach" active={onCoach} emphasize={!onCoach}>
        Coach
      </NavItem>
      <NavItem href="/config" active={onConfig}>
        Config
      </NavItem>
    </nav>
  );
}

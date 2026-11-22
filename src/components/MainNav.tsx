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

export function MainNav({ hasProfile }: Props) {
  const pathname = usePathname();
  const onCoach = pathname === "/coach" || pathname.startsWith("/coach/");
  const onConfig = pathname === "/config" || pathname.startsWith("/config/");
  const onHistorico =
    pathname === "/historico" || pathname.startsWith("/historico/");
  const onAnalise =
    pathname === "/analise" ||
    pathname.startsWith("/analise/") ||
    pathname === "/ranking" ||
    pathname.startsWith("/ranking/") ||
    pathname.startsWith("/estatisticas") ||
    pathname === "/timing" ||
    pathname.startsWith("/timing/") ||
    pathname.startsWith("/campeao");
  const onBuilds = pathname.startsWith("/builds");
  const onHoje =
    pathname === "/" ||
    pathname === "/rodada" ||
    pathname.startsWith("/rodada/") ||
    pathname === "/preparar" ||
    pathname.startsWith("/preparar/");

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
      <NavItem href="/" active={onHoje && !onCoach && !onHistorico && !onAnalise}>
        Hoje
      </NavItem>
      <NavItem href="/coach" active={onCoach} emphasize={!onCoach}>
        Coach
      </NavItem>
      <NavItem href="/historico" active={onHistorico}>
        Histórico
      </NavItem>
      <NavItem href="/analise" active={onAnalise}>
        Análise
      </NavItem>
      <NavItem href="/builds" active={onBuilds}>
        Builds
      </NavItem>
      <NavItem href="/config" active={onConfig}>
        Config
      </NavItem>
    </nav>
  );
}

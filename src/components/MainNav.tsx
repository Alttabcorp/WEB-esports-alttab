"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  hasProfile: boolean;
};

function linkClass(active: boolean) {
  if (active) {
    return "inline-flex min-h-9 items-center border-b-2 border-[var(--alttab)] px-2.5 py-1.5 font-medium text-[var(--foreground)]";
  }
  return "inline-flex min-h-9 items-center border-b-2 border-transparent px-2.5 py-1.5 text-[var(--muted-strong)] hover:text-[var(--foreground)]";
}

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
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
    <Link href={href} className={linkClass(false)} prefetch={false}>
      {children}
    </Link>
  );
}

export function MainNav({ hasProfile }: Props) {
  const pathname = usePathname();
  const menuId = useId();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

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
  const onMore = onAnalise || onBuilds || onConfig;

  useEffect(() => {
    if (!moreOpen) return;
    function onDoc(e: MouseEvent) {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  if (!hasProfile) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/config"
          className="inline-flex min-h-9 items-center rounded-[var(--radius)] bg-[var(--alttab)] px-3 py-1.5 font-medium text-white hover:bg-[var(--alttab-deep)]"
          prefetch={false}
        >
          Configurar
        </Link>
      </div>
    );
  }

  return (
    <nav aria-label="Principal" className="flex items-center gap-0.5 text-sm">
      {/* Jornada — sempre visível */}
      <div className="hidden items-center gap-0.5 sm:flex">
        <NavItem href="/" active={onHoje && !onCoach && !onHistorico && !onMore}>
          Hoje
        </NavItem>
        <NavItem href="/coach" active={onCoach}>
          Coach
        </NavItem>
        <NavItem href="/historico" active={onHistorico}>
          Revisar
        </NavItem>
      </div>

      {/* Secundário em “Mais” (desktop + tablet) */}
      <div className="relative hidden sm:block" ref={moreRef}>
        <button
          type="button"
          className={linkClass(onMore && !onHoje && !onCoach && !onHistorico)}
          aria-expanded={moreOpen}
          aria-controls={menuId}
          aria-haspopup="menu"
          onClick={() => setMoreOpen((v) => !v)}
        >
          Mais
        </button>
        {moreOpen ? (
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 z-40 mt-1 min-w-[10rem] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-md)]"
          >
            {(
              [
                { href: "/analise", label: "Análise", active: onAnalise },
                { href: "/builds", label: "Builds", active: onBuilds },
                { href: "/config", label: "Config", active: onConfig },
              ] as const
            ).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className={`block px-3 py-2 text-sm hover:bg-[var(--surface-2)] ${
                  item.active
                    ? "font-medium text-[var(--alttab)]"
                    : "text-[var(--foreground)]"
                }`}
                prefetch={false}
                onClick={() => setMoreOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {/* Mobile: só Coach CTA no header; jornada fica na bottom bar */}
      <Link
        href="/coach"
        className={`sm:hidden inline-flex min-h-9 items-center rounded-[var(--radius)] px-3 py-1.5 text-sm font-semibold ${
          onCoach
            ? "bg-[var(--surface-2)] text-[var(--foreground)]"
            : "bg-[var(--alttab)] text-white hover:bg-[var(--alttab-deep)]"
        }`}
        prefetch={false}
      >
        Coach
      </Link>
    </nav>
  );
}

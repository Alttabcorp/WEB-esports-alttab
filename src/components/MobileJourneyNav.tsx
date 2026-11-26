"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

const PRIMARY = [
  { href: "/", label: "Hoje", match: (p: string) => p === "/" },
  {
    href: "/coach",
    label: "Coach",
    match: (p: string) => p === "/coach" || p.startsWith("/coach/"),
  },
  {
    href: "/historico",
    label: "Revisar",
    match: (p: string) => p === "/historico" || p.startsWith("/historico/"),
  },
] as const;

const MORE = [
  { href: "/analise", label: "Análise" },
  { href: "/builds", label: "Builds" },
  { href: "/config", label: "Config" },
] as const;

/**
 * Barra inferior mobile: jornada Hoje → Coach → Revisar + Mais.
 */
export function MobileJourneyNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);

  const onMore =
    pathname.startsWith("/analise") ||
    pathname.startsWith("/builds") ||
    pathname.startsWith("/config") ||
    pathname.startsWith("/ranking") ||
    pathname.startsWith("/estatisticas") ||
    pathname.startsWith("/timing");

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (pathname === "/coach" || pathname.startsWith("/coach/")) {
    // Coach usa tela cheia — link mínimo no header já basta.
    return null;
  }

  return (
    <nav
      aria-label="Jornada"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto grid max-w-5xl grid-cols-4 gap-0.5 px-1 py-1">
        {PRIMARY.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-11 flex-col items-center justify-center rounded-[var(--radius)] text-xs font-medium ${
                active
                  ? "bg-[var(--alttab)]/12 text-[var(--alttab-deep)]"
                  : "text-[var(--muted-strong)] hover:bg-[var(--surface-2)]"
              }`}
              prefetch={false}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="relative" ref={ref}>
          <button
            type="button"
            className={`flex min-h-11 w-full flex-col items-center justify-center rounded-[var(--radius)] text-xs font-medium ${
              onMore || open
                ? "bg-[var(--alttab)]/12 text-[var(--alttab-deep)]"
                : "text-[var(--muted-strong)] hover:bg-[var(--surface-2)]"
            }`}
            aria-expanded={open}
            aria-controls={menuId}
            aria-haspopup="menu"
            aria-label="Mais páginas"
            onClick={() => setOpen((v) => !v)}
          >
            Mais
          </button>
          {open ? (
            <div
              id={menuId}
              role="menu"
              className="absolute bottom-[calc(100%+0.35rem)] right-0 min-w-[9.5rem] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-md)]"
            >
              {MORE.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className="block px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  prefetch={false}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

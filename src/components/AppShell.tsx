"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileJourneyNav } from "./MobileJourneyNav";

type Props = {
  nav: ReactNode;
  children: ReactNode;
};

function contentMaxWidth(pathname: string): string {
  if (pathname === "/coach") return "max-w-6xl";
  if (
    pathname.startsWith("/analise") ||
    pathname === "/ranking" ||
    pathname.startsWith("/estatisticas") ||
    pathname.startsWith("/campeao") ||
    pathname.startsWith("/builds")
  ) {
    return "max-w-7xl";
  }
  return "max-w-5xl";
}

export function AppShell({ nav, children }: Props) {
  const pathname = usePathname();
  const coachMode = pathname === "/coach" || pathname.startsWith("/coach/");
  const width = contentMaxWidth(pathname);

  if (coachMode) {
    return (
      <div className="coach-shell relative min-h-full min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-[var(--radius)] focus:bg-[var(--surface)] focus:px-3 focus:py-2 focus:shadow-[var(--shadow-md)]"
        >
          Ir para o conteúdo
        </a>
        <div
          className={`relative mx-auto flex min-h-dvh w-full ${width} flex-col px-3 py-3 sm:px-5 sm:py-4`}
          style={{
            paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
            paddingRight: "max(0.75rem, env(safe-area-inset-right))",
          }}
        >
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--alttab)] hover:text-[var(--alttab-deep)]"
            >
              ← Hoje
            </Link>
            <div className="min-w-0">{nav}</div>
          </header>
          <main id="main" className="flex-1">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto flex min-h-full w-full ${width} flex-col px-3 pb-20 pt-3 sm:px-5 sm:pb-4 sm:py-4`}
      style={{
        paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
        paddingRight: "max(0.75rem, env(safe-area-inset-right))",
      }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-[var(--radius)] focus:bg-[var(--surface)] focus:px-3 focus:py-2 focus:shadow-[var(--shadow-md)]"
      >
        Ir para o conteúdo
      </a>
      <header className="sticky top-0 z-30 -mx-3 mb-4 border-b border-[var(--border)] bg-[var(--background)]/95 px-3 pb-2.5 pt-1 backdrop-blur-sm sm:-mx-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="group flex min-h-9 items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] bg-[var(--alttab)] text-[11px] font-bold text-white"
              aria-hidden
            >
              LP
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--alttab)]">
                League Persua
              </p>
              <p className="text-[10px] text-[var(--muted)]">ALTTAB Esports</p>
            </div>
          </Link>
          {nav}
        </div>
      </header>
      <main id="main" className="flex-1 scroll-mt-16">
        {children}
      </main>
      <footer className="mt-8 border-t border-[var(--border)] pt-3 text-center text-[10px] text-[var(--muted)]">
        League Persua não é endossado pela Riot Games. League of Legends © Riot
        Games.
      </footer>
      <MobileJourneyNav />
    </div>
  );
}

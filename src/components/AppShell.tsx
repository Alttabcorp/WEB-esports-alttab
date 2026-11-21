"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  nav: ReactNode;
  children: ReactNode;
};

export function AppShell({ nav, children }: Props) {
  const pathname = usePathname();
  const coachMode = pathname === "/coach";

  if (coachMode) {
    return (
      <div className="coach-shell relative min-h-full min-h-dvh">
        <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--alttab)] hover:text-[var(--alttab-deep)]"
            >
              League Persua
            </Link>
            <div className="min-w-0">{nav}</div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <header className="mb-5 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <Link href="/" className="group flex min-h-11 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] bg-[var(--alttab)] text-xs font-bold text-white">
            LP
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--alttab)]">
              League Persua
            </p>
            <p className="text-[11px] text-[var(--muted)]">ALTTAB Esports</p>
          </div>
        </Link>
        {nav}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-10 border-t border-[var(--border)] pt-5 text-center text-[11px] text-[var(--muted)]">
        League Persua não é endossado pela Riot Games. League of Legends © Riot
        Games.
      </footer>
    </div>
  );
}

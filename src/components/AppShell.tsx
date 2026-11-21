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
        <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-3 py-3 sm:px-5 sm:py-4">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
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
    <div className="mx-auto flex min-h-full w-full max-w-[90rem] flex-col px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
      <header className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2.5">
        <Link href="/" className="group flex min-h-9 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] bg-[var(--alttab)] text-[11px] font-bold text-white">
            LP
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--alttab)]">
              League Persua
            </p>
            <p className="text-[10px] text-[var(--muted)]">ALTTAB Esports</p>
          </div>
        </Link>
        {nav}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-6 border-t border-[var(--border)] pt-3 text-center text-[10px] text-[var(--muted)]">
        League Persua não é endossado pela Riot Games. League of Legends © Riot
        Games.
      </footer>
    </div>
  );
}

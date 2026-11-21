"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Atalhos textuais entre páginas relacionadas — não parece aba.
 * (A nav principal já tem Preparar / Quando / Ranking.)
 */
const LINKS = [
  { href: "/preparar", label: "Preparar" },
  { href: "/ranking", label: "Ranking" },
  { href: "/historico", label: "Histórico" },
] as const;

export function PrepSubnav({ alertCount = 0 }: { alertCount?: number }) {
  const pathname = usePathname();
  const links = LINKS.filter((l) => l.href !== pathname);

  if (links.length === 0) return null;

  return (
    <p className="text-sm text-[var(--muted)]">
      Ir para{" "}
      {links.map((l, i) => (
        <span key={l.href}>
          {i > 0 ? <span className="text-[var(--border-strong)]"> · </span> : null}
          <Link
            href={l.href}
            className="font-medium text-[var(--alttab)] hover:underline"
            prefetch={false}
          >
            {l.label}
          </Link>
        </span>
      ))}
      {pathname !== "/timing" && alertCount > 0 ? (
        <>
          <span className="text-[var(--border-strong)]"> · </span>
          <Link
            href="/timing"
            className="font-medium text-[var(--warn)] hover:underline"
            prefetch={false}
          >
            Quando ({alertCount})
          </Link>
        </>
      ) : null}
    </p>
  );
}

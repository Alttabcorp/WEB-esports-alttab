"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { id: "hoje", href: "/", label: "Hoje", hint: "Decidir" },
  { id: "coach", href: "/coach", label: "Coach", hint: "Jogar" },
  { id: "revisar", href: "/historico", label: "Revisar", hint: "Depois" },
] as const;

function activeStep(pathname: string): (typeof STEPS)[number]["id"] {
  if (pathname === "/coach" || pathname.startsWith("/coach/")) return "coach";
  if (pathname === "/historico" || pathname.startsWith("/historico/"))
    return "revisar";
  return "hoje";
}

/**
 * Faixa da jornada diária: Hoje → Coach → Revisar.
 */
export function SessionFlowStrip({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const current = activeStep(pathname);

  return (
    <nav
      aria-label="Fluxo da sessão"
      className={`flex flex-wrap items-center gap-1 text-sm ${className}`}
    >
      {STEPS.map((step, i) => {
        const active = step.id === current;
        return (
          <span key={step.id} className="inline-flex items-center gap-1">
            {i > 0 ? (
              <span className="px-1 text-[var(--border-strong)]" aria-hidden>
                →
              </span>
            ) : null}
            {active ? (
              <span
                className="rounded-[var(--radius)] bg-[var(--alttab)]/12 px-2.5 py-1 font-semibold text-[var(--foreground)]"
                aria-current="step"
              >
                {step.label}
                <span className="ml-1.5 text-xs font-normal text-[var(--muted)]">
                  {step.hint}
                </span>
              </span>
            ) : (
              <Link
                href={step.href}
                className="rounded-[var(--radius)] px-2.5 py-1 text-[var(--muted-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                prefetch={false}
              >
                {step.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

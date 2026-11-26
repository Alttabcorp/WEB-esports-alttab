"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

const TABS = [
  { id: "ranking", label: "Ranking" },
  { id: "stats", label: "Estatísticas" },
  { id: "quando", label: "Quando" },
] as const;

export type AnaliseTabId = (typeof TABS)[number]["id"];

export function parseAnaliseTab(raw: string | null | undefined): AnaliseTabId {
  if (raw === "stats" || raw === "quando" || raw === "ranking") return raw;
  return "ranking";
}

type Props = {
  ranking: ReactNode;
  stats: ReactNode;
  quando: ReactNode;
};

export function AnaliseTabs({ ranking, stats, quando }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = parseAnaliseTab(searchParams.get("tab"));

  function setTab(next: AnaliseTabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/analise?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-9 border-b-2 px-3 py-1.5 text-sm transition ${
                active
                  ? "border-[var(--alttab)] font-medium text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted-strong)] hover:text-[var(--foreground)]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/coach"
            className="inline-flex min-h-9 items-center px-2 text-sm text-[var(--muted-strong)] hover:text-[var(--alttab)]"
            prefetch={false}
          >
            Coach
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-9 items-center px-2 text-sm text-[var(--alttab)] hover:underline"
            prefetch={false}
          >
            ← Hoje
          </Link>
        </div>
      </div>

      <div className={tab === "ranking" ? "block" : "hidden"}>{ranking}</div>
      <div className={tab === "stats" ? "block" : "hidden"}>{stats}</div>
      <div className={tab === "quando" ? "block" : "hidden"}>{quando}</div>
    </div>
  );
}

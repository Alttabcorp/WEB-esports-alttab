import Link from "next/link";
import type { PracticeCandidate } from "@/lib/stats/practiceCandidates";
import { pct } from "@/lib/format";
import { ChampionIcon } from "./ChampionIcon";
import { Panel } from "@/components/ui";

type Props = {
  candidates: PracticeCandidate[];
  ddragonVersion: string;
  idToKey: Record<number, string>;
  /** Compacto para cards de decisão / hub. */
  compact?: boolean;
};

export function PracticeNormalsPanel({
  candidates,
  ddragonVersion,
  idToKey,
  compact = false,
}: Props) {
  if (!candidates.length) return null;

  if (compact) {
    const names = candidates
      .slice(0, 3)
      .map((c) => c.championName)
      .join(", ");
    return (
      <Panel className="border-[var(--alttab)]/25 bg-[var(--alttab)]/5 px-3 py-2.5">
        <p className="data-label">Testar em normais</p>
        <p className="mt-1 text-sm text-[var(--foreground)]">
          Masterizar <span className="font-semibold">{names}</span> em normais /
          outros modos — não só ranked.
        </p>
        <Link
          href="/estatisticas"
          className="mt-2 inline-flex text-sm font-medium text-[var(--alttab)] hover:underline"
          prefetch={false}
        >
          Ver na lista →
        </Link>
      </Panel>
    );
  }

  return (
    <div id="pratica" className="scroll-mt-4">
      <Panel className="space-y-3 p-3 sm:p-4">
        <div>
          <p className="data-label">Masterizar</p>
          <h2 className="mt-0.5 text-base font-semibold text-[var(--foreground)]">
            Vale treinar em normais
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Baseado no seu histórico ranked — solidifique estes champs em outros
            modos antes de forçar fila.
          </p>
        </div>
        <ul className="space-y-2">
          {candidates.map((c) => (
            <li
              key={c.championId}
              className="flex items-start gap-2.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2"
            >
              <ChampionIcon
                ddragonVersion={ddragonVersion}
                championId={c.championId}
                nameOrKey={c.championName}
                idToKey={idToKey}
                alt={c.championName}
                width={36}
                height={36}
                className="rounded-md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="font-semibold text-[var(--foreground)]">
                    {c.championName}
                  </p>
                  <span className="text-xs tabular text-[var(--muted)]">
                    {pct(c.wr)} · {c.games}j
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--muted-strong)] sm:text-sm">
                  {c.reason}
                </p>
              </div>
              <Link
                href={`/ranking?champ=${c.championId}`}
                className="shrink-0 text-sm font-medium text-[var(--alttab)] hover:underline"
                prefetch={false}
              >
                Ver
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

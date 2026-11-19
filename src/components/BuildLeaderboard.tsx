import Image from "next/image";
import type { BuildInsight } from "@/lib/stats/aggregate";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { pct } from "@/lib/format";
import { itemIconUrl } from "@/lib/ddragon";

type Props = {
  builds: BuildInsight[];
  championName: string;
  ddragonVersion: string;
  large?: boolean;
};

export function BuildLeaderboard({
  builds,
  championName,
  ddragonVersion,
  large = false,
}: Props) {
  if (builds.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Sem builds recorrentes suficientes para {championName}.
      </p>
    );
  }

  const icon = large ? 44 : 36;

  return (
    <ul className="space-y-3">
      {builds.map((build, buildIdx) => (
        <li
          key={build.fingerprint}
          className="rounded-xl border border-[var(--border)] bg-black/25 p-3 sm:p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--muted-strong)]">
              {buildIdx === 0 ? "Principal · " : ""}
              {pct(build.wr)} WR · {build.games} jogos
            </p>
            <ConfidenceBadge level={build.confidence} />
          </div>
          <div className="flex flex-wrap gap-2">
            {build.items.map((itemId, idx) => (
              <div
                key={`${build.fingerprint}-${itemId}-${idx}`}
                className="relative"
              >
                <Image
                  src={itemIconUrl(ddragonVersion, itemId)}
                  alt={`Item ${itemId}`}
                  width={icon}
                  height={icon}
                  className="rounded-md ring-1 ring-white/10"
                />
                {large ? (
                  <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded bg-black/85 text-[9px] font-bold text-white">
                    {idx + 1}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

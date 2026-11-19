import Image from "next/image";
import type { BuildInsight } from "@/lib/stats/aggregate";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { pct } from "@/lib/format";
import { itemIconUrl } from "@/lib/ddragon";

type Props = {
  builds: BuildInsight[];
  championName: string;
  ddragonVersion: string;
};

export function BuildLeaderboard({
  builds,
  championName,
  ddragonVersion,
}: Props) {
  if (builds.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        Sem builds recorrentes suficientes para {championName}.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {builds.map((build) => (
        <li
          key={build.fingerprint}
          className="rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-300">
              {pct(build.wr)} WR · {build.games} jogos · Wilson{" "}
              {pct(build.wilsonLower)}
            </p>
            <ConfidenceBadge level={build.confidence} />
          </div>
          <div className="flex flex-wrap gap-2">
            {build.items.map((itemId) => (
              <Image
                key={`${build.fingerprint}-${itemId}`}
                src={itemIconUrl(ddragonVersion, itemId)}
                alt={`Item ${itemId}`}
                width={40}
                height={40}
                className="rounded-md ring-1 ring-white/10"
              />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

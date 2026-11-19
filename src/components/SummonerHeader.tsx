import Image from "next/image";
import type { LeagueEntryDto, SummonerDto } from "@/lib/riot/types";
import { pct } from "@/lib/format";
import { profileIconUrl } from "@/lib/ddragon";
import { Panel, Stat } from "@/components/ui";

type Props = {
  gameName: string;
  tagLine: string;
  platform: string;
  summoner: SummonerDto | null;
  ranked: LeagueEntryDto[];
  overallWr: number;
  analyzedGames: number;
  wins: number;
  losses: number;
  ddragonVersion: string;
  dayLpDelta?: number | null;
};

function formatRank(entries: LeagueEntryDto[]): string {
  const solo =
    entries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? entries[0];
  if (!solo) return "Unranked";
  return `${solo.tier} ${solo.rank} · ${solo.leaguePoints} LP`;
}

export function SummonerHeader({
  gameName,
  tagLine,
  platform,
  summoner,
  ranked,
  overallWr,
  analyzedGames,
  wins,
  losses,
  ddragonVersion,
  dayLpDelta = null,
}: Props) {
  const iconId = summoner?.profileIconId ?? 29;
  const lpLabel =
    dayLpDelta == null
      ? "—"
      : dayLpDelta > 0
        ? `+${dayLpDelta}`
        : String(dayLpDelta);

  return (
    <Panel
      strong
      as="header"
      className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:p-5"
    >
      <Image
        src={profileIconUrl(ddragonVersion, iconId)}
        alt={`Ícone de ${gameName}`}
        width={72}
        height={72}
        className="rounded-xl ring-1 ring-[var(--border-strong)]"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="data-label">{platform.toUpperCase()}</p>
        <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">
          {gameName}
          <span className="text-[var(--alttab-soft)]">#{tagLine}</span>
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {formatRank(ranked)}
          {summoner ? ` · Nv. ${summoner.summonerLevel}` : null}
          <span className="text-[var(--muted)]/70">
            {" "}
            · {wins}W {losses}L
          </span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:min-w-[280px] sm:grid-cols-4">
        <Stat label="PDL hoje" value={lpLabel} />
        <Stat label="WR" value={pct(overallWr)} />
        <Stat label="Vitórias" value={String(wins)} />
        <Stat label="Amostra" value={String(analyzedGames)} />
      </div>
    </Panel>
  );
}

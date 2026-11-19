import Image from "next/image";
import type { LeagueEntryDto, SummonerDto } from "@/lib/riot/types";
import { pct } from "@/lib/format";
import { profileIconUrl } from "@/lib/ddragon";

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
}: Props) {
  const iconId = summoner?.profileIconId ?? 29;

  return (
    <header className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-black/35 p-6 backdrop-blur sm:flex-row sm:items-center">
      <Image
        src={profileIconUrl(ddragonVersion, iconId)}
        alt={`Ícone de ${gameName}`}
        width={96}
        height={96}
        className="rounded-2xl ring-2 ring-[#0596aa]/50"
      />
      <div className="flex-1 space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3de]">
          {platform.toUpperCase()} · League Persua
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
          {gameName}
          <span className="text-[#0596aa]">#{tagLine}</span>
        </h1>
        <p className="text-zinc-300">
          {formatRank(ranked)}
          {summoner ? ` · Nível ${summoner.summonerLevel}` : null}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[280px]">
        <Stat label="WR geral" value={pct(overallWr)} />
        <Stat label="Vitórias" value={String(wins)} />
        <Stat label="Partidas" value={`${analyzedGames}`} />
        <p className="col-span-3 text-xs text-zinc-500">
          {wins}W · {losses}L na amostra analisada
        </p>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

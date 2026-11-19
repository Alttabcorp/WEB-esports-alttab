import Link from "next/link";
import { CoachDashboard } from "@/components/CoachDashboard";
import { getChampionIdToKey, getDdragonVersion } from "@/lib/ddragon";
import { decodeRiotIdParam } from "@/lib/format";
import {
  analyzePlayer,
  parseRiotId,
  resolveSummonerProfile,
  type SummonerProfile,
} from "@/lib/riot/analyze";
import { RiotApiError } from "@/lib/riot/client";
import { isPlatformRegion, type PlatformRegion } from "@/lib/riot/regions";
import type { QueueFilter } from "@/lib/riot/types";
import type { AnalyzeResponse } from "@/lib/riot/analyze";

type PageProps = {
  params: Promise<{ region: string; riotId: string }>;
  searchParams: Promise<{ queue?: string; count?: string }>;
};

type LoadResult =
  | {
      ok: true;
      profile: SummonerProfile;
      analysis: AnalyzeResponse;
      ddragonVersion: string;
      idToKey: Record<number, string>;
    }
  | { ok: false; title: string; detail: string };

async function loadSummonerData(
  region: PlatformRegion,
  gameName: string,
  tagLine: string,
  queue: QueueFilter,
  count: number,
): Promise<LoadResult> {
  try {
    const profile = await resolveSummonerProfile(region, gameName, tagLine);
    const analysis = await analyzePlayer({
      platform: region,
      puuid: profile.puuid,
      queue,
      count,
      profile,
    });
    const ddragonVersion = await getDdragonVersion();
    const idToKey = await getChampionIdToKey(ddragonVersion);
    return { ok: true, profile, analysis, ddragonVersion, idToKey };
  } catch (error) {
    if (error instanceof RiotApiError) {
      if (error.status === 404) {
        return {
          ok: false,
          title: "Invocador não encontrado",
          detail: `Não achamos ${gameName}#${tagLine} em ${region.toUpperCase()}.`,
        };
      }
      if (error.status === 429) {
        return {
          ok: false,
          title: "Rate limit da Riot",
          detail:
            "Muitas requisições. Aguarde alguns segundos e tente de novo.",
        };
      }
      if (error.status === 500 && error.message.includes("RIOT_API_KEY")) {
        return {
          ok: false,
          title: "API key ausente",
          detail: "Crie .env.local com RIOT_API_KEY (veja .env.example).",
        };
      }
      return {
        ok: false,
        title: "Falha na Riot API",
        detail: error.message || `Status ${error.status}`,
      };
    }

    console.error(error);
    return {
      ok: false,
      title: "Erro inesperado",
      detail: "Não foi possível analisar o histórico.",
    };
  }
}

export default async function SummonerPage({ params, searchParams }: PageProps) {
  const { region, riotId: riotIdParam } = await params;
  const sp = await searchParams;
  const riotId = decodeRiotIdParam(riotIdParam);
  const queue = (sp.queue ?? "ranked") as QueueFilter;
  const count = Number(sp.count ?? "50");

  if (!isPlatformRegion(region)) {
    return <ErrorState title="Região inválida" detail={`Região: ${region}`} />;
  }

  const parsed = parseRiotId(riotId);
  if (!parsed) {
    return (
      <ErrorState
        title="Riot ID inválido"
        detail="Use o formato Nome#TAG na busca."
      />
    );
  }

  const result = await loadSummonerData(
    region,
    parsed.gameName,
    parsed.tagLine,
    queue,
    Number.isFinite(count) ? count : 50,
  );

  if (!result.ok) {
    return <ErrorState title={result.title} detail={result.detail} />;
  }

  const { profile, analysis, ddragonVersion, idToKey } = result;

  return (
    <div className="space-y-6 pb-10">
      <Link
        href="/"
        className="inline-flex text-sm text-[#7dd3de] hover:text-white"
      >
        ← Nova busca
      </Link>
      <CoachDashboard
        gameName={profile.gameName}
        tagLine={profile.tagLine}
        platform={profile.platform}
        summoner={profile.summoner}
        ranked={profile.ranked}
        analysis={analysis}
        ddragonVersion={ddragonVersion}
        idToKey={idToKey}
        cached={analysis.cached}
      />
    </div>
  );
}

function ErrorState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-xl text-white">
        {title}
      </h1>
      <p className="mt-3 text-sm text-zinc-300">{detail}</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-xl bg-[#0596aa] px-4 py-2 text-sm font-semibold text-white hover:bg-[#047a8a]"
      >
        Voltar à busca
      </Link>
    </div>
  );
}

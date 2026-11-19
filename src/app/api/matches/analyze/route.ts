import { NextRequest, NextResponse } from "next/server";
import { RiotApiError } from "@/lib/riot/client";
import { analyzePlayer, parseRiotId, resolveSummonerProfile } from "@/lib/riot/analyze";
import { isPlatformRegion } from "@/lib/riot/regions";
import type { QueueFilter } from "@/lib/riot/types";

const VALID_QUEUES: QueueFilter[] = ["solo", "flex", "ranked", "all"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const riotId = searchParams.get("riotId") ?? "";
    const region = searchParams.get("region") ?? process.env.RIOT_DEFAULT_REGION ?? "br1";
    const queueParam = (searchParams.get("queue") ?? "ranked") as QueueFilter;
    const count = Number(searchParams.get("count") ?? "50");
    const puuidParam = searchParams.get("puuid");

    if (!isPlatformRegion(region)) {
      return NextResponse.json({ error: "Região inválida" }, { status: 400 });
    }

    if (!VALID_QUEUES.includes(queueParam)) {
      return NextResponse.json({ error: "Fila inválida" }, { status: 400 });
    }

    let puuid = puuidParam ?? "";
    let profile = null;

    if (!puuid) {
      const parsed = parseRiotId(riotId);
      if (!parsed) {
        return NextResponse.json(
          { error: "Informe riotId (Nome#TAG) ou puuid" },
          { status: 400 },
        );
      }
      profile = await resolveSummonerProfile(
        region,
        parsed.gameName,
        parsed.tagLine,
      );
      puuid = profile.puuid;
    }

    const analysis = await analyzePlayer({
      platform: region,
      puuid,
      queue: queueParam,
      count: Number.isFinite(count) ? count : 50,
      profile: profile ?? undefined,
    });

    return NextResponse.json({
      profile,
      analysis,
    });
  } catch (error) {
    if (error instanceof RiotApiError) {
      const status = error.status === 404 ? 404 : error.status === 429 ? 429 : 502;
      return NextResponse.json(
        {
          error:
            error.status === 404
              ? "Dados não encontrados"
              : error.status === 429
                ? "Rate limit da Riot atingido. Tente novamente em instantes."
                : error.message,
        },
        { status },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Falha ao analisar partidas" },
      { status: 500 },
    );
  }
}

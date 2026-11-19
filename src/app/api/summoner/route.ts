import { NextRequest, NextResponse } from "next/server";
import { RiotApiError } from "@/lib/riot/client";
import { isPlatformRegion } from "@/lib/riot/regions";
import { parseRiotId, resolveSummonerProfile } from "@/lib/riot/analyze";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const riotId = searchParams.get("riotId") ?? "";
    const region = searchParams.get("region") ?? process.env.RIOT_DEFAULT_REGION ?? "br1";

    if (!isPlatformRegion(region)) {
      return NextResponse.json({ error: "Região inválida" }, { status: 400 });
    }

    const parsed = parseRiotId(riotId);
    if (!parsed) {
      return NextResponse.json(
        { error: "Informe o Riot ID no formato Nome#TAG" },
        { status: 400 },
      );
    }

    const profile = await resolveSummonerProfile(
      region,
      parsed.gameName,
      parsed.tagLine,
    );

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof RiotApiError) {
      const status = error.status === 404 ? 404 : error.status === 429 ? 429 : 502;
      return NextResponse.json(
        {
          error:
            error.status === 404
              ? "Invocador não encontrado"
              : error.status === 429
                ? "Rate limit da Riot atingido. Tente novamente em instantes."
                : error.message,
        },
        { status },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Falha ao consultar a Riot API" },
      { status: 500 },
    );
  }
}

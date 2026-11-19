import { NextRequest, NextResponse } from "next/server";
import { getLiveCoachPayload } from "@/lib/live/coach";
import { RiotApiError } from "@/lib/riot/client";
import { isPlatformRegion } from "@/lib/riot/regions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const region = searchParams.get("region") ?? "br1";
    const puuid = searchParams.get("puuid") ?? "";

    if (!isPlatformRegion(region)) {
      return NextResponse.json({ error: "Região inválida" }, { status: 400 });
    }
    if (!puuid) {
      return NextResponse.json({ error: "puuid obrigatório" }, { status: 400 });
    }

    const live = await getLiveCoachPayload(region, puuid);
    return NextResponse.json({ live });
  } catch (error) {
    if (error instanceof RiotApiError) {
      const status =
        error.status === 429 ? 429 : error.status === 404 ? 404 : 502;
      return NextResponse.json(
        {
          error:
            error.status === 429
              ? "Rate limit Riot — aguarde"
              : error.message,
        },
        { status },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao consultar partida ao vivo" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  buildSessionAdvice,
  type SessionAdvicePhase,
} from "@/lib/live/sessionAdvice";
import { RiotApiError } from "@/lib/riot/client";
import { isPlatformRegion } from "@/lib/riot/regions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const region = searchParams.get("region") ?? "br1";
    const puuid = searchParams.get("puuid") ?? "";
    const phaseParam = searchParams.get("phase");
    const phase: SessionAdvicePhase =
      phaseParam === "preQueue" ? "preQueue" : "postGame";

    if (!isPlatformRegion(region)) {
      return NextResponse.json({ error: "Região inválida" }, { status: 400 });
    }
    if (!puuid) {
      return NextResponse.json({ error: "puuid obrigatório" }, { status: 400 });
    }

    const advice = await buildSessionAdvice(region, puuid, { phase });
    return NextResponse.json({ advice });
  } catch (error) {
    if (error instanceof RiotApiError) {
      const status = error.status === 429 ? 429 : 502;
      return NextResponse.json(
        {
          error:
            error.status === 429
              ? "Rate limit Riot — aguarde e tente de novo"
              : error.message,
        },
        { status },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao montar conselho de sessão" },
      { status: 500 },
    );
  }
}

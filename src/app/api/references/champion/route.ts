import { NextRequest, NextResponse } from "next/server";
import { getReferenceInsightsForChampion } from "@/lib/db/persist";

export async function GET(request: NextRequest) {
  try {
    const championId = Number(request.nextUrl.searchParams.get("championId"));
    if (!Number.isFinite(championId) || championId <= 0) {
      return NextResponse.json({ error: "championId inválido" }, { status: 400 });
    }
    const insights = await getReferenceInsightsForChampion(championId);
    return NextResponse.json({ insights });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao carregar builds das referências" },
      { status: 500 },
    );
  }
}

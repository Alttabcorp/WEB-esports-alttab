import { NextRequest, NextResponse } from "next/server";
import { buildAdaptTips } from "@/lib/live/coach";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      puuid?: string;
      myChampionId?: number;
      enemyLanerId?: number | null;
      enemyChampionIds?: number[];
    };

    const puuid = body.puuid?.trim();
    const myChampionId = Number(body.myChampionId);
    if (!puuid || !Number.isFinite(myChampionId) || myChampionId <= 0) {
      return NextResponse.json(
        { error: "Informe puuid e myChampionId" },
        { status: 400 },
      );
    }

    const enemyLanerId =
      body.enemyLanerId != null && Number(body.enemyLanerId) > 0
        ? Number(body.enemyLanerId)
        : null;
    const enemyChampionIds = Array.isArray(body.enemyChampionIds)
      ? body.enemyChampionIds.map(Number).filter((id) => id > 0)
      : [];

    const adapt = await buildAdaptTips(
      puuid,
      myChampionId,
      enemyLanerId,
      enemyChampionIds,
    );

    return NextResponse.json({ adapt });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao calcular tips adaptativos" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { collectChampionMeta, eloFromRanked } from "@/lib/meta/collect";
import type { MetaBand } from "@/lib/meta/types";
import { RiotApiError } from "@/lib/riot/client";
import { isPlatformRegion } from "@/lib/riot/regions";
import type { LeagueEntryDto, RankedDivision, RankedTier } from "@/lib/riot/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const championId = Number(searchParams.get("championId"));
    const region = searchParams.get("region") ?? "br1";
    const band = (searchParams.get("band") ?? "HIGH").toUpperCase() as MetaBand;
    const tierParam = searchParams.get("tier");
    const divisionParam = searchParams.get("division");
    const rankedRaw = searchParams.get("ranked");

    if (!Number.isFinite(championId) || championId <= 0) {
      return NextResponse.json({ error: "championId inválido" }, { status: 400 });
    }
    if (!isPlatformRegion(region)) {
      return NextResponse.json({ error: "Região inválida" }, { status: 400 });
    }
    if (band !== "PEER" && band !== "HIGH") {
      return NextResponse.json({ error: "band deve ser PEER ou HIGH" }, { status: 400 });
    }

    let tier = (tierParam?.toUpperCase() as RankedTier | undefined) ?? null;
    let division = (divisionParam?.toUpperCase() as RankedDivision | undefined) ?? null;

    if (band === "PEER" && (!tier || !division) && rankedRaw) {
      try {
        const ranked = JSON.parse(rankedRaw) as LeagueEntryDto[];
        const elo = eloFromRanked(ranked);
        if (elo) {
          tier = elo.tier;
          division = elo.division;
        }
      } catch {
        // ignore parse errors
      }
    }

    if (band === "PEER" && !tier) {
      return NextResponse.json(
        {
          error:
            "Para comparar no mesmo elo, informe tier/division ou ranked do invocador",
        },
        { status: 400 },
      );
    }

    const meta = await collectChampionMeta({
      platform: region,
      championId,
      band,
      tier,
      division,
    });

    return NextResponse.json({ meta });
  } catch (error) {
    if (error instanceof RiotApiError) {
      const status =
        error.status === 429 ? 429 : error.status === 404 ? 404 : 502;
      return NextResponse.json(
        {
          error:
            error.status === 429
              ? "Rate limit Riot — aguarde e tente de novo. O meta fica em cache 12h."
              : error.message,
        },
        { status },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao coletar meta do campeão" },
      { status: 500 },
    );
  }
}

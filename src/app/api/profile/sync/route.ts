import { NextResponse } from "next/server";
import { getAppProfile } from "@/lib/db/persist";
import {
  analyzePlayer,
  resolveSummonerProfile,
} from "@/lib/riot/analyze";
import { RiotApiError } from "@/lib/riot/client";
import { isPlatformRegion } from "@/lib/riot/regions";
import type { QueueFilter } from "@/lib/riot/types";

/** Força sincronizar histórico do perfil salvo via Riot → Postgres. */
export async function POST() {
  try {
    const profile = await getAppProfile();
    if (!profile) {
      return NextResponse.json(
        { error: "Nenhum perfil configurado" },
        { status: 404 },
      );
    }
    if (!isPlatformRegion(profile.platform)) {
      return NextResponse.json({ error: "Região inválida" }, { status: 400 });
    }

    const queue = profile.queue as QueueFilter;
    const count = profile.matchCount;

    const resolved = await resolveSummonerProfile(
      profile.platform,
      profile.gameName,
      profile.tagLine,
      { forceRefresh: true, preferDb: false },
    );

    const analysis = await analyzePlayer({
      platform: profile.platform,
      puuid: resolved.puuid,
      queue,
      count,
      profile: resolved,
      forceRefresh: true,
      preferDb: false,
    });

    const updated = await getAppProfile();

    return NextResponse.json({
      profile: updated,
      analysis: {
        analyzedGames: analysis.analyzedGames,
        source: analysis.source,
        cached: analysis.cached,
      },
    });
  } catch (error) {
    if (error instanceof RiotApiError) {
      const status =
        error.status === 404 ? 404 : error.status === 429 ? 429 : 502;
      return NextResponse.json(
        {
          error:
            error.status === 429
              ? "Rate limit da Riot — aguarde e tente de novo"
              : error.status === 404
                ? "Invocador não encontrado"
                : error.message,
        },
        { status },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao sincronizar histórico" },
      { status: 500 },
    );
  }
}

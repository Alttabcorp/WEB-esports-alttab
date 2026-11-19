import { NextRequest, NextResponse } from "next/server";
import {
  findPlayerByPuuid,
  listReferencePlayers,
} from "@/lib/db/persist";
import {
  analyzePlayer,
  resolveSummonerProfile,
} from "@/lib/riot/analyze";
import { RiotApiError } from "@/lib/riot/client";
import { isPlatformRegion } from "@/lib/riot/regions";

/** Sincroniza um ou todos os jogadores de referência. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
    };
    const refs = await listReferencePlayers();
    const targets = body.id
      ? refs.filter((r) => r.id === body.id)
      : refs;

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma referência para sincronizar" },
        { status: 404 },
      );
    }

    const results: { id: string; games: number; error?: string }[] = [];

    for (const ref of targets) {
      try {
        if (!isPlatformRegion(ref.platform)) {
          results.push({ id: ref.id, games: 0, error: "Região inválida" });
          continue;
        }
        const resolved = await resolveSummonerProfile(
          ref.platform,
          ref.gameName,
          ref.tagLine,
          { forceRefresh: true, preferDb: false },
        );
        const analysis = await analyzePlayer({
          platform: ref.platform,
          puuid: resolved.puuid,
          queue: "ranked",
          count: ref.matchCount,
          profile: resolved,
          forceRefresh: true,
          preferDb: false,
        });
        results.push({ id: ref.id, games: analysis.analyzedGames });
        await findPlayerByPuuid(resolved.puuid);
      } catch (error) {
        const msg =
          error instanceof RiotApiError
            ? error.status === 429
              ? "Rate limit"
              : error.message
            : "Falha";
        results.push({ id: ref.id, games: 0, error: msg });
      }
    }

    const references = await listReferencePlayers();
    return NextResponse.json({ results, references });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao sincronizar referências" },
      { status: 500 },
    );
  }
}

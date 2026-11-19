import { NextRequest, NextResponse } from "next/server";
import {
  addReferencePlayer,
  findPlayerByPuuid,
  getAppProfile,
  listReferencePlayers,
  removeReferencePlayer,
} from "@/lib/db/persist";
import {
  analyzePlayer,
  parseRiotId,
  resolveSummonerProfile,
} from "@/lib/riot/analyze";
import { RiotApiError } from "@/lib/riot/client";
import { isPlatformRegion } from "@/lib/riot/regions";
import { clampMatchCount } from "@/lib/stats/limits";

export async function GET() {
  try {
    const profile = await getAppProfile();
    if (!profile) {
      return NextResponse.json(
        { error: "Configure seu perfil antes de adicionar referências" },
        { status: 400 },
      );
    }
    const references = await listReferencePlayers();
    return NextResponse.json({ references });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao listar referências" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getAppProfile();
    if (!profile) {
      return NextResponse.json(
        { error: "Configure seu perfil antes de adicionar referências" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      region?: string;
      riotId?: string;
      label?: string;
      notes?: string;
      championIds?: number[];
      matchCount?: number;
      sync?: boolean;
    };

    const region = body.region ?? profile.platform;
    if (!isPlatformRegion(region)) {
      return NextResponse.json({ error: "Região inválida" }, { status: 400 });
    }
    const parsed = parseRiotId(body.riotId ?? "");
    if (!parsed) {
      return NextResponse.json(
        { error: "Informe Riot ID no formato Nome#TAG" },
        { status: 400 },
      );
    }

    const matchCount = clampMatchCount(body.matchCount ?? 100, 100);
    const resolved = await resolveSummonerProfile(
      region,
      parsed.gameName,
      parsed.tagLine,
      { forceRefresh: true, preferDb: false },
    );

    if (resolved.puuid === profile.puuid) {
      return NextResponse.json(
        { error: "Esse já é o seu perfil — use referências de outros players" },
        { status: 400 },
      );
    }

    if (body.sync !== false) {
      await analyzePlayer({
        platform: region,
        puuid: resolved.puuid,
        queue: "ranked",
        count: matchCount,
        profile: resolved,
        forceRefresh: true,
        preferDb: false,
      });
    }

    const player = await findPlayerByPuuid(resolved.puuid);
    if (!player) {
      return NextResponse.json(
        { error: "Falha ao persistir o invocador de referência" },
        { status: 500 },
      );
    }

    const reference = await addReferencePlayer({
      playerId: player.id,
      label: body.label?.trim() || null,
      notes: body.notes?.trim() || null,
      championIds: body.championIds ?? [],
      matchCount,
    });

    const references = await listReferencePlayers();
    return NextResponse.json({ reference, references });
  } catch (error) {
    if (error instanceof RiotApiError) {
      const status =
        error.status === 404 ? 404 : error.status === 429 ? 429 : 502;
      return NextResponse.json(
        {
          error:
            error.status === 404
              ? "Invocador não encontrado"
              : error.status === 429
                ? "Rate limit da Riot — aguarde"
                : error.message,
        },
        { status },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao adicionar referência" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }
    await removeReferencePlayer(id);
    const references = await listReferencePlayers();
    return NextResponse.json({ ok: true, references });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao remover referência" },
      { status: 500 },
    );
  }
}

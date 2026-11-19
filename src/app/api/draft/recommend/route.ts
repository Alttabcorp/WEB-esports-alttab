import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import {
  createDraftSession,
  findPlayerByPuuid,
  updateDraftSessionPick,
} from "@/lib/db/persist";
import { RiotApiError } from "@/lib/riot/client";
import {
  analyzePlayer,
  parseRiotId,
  resolveSummonerProfile,
} from "@/lib/riot/analyze";
import { isPlatformRegion } from "@/lib/riot/regions";
import { recommendDraftPicks } from "@/lib/stats/draft";
import type { RoleKey } from "@/lib/stats/roles";
import type { QueueFilter } from "@/lib/riot/types";

const VALID_ROLES: RoleKey[] = [
  "TOP",
  "JUNGLE",
  "MIDDLE",
  "BOTTOM",
  "UTILITY",
];

type DraftBody = {
  region?: string;
  riotId?: string;
  puuid?: string;
  role?: string;
  enemyChampionIds?: number[];
  allyChampionIds?: number[];
  bannedChampionIds?: number[];
  pickedChampionId?: number | null;
  sessionId?: string;
  queue?: QueueFilter;
  count?: number;
};

function asIdArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DraftBody;
    const region =
      body.region ?? process.env.RIOT_DEFAULT_REGION ?? "br1";
    const queue = (body.queue ?? "ranked") as QueueFilter;
    const count = Number(body.count ?? 50);
    const role = (body.role ?? "MIDDLE").toUpperCase() as RoleKey;

    if (!isPlatformRegion(region)) {
      return NextResponse.json({ error: "Região inválida" }, { status: 400 });
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Lane inválida" }, { status: 400 });
    }

    let puuid = body.puuid ?? "";
    let profile = null;

    if (!puuid) {
      const parsed = parseRiotId(body.riotId ?? "");
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
      queue,
      count: Number.isFinite(count) ? count : 50,
      profile: profile ?? undefined,
    });

    const player = await findPlayerByPuuid(puuid);
    if (!player) {
      return NextResponse.json(
        { error: "Jogador não persistido — rode a análise primeiro" },
        { status: 404 },
      );
    }

    const enemyChampionIds = asIdArray(body.enemyChampionIds);
    const allyChampionIds = asIdArray(body.allyChampionIds);
    const bannedChampionIds = asIdArray(body.bannedChampionIds);

    const draft = recommendDraftPicks(analysis, {
      role,
      enemyChampionIds,
      allyChampionIds,
      bannedChampionIds,
    });

    if (body.sessionId && body.pickedChampionId) {
      await updateDraftSessionPick(
        body.sessionId,
        player.id,
        Number(body.pickedChampionId),
      );
      return NextResponse.json({
        sessionId: body.sessionId,
        draft,
        pickedChampionId: Number(body.pickedChampionId),
      });
    }

    const session = await createDraftSession({
      playerId: player.id,
      role,
      allyChampionIds,
      enemyChampionIds,
      bannedChampionIds,
      recommendedChampionIds: draft.recommendations.map((r) => r.championId),
      pickedChampionId: body.pickedChampionId
        ? Number(body.pickedChampionId)
        : null,
      resultJson: draft as unknown as Prisma.InputJsonValue,
    });

    return NextResponse.json({
      sessionId: session.id,
      draft,
      profile: profile
        ? {
            gameName: profile.gameName,
            tagLine: profile.tagLine,
            puuid: profile.puuid,
            platform: profile.platform,
          }
        : {
            gameName: player.gameName,
            tagLine: player.tagLine,
            puuid: player.puuid,
            platform: player.platform,
          },
    });
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
                ? "Rate limit da Riot atingido. Tente novamente em instantes."
                : error.message,
        },
        { status },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Falha ao gerar recomendações de draft" },
      { status: 500 },
    );
  }
}

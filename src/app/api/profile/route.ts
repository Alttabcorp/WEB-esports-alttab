import { NextRequest, NextResponse } from "next/server";
import {
  clearAppProfile,
  findPlayerByPuuid,
  getAppProfile,
  upsertAppProfile,
  upsertPlayer,
} from "@/lib/db/persist";
import { RiotApiError } from "@/lib/riot/client";
import {
  analyzePlayer,
  parseRiotId,
  resolveSummonerProfile,
} from "@/lib/riot/analyze";
import { isPlatformRegion } from "@/lib/riot/regions";
import { clampMatchCount } from "@/lib/stats/limits";
import { clampLpStop, clampLpTarget } from "@/lib/stats/dayGoal";
import type { RoleKey } from "@/lib/stats/roles";
import type { QueueFilter } from "@/lib/riot/types";

const VALID_ROLES: RoleKey[] = [
  "TOP",
  "JUNGLE",
  "MIDDLE",
  "BOTTOM",
  "UTILITY",
];

export async function GET() {
  try {
    const profile = await getAppProfile();
    return NextResponse.json({ profile });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao carregar perfil" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      region?: string;
      riotId?: string;
      puuid?: string;
      preferredRole?: string;
      queue?: QueueFilter;
      matchCount?: number;
      dailyLpTarget?: number;
      dailyLpStop?: number;
      dailyLpTargetFlex?: number | null;
      dailyLpStopFlex?: number | null;
      /** If true, refresh analysis while saving. */
      analyze?: boolean;
    };

    const region = body.region ?? process.env.RIOT_DEFAULT_REGION ?? "br1";
    const queue = (body.queue ?? "ranked") as QueueFilter;
    const matchCount = clampMatchCount(body.matchCount, 200);
    const preferredRole = (body.preferredRole ?? "MIDDLE").toUpperCase();
    const dailyLpTarget = clampLpTarget(body.dailyLpTarget);
    const dailyLpStop = clampLpStop(body.dailyLpStop);
    const dailyLpTargetFlex =
      body.dailyLpTargetFlex == null
        ? null
        : clampLpTarget(body.dailyLpTargetFlex);
    const dailyLpStopFlex =
      body.dailyLpStopFlex == null ? null : clampLpStop(body.dailyLpStopFlex);

    if (!isPlatformRegion(region)) {
      return NextResponse.json({ error: "Região inválida" }, { status: 400 });
    }
    if (!VALID_ROLES.includes(preferredRole as RoleKey)) {
      return NextResponse.json({ error: "Lane inválida" }, { status: 400 });
    }

    let puuid = body.puuid ?? "";
    let profileResolved = null as Awaited<
      ReturnType<typeof resolveSummonerProfile>
    > | null;

    const shouldAnalyze = body.analyze !== false;

    if (!puuid) {
      const parsed = parseRiotId(body.riotId ?? "");
      if (!parsed) {
        return NextResponse.json(
          { error: "Informe riotId (Nome#TAG) ou puuid" },
          { status: 400 },
        );
      }
      profileResolved = await resolveSummonerProfile(
        region,
        parsed.gameName,
        parsed.tagLine,
        shouldAnalyze
          ? { forceRefresh: true, preferDb: false }
          : { preferDb: true },
      );
      puuid = profileResolved.puuid;
    }

    if (shouldAnalyze) {
      if (!profileResolved) {
        const parsed = parseRiotId(body.riotId ?? "");
        if (parsed) {
          profileResolved = await resolveSummonerProfile(
            region,
            parsed.gameName,
            parsed.tagLine,
            { forceRefresh: true, preferDb: false },
          );
          puuid = profileResolved.puuid;
        }
      }
      await analyzePlayer({
        platform: region,
        puuid,
        queue,
        count: matchCount,
        profile: profileResolved ?? undefined,
        forceRefresh: true,
        preferDb: false,
      });
    } else if (profileResolved) {
      await upsertPlayer({
        puuid: profileResolved.puuid,
        gameName: profileResolved.gameName,
        tagLine: profileResolved.tagLine,
        platform: profileResolved.platform,
        summoner: profileResolved.summoner,
        ranked: profileResolved.ranked,
      });
    }

    const player = await findPlayerByPuuid(puuid);
    if (!player) {
      return NextResponse.json(
        {
          error:
            "Jogador ainda não está no banco — abra o coach uma vez antes de salvar o perfil",
        },
        { status: 404 },
      );
    }

    const profile = await upsertAppProfile({
      playerId: player.id,
      preferredRole,
      queue,
      matchCount,
      dailyLpTarget,
      dailyLpStop,
      dailyLpTargetFlex,
      dailyLpStopFlex,
    });

    return NextResponse.json({ profile });
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
                ? "Rate limit da Riot"
                : error.message,
        },
        { status },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao salvar perfil" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    await clearAppProfile();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao remover perfil" },
      { status: 500 },
    );
  }
}

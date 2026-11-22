import { NextRequest, NextResponse } from "next/server";
import { getAppProfile, upsertAppProfile } from "@/lib/db/persist";
import type { QueueFilter } from "@/lib/riot/types";

const VALID: QueueFilter[] = ["solo", "flex", "ranked"];

/**
 * Troca rápida Solo / Flex / Ambas sem re-sync Riot.
 */
export async function POST(request: NextRequest) {
  try {
    const profile = await getAppProfile();
    if (!profile) {
      return NextResponse.json(
        { error: "Configure o perfil antes de escolher a fila" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as { queue?: string };
    const queue = (body.queue ?? "").toLowerCase() as QueueFilter;
    if (!VALID.includes(queue)) {
      return NextResponse.json(
        { error: "Fila inválida. Use solo, flex ou ranked." },
        { status: 400 },
      );
    }

    const updated = await upsertAppProfile({
      playerId: profile.playerId,
      queue,
      preferredRole: profile.preferredRole,
      matchCount: profile.matchCount,
      dailyLpTarget: profile.dailyLpTarget,
      dailyLpStop: profile.dailyLpStop,
    });

    return NextResponse.json({ profile: updated, queue });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao alterar fila de acompanhamento" },
      { status: 500 },
    );
  }
}

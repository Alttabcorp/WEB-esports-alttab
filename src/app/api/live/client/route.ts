import { NextRequest, NextResponse } from "next/server";
import {
  getLiveClientSnapshot,
  normalizeLiveClientPayload,
  setLiveClientSnapshot,
} from "@/lib/live/clientData";
import { getAppProfile } from "@/lib/db/persist";

function authorizeAgent(request: NextRequest): boolean {
  const expected = process.env.LIVE_AGENT_TOKEN;
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : request.headers.get("x-live-agent-token")?.trim() ?? "";
  return token.length > 0 && token === expected;
}

/** PC bridge → servidor: snapshot Live Client / LCU draft. */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.LIVE_AGENT_TOKEN) {
      return NextResponse.json(
        {
          error:
            "LIVE_AGENT_TOKEN não configurado no servidor (.env / .env.local)",
        },
        { status: 503 },
      );
    }
    if (!authorizeAgent(request)) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const body = (await request.json()) as {
      puuid?: string;
      phase?: string;
      inGame?: boolean;
      raw?: unknown;
      draft?: unknown;
    };

    const profile = await getAppProfile();
    const puuid = body.puuid || profile?.puuid;
    if (!puuid) {
      return NextResponse.json(
        {
          error:
            "Informe puuid no agente ou configure o perfil no League Persua",
        },
        { status: 400 },
      );
    }

    const snapshot = normalizeLiveClientPayload({
      puuid,
      phase: body.phase,
      inGame: body.inGame === true,
      raw: body.raw,
      draft: body.draft,
    });

    await setLiveClientSnapshot(puuid, snapshot);
    return NextResponse.json({
      ok: true,
      phase: snapshot.phase,
      inGame: snapshot.inGame,
      receivedAt: snapshot.receivedAt,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao gravar Live Client Data" },
      { status: 500 },
    );
  }
}

/** Coach lê o último snapshot do bridge. */
export async function GET(request: NextRequest) {
  try {
    const puuidParam = request.nextUrl.searchParams.get("puuid");
    const profile = await getAppProfile();
    const puuid = puuidParam || profile?.puuid;
    if (!puuid) {
      return NextResponse.json({ snapshot: null, bridgeOnline: false });
    }
    const snapshot = await getLiveClientSnapshot(puuid);
    return NextResponse.json({
      snapshot,
      bridgeOnline: Boolean(snapshot?.bridgeOnline),
      phase: snapshot?.phase ?? null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao ler Live Client Data" },
      { status: 500 },
    );
  }
}

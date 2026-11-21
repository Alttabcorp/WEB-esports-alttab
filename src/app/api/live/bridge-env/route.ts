import { NextRequest, NextResponse } from "next/server";
import { getAppProfile } from "@/lib/db/persist";

/** .env pronto para o bridge no PC de jogo (LAN). */
export async function GET(request: NextRequest) {
  const token = process.env.LIVE_AGENT_TOKEN ?? "";
  if (!token) {
    return NextResponse.json(
      { error: "LIVE_AGENT_TOKEN não configurado no servidor" },
      { status: 503 },
    );
  }

  const profile = await getAppProfile();
  const urlParam = request.nextUrl.searchParams.get("url")?.replace(/\/$/, "");
  const forwarded =
    request.headers.get("x-forwarded-proto") &&
    request.headers.get("x-forwarded-host")
      ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("x-forwarded-host")}`
      : null;
  const host = request.headers.get("host");
  const fromHost = host ? `http://${host}` : null;
  const persuaUrl = (urlParam || forwarded || fromHost || "http://127.0.0.1:3001").replace(
    /\/$/,
    "",
  );

  const lines = [
    `PERSUA_URL=${persuaUrl}`,
    `LIVE_AGENT_TOKEN=${token}`,
    profile?.puuid
      ? `PROFILE_PUUID=${profile.puuid}`
      : "# PROFILE_PUUID=",
    "POLL_INGAME_MS=2000",
    "POLL_DRAFT_MS=1500",
    "POLL_IDLE_MS=8000",
    "",
  ];

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="league-persua-bridge.env"',
      "Cache-Control": "no-store",
    },
  });
}

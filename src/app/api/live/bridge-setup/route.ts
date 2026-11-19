import { NextResponse } from "next/server";
import { getAppProfile } from "@/lib/db/persist";

/** Dados para configurar o bridge no PC de jogo (servidor pessoal). */
export async function GET() {
  const token = process.env.LIVE_AGENT_TOKEN ?? "";
  const profile = await getAppProfile();

  return NextResponse.json({
    configured: Boolean(token),
    token: token || null,
    puuid: profile?.puuid ?? null,
    riotId: profile
      ? `${profile.gameName}#${profile.tagLine}`
      : null,
    pollInGameMs: 2000,
    pollIdleMs: 8000,
    hint: token
      ? "Copie o token e a URL do servidor para o .env do bridge no PC de jogo."
      : "Defina LIVE_AGENT_TOKEN no .env do servidor e reinicie o container.",
  });
}

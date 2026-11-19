"use client";

import { useEffect, useState, useTransition } from "react";

type Setup = {
  configured: boolean;
  token: string | null;
  puuid: string | null;
  riotId: string | null;
  hint: string;
};

export function BridgeSetupPanel() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setServerUrl(window.location.origin);
    }
    startTransition(async () => {
      const res = await fetch("/api/live/bridge-setup");
      const data = (await res.json()) as Setup;
      setSetup(data);
    });
  }, []);

  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 2000);
  }

  function downloadEnv() {
    if (!setup?.token) return;
    const body = [
      `PERSUA_URL=${serverUrl.replace(/\/$/, "")}`,
      `LIVE_AGENT_TOKEN=${setup.token}`,
      setup.puuid ? `PROFILE_PUUID=${setup.puuid}` : "# PROFILE_PUUID=",
      "POLL_INGAME_MS=2000",
      "POLL_IDLE_MS=8000",
      "",
    ].join("\n");
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "league-persua-bridge.env";
    a.click();
    URL.revokeObjectURL(url);
  }

  const envPreview = setup?.token
    ? [
        `PERSUA_URL=${serverUrl.replace(/\/$/, "") || "http://IP-DO-SERVIDOR:3001"}`,
        `LIVE_AGENT_TOKEN=${setup.token}`,
        setup.puuid ? `PROFILE_PUUID=${setup.puuid}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <section className="panel w-full space-y-4 p-5">
      <div>
        <h3 className="text-base font-semibold text-white">
          Setup do agente Windows
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Roda no PC de jogo e envia Live Client Data (KDA, CS, ouro, itens) para
          este servidor.
        </p>
      </div>

      {pending && !setup ? (
        <p className="text-sm text-[var(--alttab-soft)]">Carregando…</p>
      ) : null}

      {setup && !setup.configured ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {setup.hint}
        </p>
      ) : null}

      {setup?.configured ? (
        <>
          <div>
            <label className="mb-1 block text-sm text-zinc-300">
              URL do servidor (do PC de jogo)
            </label>
            <div className="flex gap-2">
              <input
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#0596aa]/40"
                placeholder="http://192.168.x.x:3001"
              />
              <button
                type="button"
                onClick={() => copy(serverUrl, "url")}
                className="rounded-xl border border-white/15 px-3 text-sm text-zinc-300 hover:text-white"
              >
                {copied === "url" ? "OK" : "Copiar"}
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-600">
              Use o IP da sua infra na LAN, não localhost (localhost no PC de
              jogo é o próprio PC).
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-300">
              LIVE_AGENT_TOKEN
            </label>
            <div className="flex gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-xs text-[#7dd3de]">
                {setup.token}
              </code>
              <button
                type="button"
                onClick={() => setup.token && copy(setup.token, "token")}
                className="rounded-xl border border-white/15 px-3 text-sm text-zinc-300 hover:text-white"
              >
                {copied === "token" ? "OK" : "Copiar"}
              </button>
            </div>
          </div>

          {setup.puuid ? (
            <p className="text-xs text-zinc-500">
              Perfil: {setup.riotId} · PUUID já entra no .env baixado
            </p>
          ) : (
            <p className="text-xs text-amber-300/90">
              Salve o perfil antes — o bridge usa o PUUID do invocador.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadEnv}
              className="rounded-xl bg-[#0596aa] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#047a8a]"
            >
              Baixar .env do bridge
            </button>
            <button
              type="button"
              onClick={() => copy(envPreview, "env")}
              className="rounded-xl border border-[#0596aa]/40 bg-[#0596aa]/10 px-4 py-2.5 text-sm font-semibold text-[#7dd3de]"
            >
              {copied === "env" ? "Copiado" : "Copiar .env"}
            </button>
          </div>

          <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-400">
            <li>
              No PC de jogo: copie a pasta{" "}
              <code className="text-zinc-300">agents/live-bridge</code> do
              projeto (ou clone o repo).
            </li>
            <li>
              Instale{" "}
              <a
                href="https://nodejs.org/"
                target="_blank"
                rel="noreferrer"
                className="text-[#7dd3de] hover:underline"
              >
                Node.js LTS
              </a>{" "}
              (só uma vez).
            </li>
            <li>
              Coloque o arquivo baixado como{" "}
              <code className="text-zinc-300">.env</code> dentro de{" "}
              <code className="text-zinc-300">live-bridge</code> (renomeie
              se vier como{" "}
              <code className="text-zinc-300">league-persua-bridge.env</code>
              ).
            </li>
            <li>
              Dê dois cliques em{" "}
              <code className="text-zinc-300">Iniciar-Bridge.bat</code> e
              deixe a janela aberta enquanto joga.
            </li>
          </ol>
        </>
      ) : null}
    </section>
  );
}

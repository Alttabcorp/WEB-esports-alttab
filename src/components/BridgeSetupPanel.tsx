"use client";

import { useEffect, useState, useTransition } from "react";
import { buildBridgeBootstrapBat } from "@/lib/live/bridgeBootstrap";
import { Button, Panel } from "@/components/ui";

type Setup = {
  configured: boolean;
  token: string | null;
  puuid: string | null;
  riotId: string | null;
  hint: string;
};

function downloadText(filename: string, body: string, type = "text/plain") {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STEPS = [
  {
    n: "1",
    title: "Node no PC do LoL",
    body: "Instale Node.js LTS uma vez (Add to PATH).",
  },
  {
    n: "2",
    title: "Baixe o bootstrap",
    body: "Atualizar-e-Iniciar.bat — dois cliques, sem admin.",
  },
  {
    n: "3",
    title: "Abra o Coach",
    body: "No 2º monitor: /coach. Bridge sobe e atualiza sozinho.",
  },
];

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
    const base = serverUrl.replace(/\/$/, "");
    const body = [
      `PERSUA_URL=${base}`,
      `LIVE_AGENT_TOKEN=${setup.token}`,
      setup.puuid ? `PROFILE_PUUID=${setup.puuid}` : "# PROFILE_PUUID=",
      "POLL_INGAME_MS=2000",
      "POLL_DRAFT_MS=1500",
      "POLL_IDLE_MS=8000",
      "",
    ].join("\n");
    downloadText("league-persua-bridge.env", body);
  }

  function downloadBootstrap() {
    const bat = buildBridgeBootstrapBat(serverUrl);
    downloadText("Atualizar-e-Iniciar.bat", bat, "application/octet-stream");
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
    <Panel className="w-full space-y-5 p-5">
      <div>
        <h3 className="type-title text-base">Setup do agente Windows</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Roda no PC de jogo: baixa o bridge deste servidor, atualiza sozinho e
          envia draft + Live Client para o Persua.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-3"
          >
            <p className="text-xs tracking-wide text-[var(--alttab-soft)]">
              PASSO {s.n}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{s.title}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{s.body}</p>
          </li>
        ))}
      </ol>

      {pending && !setup ? (
        <p className="text-sm text-[var(--alttab-soft)]">Carregando…</p>
      ) : null}

      {setup && !setup.configured ? (
        <p className="rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-[var(--warn)]">
          {setup.hint}
        </p>
      ) : null}

      {setup?.configured ? (
        <>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted-strong)]">
              URL do servidor (do PC de jogo)
            </label>
            <div className="flex gap-2">
              <input
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="min-w-0 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                placeholder="http://192.168.x.x:3001"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copy(serverUrl, "url")}
              >
                {copied === "url" ? "OK" : "Copiar"}
              </Button>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Use o IP da LAN (ex. 192.168.18.45), não localhost.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-[var(--muted-strong)]">
              LIVE_AGENT_TOKEN
            </label>
            <div className="flex gap-2">
              <code className="min-w-0 flex-1 truncate rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-mono text-xs text-[var(--alttab-soft)]">
                {setup.token}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setup.token && copy(setup.token, "token")}
              >
                {copied === "token" ? "OK" : "Copiar"}
              </Button>
            </div>
          </div>

          {setup.puuid ? (
            <p className="text-xs text-[var(--muted)]">
              Perfil: {setup.riotId} · PUUID já entra no .env automático
            </p>
          ) : (
            <p className="text-xs text-amber-300/90">
              Salve o perfil antes — o bridge usa o PUUID do invocador.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={downloadBootstrap}>
              Baixar Atualizar-e-Iniciar.bat
            </Button>
            <Button type="button" variant="secondary" onClick={downloadEnv}>
              Baixar só .env
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => copy(envPreview, "env")}
            >
              {copied === "env" ? "Copiado" : "Copiar .env"}
            </Button>
            <Button href="/coach" variant="secondary">
              Abrir Coach
            </Button>
          </div>

          <p className="text-xs text-[var(--muted)]">
            Node LTS:{" "}
            <a
              href="https://nodejs.org/"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--alttab-soft)] hover:underline"
            >
              nodejs.org
            </a>
            . Arquivos em %LOCALAPPDATA%\LeaguePersua.
          </p>
        </>
      ) : null}
    </Panel>
  );
}

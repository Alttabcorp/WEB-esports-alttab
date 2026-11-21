"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { championIconUrl, itemIconUrl } from "@/lib/ddragon";
import type { RuneCatalog } from "@/lib/ddragon";
import { pct } from "@/lib/format";
import type { LiveClientSnapshot } from "@/lib/live/clientData";
import type { LiveGamePayload } from "@/lib/live/coach";
import type { SessionAdvice } from "@/lib/live/sessionAdvice";
import { RunePageIcons } from "./RunePageIcons";
import { SessionAdviceAlert } from "./SessionAdviceAlert";
import { Button, EmptyState, Panel, Stat } from "@/components/ui";

type Props = {
  platform: string;
  puuid: string;
  ddragonVersion: string;
  idToKey: Record<number, string>;
  runeCatalog: RuneCatalog;
  active?: boolean;
  draftHref?: string;
  onInGameChange?: (inGame: boolean) => void;
};

export function LiveGamePanel({
  platform,
  puuid,
  ddragonVersion,
  idToKey,
  runeCatalog,
  active = true,
  draftHref,
  onInGameChange,
}: Props) {
  const [live, setLive] = useState<LiveGamePayload | null>(null);
  const [lcd, setLcd] = useState<LiveClientSnapshot | null>(null);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [advice, setAdvice] = useState<SessionAdvice | null>(null);
  const [advicePending, setAdvicePending] = useState(false);
  const wasInGame = useRef(false);
  const adviceRequestedForEnd = useRef(false);

  const fetchAdvice = useCallback(async () => {
    setAdvicePending(true);
    try {
      const res = await fetch(
        `/api/live/session-advice?region=${encodeURIComponent(platform)}&puuid=${encodeURIComponent(puuid)}&phase=postGame`,
      );
      const data = (await res.json()) as {
        error?: string;
        advice?: SessionAdvice;
      };
      if (res.ok && data.advice) setAdvice(data.advice);
    } catch {
      // best-effort
    } finally {
      setAdvicePending(false);
    }
  }, [platform, puuid]);

  const onGamePresence = useCallback(
    (inGame: boolean) => {
      onInGameChange?.(inGame);
      if (wasInGame.current && !inGame && !adviceRequestedForEnd.current) {
        adviceRequestedForEnd.current = true;
        void fetchAdvice();
      }
      if (inGame) adviceRequestedForEnd.current = false;
      wasInGame.current = inGame;
    },
    [fetchAdvice, onInGameChange],
  );

  const refreshSpectator = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/live/game?region=${encodeURIComponent(platform)}&puuid=${encodeURIComponent(puuid)}`,
        );
        const data = (await res.json()) as {
          error?: string;
          live?: LiveGamePayload;
        };
        if (!res.ok) {
          setError(data.error ?? "Falha Spectator");
          return;
        }
        setError(null);
        const next = data.live ?? null;
        setLive(next);
        if (!lcd?.inGame) onGamePresence(next?.inGame === true);
      } catch {
        setError("Erro de rede (Spectator)");
      }
    });
  }, [platform, puuid, lcd?.inGame, onGamePresence]);

  const refreshLcd = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/live/client?puuid=${encodeURIComponent(puuid)}`,
      );
      const data = (await res.json()) as {
        snapshot?: LiveClientSnapshot | null;
        bridgeOnline?: boolean;
      };
      const snap = data.snapshot ?? null;
      setLcd(snap);
      setBridgeOnline(Boolean(data.bridgeOnline && snap));
      if (snap) onGamePresence(snap.inGame);
    } catch {
      setBridgeOnline(false);
    }
  }, [puuid, onGamePresence]);

  // Presence watch even when tab hidden (slower)
  useEffect(() => {
    void refreshLcd();
    const lcdMs = active ? 2000 : 8000;
    const specMs = active ? 20_000 : 45_000;
    if (active) refreshSpectator();
    const lcdId = window.setInterval(() => void refreshLcd(), lcdMs);
    const specId = window.setInterval(refreshSpectator, specMs);
    return () => {
      window.clearInterval(lcdId);
      window.clearInterval(specId);
    };
  }, [active, refreshLcd, refreshSpectator]);

  const champName = (id: number) => idToKey[id] ?? String(id);
  const usingLcd = Boolean(lcd?.inGame && lcd.me);
  const inGame = usingLcd || live?.inGame === true;
  const tips = live?.tips ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${
            bridgeOnline
              ? "bg-[var(--success)]/15 text-[var(--success)]"
              : "bg-[var(--surface-2)] text-[var(--muted)]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              bridgeOnline ? "bg-[var(--success)]" : "bg-[var(--muted)]"
            }`}
          />
          Bridge {bridgeOnline ? "online" : "offline"}
        </span>
        <span className="text-[var(--muted)]">
          {usingLcd ? "Live Client" : "Spectator Riot"}
        </span>
      </div>

      {advice ? (
        <SessionAdviceAlert
          advice={advice}
          onDismiss={() => setAdvice(null)}
          onRefresh={() => void fetchAdvice()}
        />
      ) : null}

      {advicePending && !advice ? (
        <p className="text-sm text-[var(--alttab-soft)]">
          Partida encerrada — avaliando se vale continuar…
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">
          {usingLcd ? "Atualização ~2s" : "Spectator ~20s"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchAdvice()}
            disabled={advicePending}
          >
            Conselho de sessão
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void refreshLcd();
              refreshSpectator();
            }}
            disabled={pending}
          >
            {pending ? "Consultando…" : "Atualizar"}
          </Button>
        </div>
      </div>

      {error && !usingLcd ? (
        <p className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      {!inGame ? (
        <EmptyState
          title="Fora de partida"
          description={
            bridgeOnline
              ? "Bridge online. Prefira /coach no 2º monitor — draft e build mudam sozinhos."
              : "Rode o bridge no PC de jogo (Config) para itens e KDA em tempo real. Sem bridge, usamos Spectator."
          }
          action={
            <div className="flex flex-wrap gap-2">
              <Button href="/coach">Abrir coach</Button>
              {draftHref ? (
                <Button href={draftHref} variant="secondary">
                  Seleção manual
                </Button>
              ) : null}
              <Button variant="ghost" href="/config">
                Configurar bridge
              </Button>
              <Button variant="secondary" onClick={() => void fetchAdvice()}>
                Ver se continuo jogando
              </Button>
            </div>
          }
        />
      ) : null}

      {inGame ? (
        <div className="space-y-4">
          {/* Hero: build / items */}
          <Panel strong className="space-y-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="data-label">Prioridade agora</p>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Build e itens
                </h3>
              </div>
              {usingLcd && lcd?.me?.championName ? (
                <div className="flex items-center gap-2">
                  <Image
                    src={championIconUrl(ddragonVersion, lcd.me.championName)}
                    alt={lcd.me.championName}
                    width={44}
                    height={44}
                    className="rounded-lg ring-1 ring-[var(--border-strong)]"
                  />
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">
                      {lcd.me.championName}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {lcd.game
                        ? `${Math.floor(lcd.game.gameTime / 60)}:${String(
                            Math.floor(lcd.game.gameTime % 60),
                          ).padStart(2, "0")}`
                        : "Em jogo"}
                    </p>
                  </div>
                </div>
              ) : live?.me ? (
                <div className="flex items-center gap-2">
                  <Image
                    src={championIconUrl(
                      ddragonVersion,
                      champName(live.me.championId),
                    )}
                    alt=""
                    width={44}
                    height={44}
                    className="rounded-lg ring-1 ring-[var(--border-strong)]"
                  />
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">
                      {champName(live.me.championId)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {live.game
                        ? `${Math.floor(live.game.gameLength / 60)}:${String(
                            live.game.gameLength % 60,
                          ).padStart(2, "0")}`
                        : "Spectator"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {tips?.topBuild ? (
              <div>
                <p className="data-label mb-2">
                  Compre nesta ordem · {pct(tips.topBuild.wr)} WR (
                  {tips.topBuild.games} jogos)
                </p>
                {(() => {
                  const ownedIds = new Set(
                    (usingLcd ? lcd?.me?.items ?? [] : []).map((it) => it.itemID),
                  );
                  const nextIdx = tips.topBuild.items.findIndex(
                    (id) => !ownedIds.has(id),
                  );
                  const nextId =
                    nextIdx >= 0 ? tips.topBuild.items[nextIdx] : null;
                  return (
                    <>
                      {nextId != null && usingLcd ? (
                        <div className="mb-3 flex items-center gap-3 rounded-lg border border-[var(--alttab)]/40 bg-[var(--alttab)]/10 px-3 py-2">
                          <Image
                            src={itemIconUrl(ddragonVersion, nextId)}
                            alt=""
                            width={40}
                            height={40}
                            className="rounded-md ring-1 ring-[var(--alttab)]"
                          />
                          <div>
                            <p className="text-xs text-[var(--alttab-soft)]">
                              Próximo item
                            </p>
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                              Slot {nextIdx + 1} da build
                              {lcd?.me
                                ? ` · ${Math.round(lcd.me.currentGold)} ouro`
                                : ""}
                            </p>
                          </div>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {tips.topBuild.items.map((id, idx) => {
                          const owned = ownedIds.has(id);
                          const isNext = idx === nextIdx;
                          return (
                            <div
                              key={`hero-build-${id}-${idx}`}
                              className="relative"
                            >
                              <Image
                                src={itemIconUrl(ddragonVersion, id)}
                                alt=""
                                width={48}
                                height={48}
                                className={`rounded-lg ring-1 ${
                                  owned
                                    ? "ring-[var(--success)] opacity-100"
                                    : isNext
                                      ? "ring-[var(--alttab)] opacity-100"
                                      : "ring-white/15 opacity-80"
                                }`}
                              />
                              <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded bg-[var(--foreground)] text-[10px] font-bold text-white">
                                {idx + 1}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Sem build recorrente salva para este campeão ainda.
              </p>
            )}

            {usingLcd && lcd?.me ? (
              <div>
                <p className="data-label mb-2">Itens agora</p>
                {lcd.me.items.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {lcd.me.items.map((it) => (
                      <Image
                        key={`lcd-item-${it.itemID}-${it.slot ?? 0}`}
                        src={itemIconUrl(ddragonVersion, it.itemID)}
                        alt={it.displayName ?? ""}
                        width={36}
                        height={36}
                        className="rounded-md ring-1 ring-[var(--border)]"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">Nenhum item ainda.</p>
                )}
              </div>
            ) : null}

            {tips?.topRune ? (
              <div>
                <p className="data-label mb-2">Runas de referência</p>
                <RunePageIcons
                  primaryStyle={tips.topRune.primaryStyle}
                  subStyle={tips.topRune.subStyle}
                  keystone={tips.topRune.keystone}
                  primaryPerkIds={tips.topRune.primaryPerkIds}
                  subPerkIds={tips.topRune.subPerkIds}
                  perkIds={tips.topRune.perkIds}
                  runeCatalog={runeCatalog}
                  size="sm"
                  showLabels={false}
                />
              </div>
            ) : null}

            {tips?.matchup ? (
              <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted-strong)]">
                Vs {champName(tips.matchup.enemyChampionId)}:{" "}
                <span className="tabular font-semibold text-[var(--foreground)]">
                  {pct(tips.matchup.wr)}
                </span>{" "}
                em {tips.matchup.games} jogos
              </p>
            ) : null}

            {tips?.notes.map((n) => (
              <p
                key={n}
                className="rounded-lg border border-[var(--warn)]/25 bg-[var(--warn)]/10 px-3 py-2 text-sm text-[var(--warn)]"
              >
                {n}
              </p>
            ))}
          </Panel>

          {/* Secondary: combat stats */}
          {usingLcd && lcd?.me ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="KDA"
                value={`${lcd.me.kills}/${lcd.me.deaths}/${lcd.me.assists}`}
              />
              <Stat label="CS" value={String(lcd.me.creepScore)} />
              <Stat
                label="Ouro"
                value={Math.round(lcd.me.currentGold).toLocaleString("pt-BR")}
              />
              <Stat
                label="HP"
                value={`${Math.round(lcd.me.currentHealth)}/${Math.round(lcd.me.maxHealth)}`}
              />
            </div>
          ) : null}

          {usingLcd && lcd ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <PlayerList
                title="Seu time"
                players={lcd.players.filter(
                  (p) =>
                    p.team ===
                    (lcd.players.find((x) => x.isMe)?.team ?? "ORDER"),
                )}
                ddragonVersion={ddragonVersion}
              />
              <PlayerList
                title="Inimigos"
                players={lcd.players.filter(
                  (p) =>
                    p.team !==
                    (lcd.players.find((x) => x.isMe)?.team ?? "ORDER"),
                )}
                ddragonVersion={ddragonVersion}
              />
            </div>
          ) : null}

          {!usingLcd && live?.inGame && live.me ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <TeamStrip
                title="Seu time"
                ids={[
                  live.me.championId,
                  ...live.allies.map((a) => a.championId),
                ]}
                meId={live.me.championId}
                ddragonVersion={ddragonVersion}
                idToKey={idToKey}
                accent="blue"
              />
              <TeamStrip
                title="Inimigos"
                ids={live.enemies.map((e) => e.championId)}
                ddragonVersion={ddragonVersion}
                idToKey={idToKey}
                accent="red"
              />
            </div>
          ) : null}

          {tips && tips.personalGames > 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Histórico com este champ:{" "}
              <span className="tabular text-[var(--foreground)]">
                {pct(tips.personalWr)} WR · {tips.personalGames} jogos
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PlayerList({
  title,
  players,
  ddragonVersion,
}: {
  title: string;
  players: LiveClientSnapshot["players"];
  ddragonVersion: string;
}) {
  return (
    <Panel className="p-3">
      <p className="data-label mb-2">{title}</p>
      <ul className="space-y-1.5">
        {players.map((p) => (
          <li
            key={`${p.riotId}-${p.championName}`}
            className={`flex items-center gap-2 text-sm ${
              p.isMe ? "text-[var(--foreground)]" : "text-[var(--muted)]"
            }`}
          >
            {p.championName ? (
              <Image
                src={championIconUrl(ddragonVersion, p.championName)}
                alt=""
                width={24}
                height={24}
                className={`rounded ${p.isMe ? "ring-1 ring-[var(--alttab)]" : ""}`}
              />
            ) : null}
            <span className="min-w-0 flex-1 truncate">
              {p.championName}
              {p.isMe ? " · você" : ""}
            </span>
            <span className="tabular text-xs">
              {p.kills}/{p.deaths}/{p.assists} · {p.creepScore} CS
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function TeamStrip({
  title,
  ids,
  meId,
  ddragonVersion,
  idToKey,
  accent,
}: {
  title: string;
  ids: number[];
  meId?: number;
  ddragonVersion: string;
  idToKey: Record<number, string>;
  accent: "blue" | "red";
}) {
  return (
    <Panel className="p-3">
      <p className="data-label mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id, i) => (
          <Image
            key={`${title}-${id}-${i}`}
            src={championIconUrl(ddragonVersion, idToKey[id] ?? String(id))}
            alt=""
            width={36}
            height={36}
            className={`rounded-md ${
              meId === id
                ? "ring-2 ring-[var(--alttab)]"
                : accent === "red"
                  ? "ring-1 ring-[var(--team-red)]/35"
                  : "ring-1 ring-[var(--team-blue)]/35"
            }`}
          />
        ))}
      </div>
    </Panel>
  );
}

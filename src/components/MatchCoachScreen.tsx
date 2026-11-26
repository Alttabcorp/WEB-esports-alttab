"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  itemIconUrl,
  resolveChampionKey,
  type ItemCatalogEntry,
  type RuneCatalog,
} from "@/lib/ddragon";
import { pct } from "@/lib/format";
import type { AdaptTips } from "@/lib/live/coach";
import type { LiveClientSnapshot, LivePhase } from "@/lib/live/clientData";
import type { LiveGamePayload } from "@/lib/live/coach";
import type { SavedChampionBuildView } from "@/lib/db/persist";
import {
  resolveDynamicBuild,
  savedBuildToCandidate,
  toBuildCandidate,
} from "@/lib/live/dynamicBuild";
import { adaptBuildOrder } from "@/lib/live/itemAdapt";
import { buildInGameDecision } from "@/lib/live/lcdSignals";
import type { SessionAdvice } from "@/lib/live/sessionAdvice";
import type { DraftRecommendation } from "@/lib/stats/draft";
import { evaluateDodgeAdvice } from "@/lib/stats/dodgeEv";
import { ROLE_LABELS, type RoleKey } from "@/lib/stats/roles";
import { toDecisionFromSessionAdvice } from "@/lib/alerts/decision";
import { ChampionIcon } from "./ChampionIcon";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { DecisionCard } from "./DecisionCard";
import { RunePageIcons } from "./RunePageIcons";
import { SessionAdviceAlert } from "./SessionAdviceAlert";
import { Button, EmptyState, Stat } from "@/components/ui";

type Props = {
  platform: string;
  puuid: string;
  riotId: string;
  queue: string;
  matchCount: number;
  preferredRole: RoleKey;
  ddragonVersion: string;
  idToKey: Record<number, string>;
  keyToId: Record<string, number>;
  runeCatalog: RuneCatalog;
  /** Catálogo DDragon (tags) para reordenação leve de itens. */
  itemCatalog?: ItemCatalogEntry[];
  draftHref: string;
  prepHref?: string;
  timingHref?: string;
};

type UiPhase = LivePhase | "postGame";

const PHASES: { id: UiPhase; label: string }[] = [
  { id: "idle", label: "Fila" },
  { id: "draft", label: "Seleção" },
  { id: "loading", label: "Loading" },
  { id: "inGame", label: "Partida" },
  { id: "postGame", label: "Pós" },
];

function boardSignature(snap: LiveClientSnapshot | null): string {
  const d = snap?.draft;
  if (!d) return "";
  return [
    d.myChampionId ?? 0,
    d.myPosition ?? "",
    d.allies.map((a) => a.championId).join(","),
    d.enemies.map((e) => e.championId).join(","),
    d.bans.join(","),
  ].join("|");
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function phaseHeadline(phase: UiPhase): string {
  switch (phase) {
    case "draft":
      return "Seleção";
    case "loading":
      return "Carregando";
    case "inGame":
      return "Em partida";
    case "postGame":
      return "Pós-partida";
    default:
      return "Aguardando";
  }
}

function ItemRow({
  items,
  ddragonVersion,
  label,
  wr,
  games,
}: {
  items: number[];
  ddragonVersion: string;
  label: string;
  wr?: number;
  games?: number;
}) {
  return (
    <div>
      <p className="data-label mb-2">
        {label}
        {wr != null && games != null
          ? ` · ${pct(wr)} WR (${games})`
          : null}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((id, idx) => (
          <Image
            key={`${label}-${id}-${idx}`}
            src={itemIconUrl(ddragonVersion, id)}
            alt=""
            width={40}
            height={40}
            className="rounded-[var(--radius)] ring-1 ring-white/15"
          />
        ))}
      </div>
    </div>
  );
}

export function MatchCoachScreen({
  platform,
  puuid,
  riotId,
  queue,
  matchCount,
  preferredRole,
  ddragonVersion,
  idToKey,
  keyToId,
  runeCatalog,
  itemCatalog = [],
  draftHref,
  prepHref = "/",
  timingHref,
}: Props) {
  const whenHref = timingHref ?? "/analise?tab=quando";
  const [lcd, setLcd] = useState<LiveClientSnapshot | null>(null);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [live, setLive] = useState<LiveGamePayload | null>(null);
  const [recs, setRecs] = useState<DraftRecommendation[]>([]);
  const [recsPending, setRecsPending] = useState(false);
  const [advice, setAdvice] = useState<SessionAdvice | null>(null);
  const [idleAdvice, setIdleAdvice] = useState<SessionAdvice | null>(null);
  const [adapt, setAdapt] = useState<AdaptTips | null>(null);
  const [savedBuilds, setSavedBuilds] = useState<SavedChampionBuildView[]>([]);
  const [uiPhase, setUiPhase] = useState<UiPhase>("idle");
  const wasInGame = useRef(false);
  const adviceForEnd = useRef(false);
  const lastBoard = useRef("");
  const lastAdaptKey = useRef("");
  const lastSavedChamp = useRef(0);

  const champName = useCallback(
    (id: number) =>
      resolveChampionKey({ championId: id }, { idToKey, keyToId }) ??
      idToKey[id] ??
      "",
    [idToKey, keyToId],
  );

  const champIdFromName = useCallback(
    (name: string) => {
      const key = resolveChampionKey(
        { nameOrKey: name },
        { idToKey, keyToId },
      );
      if (key && keyToId[key] != null) return keyToId[key];
      return keyToId[name] ?? 0;
    },
    [idToKey, keyToId],
  );

  const fetchAdvice = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/live/session-advice?region=${encodeURIComponent(platform)}&puuid=${encodeURIComponent(puuid)}&phase=postGame`,
      );
      const data = (await res.json()) as { advice?: SessionAdvice };
      if (res.ok && data.advice) setAdvice(data.advice);
    } catch {
      // best-effort
    }
  }, [platform, puuid]);

  const fetchIdleAdvice = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/live/session-advice?region=${encodeURIComponent(platform)}&puuid=${encodeURIComponent(puuid)}&phase=preQueue`,
      );
      const data = (await res.json()) as { advice?: SessionAdvice };
      if (res.ok && data.advice) setIdleAdvice(data.advice);
    } catch {
      // best-effort
    }
  }, [platform, puuid]);

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
    } catch {
      setBridgeOnline(false);
    }
  }, [puuid]);

  const refreshSpectator = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/live/game?region=${encodeURIComponent(platform)}&puuid=${encodeURIComponent(puuid)}`,
      );
      const data = (await res.json()) as { live?: LiveGamePayload };
      if (res.ok) setLive(data.live ?? null);
    } catch {
      // ignore
    }
  }, [platform, puuid]);

  const fetchDraftRecs = useCallback(
    async (snap: LiveClientSnapshot) => {
      const d = snap.draft;
      if (!d) return;
      const role = (d.myPosition || preferredRole) as RoleKey;
      const validRole = (
        ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"] as RoleKey[]
      ).includes(role)
        ? role
        : preferredRole;

      setRecsPending(true);
      try {
        const res = await fetch("/api/draft/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            region: platform,
            riotId,
            puuid,
            role: validRole,
            enemyChampionIds: d.enemies.map((e) => e.championId),
            allyChampionIds: d.allies
              .filter((a) => !a.isMe)
              .map((a) => a.championId),
            bannedChampionIds: d.bans,
            queue,
            count: matchCount,
          }),
        });
        const data = (await res.json()) as {
          draft?: { recommendations: DraftRecommendation[] };
        };
        if (res.ok && data.draft?.recommendations) {
          setRecs(data.draft.recommendations.slice(0, 5));
        }
      } catch {
        // ignore
      } finally {
        setRecsPending(false);
      }
    },
    [platform, riotId, puuid, preferredRole, queue, matchCount],
  );

  const fetchAdapt = useCallback(
    async (
      myChampionId: number,
      enemyLanerId: number | null,
      enemyChampionIds: number[],
    ) => {
      const key = `${myChampionId}|${enemyLanerId ?? 0}|${enemyChampionIds.join(",")}`;
      if (key === lastAdaptKey.current) return;
      lastAdaptKey.current = key;
      try {
        const res = await fetch("/api/live/adapt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            puuid,
            myChampionId,
            enemyLanerId,
            enemyChampionIds,
          }),
        });
        const data = (await res.json()) as { adapt?: AdaptTips };
        if (res.ok && data.adapt) setAdapt(data.adapt);
      } catch {
        // ignore
      }
    },
    [puuid],
  );

  useEffect(() => {
    const phase = lcd?.phase ?? "idle";
    const inGame = Boolean(lcd?.inGame && lcd.me);

    if (inGame || phase === "inGame") {
      wasInGame.current = true;
      adviceForEnd.current = false;
      setUiPhase("inGame");
      return;
    }
    if (phase === "draft") {
      setUiPhase("draft");
      return;
    }
    if (phase === "loading") {
      setUiPhase("loading");
      return;
    }
    if (wasInGame.current) {
      if (!adviceForEnd.current) {
        adviceForEnd.current = true;
        void fetchAdvice();
      }
      setUiPhase("postGame");
      return;
    }
    setUiPhase("idle");
  }, [lcd, fetchAdvice]);

  useEffect(() => {
    void refreshLcd();
    void refreshSpectator();
    void fetchIdleAdvice();
    const lcdId = window.setInterval(() => void refreshLcd(), 1500);
    const specId = window.setInterval(() => void refreshSpectator(), 20_000);
    const adviceId = window.setInterval(() => void fetchIdleAdvice(), 45_000);
    return () => {
      window.clearInterval(lcdId);
      window.clearInterval(specId);
      window.clearInterval(adviceId);
    };
  }, [refreshLcd, refreshSpectator, fetchIdleAdvice]);

  useEffect(() => {
    if (uiPhase !== "draft" || !lcd?.draft) return;
    const sig = boardSignature(lcd);
    if (!sig || sig === lastBoard.current) return;
    lastBoard.current = sig;
    const t = window.setTimeout(() => void fetchDraftRecs(lcd), 800);
    return () => window.clearTimeout(t);
  }, [uiPhase, lcd, fetchDraftRecs]);

  const tips = live?.tips ?? null;
  const me = lcd?.me;
  const myChampKey = me?.championName || "";
  const myChampionId = useMemo(() => {
    if (myChampKey) return champIdFromName(myChampKey);
    return lcd?.draft?.myChampionId ?? live?.me?.championId ?? 0;
  }, [myChampKey, champIdFromName, lcd?.draft?.myChampionId, live?.me?.championId]);

  const ownedIds = useMemo(
    () => new Set((me?.items ?? []).map((it) => it.itemID)),
    [me?.items],
  );

  useEffect(() => {
    if (!myChampionId || myChampionId <= 0) {
      setSavedBuilds([]);
      lastSavedChamp.current = 0;
      return;
    }
    if (lastSavedChamp.current === myChampionId) return;
    lastSavedChamp.current = myChampionId;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/builds?championId=${encodeURIComponent(String(myChampionId))}`,
        );
        const data = (await res.json()) as {
          builds?: SavedChampionBuildView[];
        };
        if (!cancelled && res.ok) {
          setSavedBuilds(data.builds ?? []);
        }
      } catch {
        if (!cancelled) setSavedBuilds([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [myChampionId]);

  const draftRole = (lcd?.draft?.myPosition || preferredRole) as RoleKey;
  const lockedChampId =
    lcd?.draft?.myChampionId && lcd.draft.myChampionId > 0
      ? lcd.draft.myChampionId
      : null;

  const draftTaken = useMemo(() => {
    const d = lcd?.draft;
    if (!d) return new Set<number>();
    return new Set(
      [
        ...d.bans,
        ...d.enemies.map((e) => e.championId),
        ...d.allies.filter((a) => !a.isMe).map((a) => a.championId),
      ].filter((id) => id > 0),
    );
  }, [lcd?.draft]);

  const availableRecs = useMemo(
    () => recs.filter((r) => !draftTaken.has(r.championId)),
    [recs, draftTaken],
  );

  const rawTopId = recs[0]?.championId ?? null;
  const stolenTop =
    !lockedChampId &&
    rawTopId != null &&
    draftTaken.has(rawTopId) &&
    availableRecs[0] != null;

  const lockedRec = lockedChampId
    ? (recs.find((r) => r.championId === lockedChampId) ??
      availableRecs.find((r) => r.championId === lockedChampId) ??
      null)
    : null;

  const topRec = lockedChampId
    ? lockedRec
    : (availableRecs[0] ?? null);
  const draftRune = topRec?.topRune ?? null;
  const heroChampId = lockedChampId ?? topRec?.championId ?? null;
  const mySide = lcd?.players.find((x) => x.isMe)?.team;
  const myTeam = mySide
    ? (lcd?.players ?? []).filter((p) => p.team === mySide)
    : [];
  const enemyTeam = mySide
    ? (lcd?.players ?? []).filter((p) => p.team !== mySide)
    : [];

  const enemyLanerId = useMemo(() => {
    // Prefer LCD draft role match (Spectator laner é frágil: enemies[0]).
    const role = (lcd?.draft?.myPosition || preferredRole) as RoleKey;
    const draftEnemy = lcd?.draft?.enemies.find(
      (e) =>
        e.championId > 0 &&
        (e.position || "").toUpperCase() === role.toUpperCase(),
    );
    if (draftEnemy?.championId) return draftEnemy.championId;

    const liveLaner = enemyTeam.find((p) => {
      const id = champIdFromName(p.championName);
      return (
        id > 0 &&
        live?.enemyLaner?.championId != null &&
        id === live.enemyLaner.championId
      );
    });
    if (liveLaner) return champIdFromName(liveLaner.championName);

    if (live?.enemyLaner?.championId) return live.enemyLaner.championId;
    if (enemyTeam[0]) return champIdFromName(enemyTeam[0].championName);
    return null;
  }, [
    live?.enemyLaner?.championId,
    lcd?.draft?.enemies,
    lcd?.draft?.myPosition,
    preferredRole,
    enemyTeam,
    champIdFromName,
  ]);

  const enemyLanerLabel = useMemo(() => {
    if (enemyLanerId) return idToKey[enemyLanerId] ?? "laner";
    return "laner";
  }, [enemyLanerId, idToKey]);

  const enemyItemIds = useMemo(() => {
    const laner =
      enemyTeam.find(
        (p) => champIdFromName(p.championName) === enemyLanerId,
      ) ?? enemyTeam[0];
    return (laner?.items ?? []).map((it) => it.itemID).filter((id) => id > 0);
  }, [enemyTeam, enemyLanerId, champIdFromName]);

  const dynamicBuild = useMemo(() => {
    const pick = resolveDynamicBuild({
      ownedIds,
      enemyLanerId,
      enemyLanerLabel,
      personal: toBuildCandidate(
        tips?.topBuild ?? null,
        "personal",
        "Ordem pessoal",
      ),
      vsLaner: toBuildCandidate(
        adapt?.vsLanerBuild ?? tips?.vsLanerBuild ?? null,
        "vs-laner",
        `Vs ${enemyLanerLabel}`,
      ),
      vsComp: toBuildCandidate(
        adapt?.vsCompBuild ?? tips?.vsCompBuild ?? null,
        "vs-comp",
        "Vs esta comp",
      ),
      saved: savedBuilds
        .map((b) =>
          savedBuildToCandidate({
            id: b.id,
            name: b.name,
            items: b.items,
            enemyChampionId: b.enemyChampionId,
            enemyChampionName: b.enemyChampionName,
            isDefault: b.isDefault,
          }),
        )
        .filter((c): c is NonNullable<typeof c> => c != null),
    });
    if (!pick) return null;
    if (itemCatalog.length === 0 || enemyItemIds.length === 0) return pick;

    const adapted = adaptBuildOrder({
      buildItems: pick.items,
      ownedIds,
      enemyItemIds,
      catalog: itemCatalog,
    });
    if (!adapted.adapted) return pick;

    const owned = new Set([...ownedIds].filter((id) => id > 0));
    const nextIdx = adapted.items.findIndex(
      (id) => id > 0 && !owned.has(id),
    );
    return {
      ...pick,
      items: adapted.items,
      nextItemId: nextIdx >= 0 ? adapted.items[nextIdx] : null,
      nextIndex: nextIdx >= 0 ? nextIdx : adapted.items.length,
      reason: adapted.reason
        ? `${pick.reason} · ${adapted.reason}`
        : pick.reason,
    };
  }, [
    ownedIds,
    enemyLanerId,
    enemyLanerLabel,
    tips?.topBuild,
    tips?.vsLanerBuild,
    tips?.vsCompBuild,
    adapt?.vsLanerBuild,
    adapt?.vsCompBuild,
    savedBuilds,
    itemCatalog,
    enemyItemIds,
  ]);

  const nextItem = useMemo(() => {
    if (!dynamicBuild?.nextItemId) return null;
    return { id: dynamicBuild.nextItemId, index: dynamicBuild.nextIndex };
  }, [dynamicBuild]);

  const enemyChampionIds = useMemo(() => {
    if (enemyTeam.length) {
      return enemyTeam
        .map((p) => champIdFromName(p.championName))
        .filter((id) => id > 0);
    }
    return (lcd?.draft?.enemies ?? []).map((e) => e.championId);
  }, [enemyTeam, champIdFromName, lcd?.draft?.enemies]);

  useEffect(() => {
    if (uiPhase !== "inGame" || !myChampionId) return;
    // Prefer tips do Spectator quando já trouxerem adapt; senão /api/live/adapt (LCD).
    if (tips && (tips.vsLanerBuild || tips.vsCompBuild)) {
      setAdapt({
        myChampionId: tips.championId,
        vsLanerBuild: tips.vsLanerBuild,
        vsCompBuild: tips.vsCompBuild,
        notes: tips.notes ?? [],
      });
      return;
    }
    void fetchAdapt(myChampionId, enemyLanerId, enemyChampionIds);
  }, [
    uiPhase,
    myChampionId,
    enemyLanerId,
    enemyChampionIds,
    fetchAdapt,
    tips,
  ]);

  const idleDecision = useMemo(() => {
    if (!idleAdvice) return null;
    const base = toDecisionFromSessionAdvice(idleAdvice);
    const reason = idleAdvice.reasons[0];
    return {
      ...base,
      detail: [idleAdvice.summary || idleAdvice.title, reason]
        .filter(Boolean)
        .join(" — "),
      actions:
        idleAdvice.decision === "stop"
          ? [
              { label: "Voltar ao hub", href: "/", kind: "primary" as const },
              {
                label: "Ver horários",
                href: whenHref,
                kind: "ghost" as const,
              },
            ]
          : [
              {
                label: "Abrir Hoje",
                href: prepHref,
                kind: "primary" as const,
              },
              {
                label: "Recalcular",
                kind: "ghost" as const,
              },
            ],
    };
  }, [idleAdvice, prepHref, whenHref]);

  const dodgeAdvice = useMemo(
    () => (uiPhase === "draft" ? evaluateDodgeAdvice(availableRecs) : null),
    [uiPhase, availableRecs],
  );

  const draftDecision = useMemo(() => {
    if (!dodgeAdvice) return null;
    return {
      id: dodgeAdvice.shouldConsiderDodge ? "draft-dodge" : "draft-board",
      tone: dodgeAdvice.shouldConsiderDodge
        ? ("warn" as const)
        : ("go" as const),
      verb: dodgeAdvice.verb,
      detail: dodgeAdvice.detail,
      actions: [] as {
        label: string;
        href?: string;
        kind?: "primary" | "secondary" | "ghost";
      }[],
    };
  }, [dodgeAdvice]);

  const enemyLanerName = useMemo(() => {
    if (!enemyLanerId) return null;
    return idToKey[enemyLanerId] ?? null;
  }, [enemyLanerId, idToKey]);

  const inGameDecision = useMemo(() => {
    if (uiPhase !== "inGame") return null;
    return buildInGameDecision(lcd, {
      nextItemId: nextItem?.id ?? null,
      enemyLanerName,
      buildComplete: Boolean(dynamicBuild && !nextItem),
    });
  }, [uiPhase, lcd, nextItem, enemyLanerName, dynamicBuild]);

  const draftEmptyHint = !bridgeOnline
    ? "Bridge offline — abra o bat antes da fila."
    : !lcd?.draft?.bans.length && !lcd?.draft?.enemies.length
      ? "Aguardando bans…"
      : "Espelhando o board — sugestões entram com bans e picks.";

  return (
    <div className="coach-screen space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-1.5">
          {PHASES.map((p, i) => {
            const active = p.id === uiPhase;
            const past =
              PHASES.findIndex((x) => x.id === uiPhase) > i &&
              uiPhase !== "idle";
            return (
              <li key={p.id} className="flex items-center gap-1.5">
                {i > 0 ? (
                  <span className="text-[var(--muted)]/40" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span
                  className={`rounded-[var(--radius)] px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? "bg-[var(--alttab)] text-white"
                      : past
                        ? "bg-[var(--surface-2)] text-[var(--muted-strong)]"
                        : "text-[var(--muted)]"
                  }`}
                >
                  {p.label}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-1 ${
              bridgeOnline
                ? "bg-[var(--success)]/15 text-[var(--success)]"
                : "bg-[var(--surface-2)] text-[var(--muted)]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                bridgeOnline
                  ? "animate-pulse bg-[var(--success)]"
                  : "bg-[var(--muted)]"
              }`}
            />
            Bridge {bridgeOnline ? "online" : "offline"}
          </span>
          <span className="hidden text-[var(--muted)] sm:inline">{riotId}</span>
        </div>
      </div>

      <header className="coach-fade">
        <p className="data-label">Coach ao vivo</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
          {phaseHeadline(uiPhase)}
        </h1>
      </header>

      {uiPhase === "idle" ? (
        <section className="coach-fade space-y-4">
          {idleDecision ? (
            <div className="space-y-3">
              <DecisionCard
                decision={idleDecision}
                onAction={(label) => {
                  if (label === "Recalcular") void fetchIdleAdvice();
                }}
              />
              {idleAdvice ? (
                <div className="flex flex-wrap gap-3 px-1 text-xs text-[var(--muted)]">
                  <span>
                    Hoje: {idleAdvice.today.wins}W {idleAdvice.today.losses}L
                    {idleAdvice.today.games > 0
                      ? ` · ${pct(idleAdvice.today.wr)}`
                      : ""}
                  </span>
                  <span>
                    Sessão: {idleAdvice.session.wins}W{" "}
                    {idleAdvice.session.losses}L · próxima #
                    {idleAdvice.session.nextIndex}
                  </span>
                  {idleAdvice.lp.delta != null ? (
                    <span className="tabular font-semibold text-[var(--muted-strong)]">
                      PDL {idleAdvice.lp.delta >= 0 ? "+" : ""}
                      {idleAdvice.lp.delta}/{idleAdvice.lp.goal}
                    </span>
                  ) : null}
                  {idleAdvice.nextPlan ? (
                    <span className="text-[var(--alttab-soft)]">
                      {idleAdvice.nextPlan.verb}
                    </span>
                  ) : null}
                  {idleAdvice.bestWindowLabel ? (
                    <span>
                      Melhor horário: {idleAdvice.bestWindowLabel}
                      {idleAdvice.inBestWindow ? " (agora)" : ""}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {idleAdvice && idleAdvice.reasons.length > 1 ? (
                <details className="px-1">
                  <summary className="cursor-pointer text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
                    Mais motivos ({idleAdvice.reasons.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-[var(--muted-strong)]">
                    {idleAdvice.reasons.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : (
            <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
              <p className="data-label mb-1">Tomada de decisão</p>
              <p className="text-sm text-[var(--muted-strong)]">
                Avaliando PDL do dia, horário e se vale filar agora…
              </p>
            </section>
          )}
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
            <p className="max-w-lg text-base text-[var(--muted-strong)]">
              Deixe esta tela no segundo monitor. Com o bridge aberto no PC do
              LoL, a seleção e a partida entram sozinhas.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {!bridgeOnline ? (
                <EmptyState
                  className="w-full border-[var(--warn)]/35 bg-amber-50"
                  title="Bridge offline"
                  description="Em Config baixe Atualizar-e-Iniciar.bat e rode no PC do jogo antes da fila."
                  action={
                    <Button href="/config" variant="secondary" size="sm">
                      Configurar bridge
                    </Button>
                  }
                />
              ) : (
                <p className="w-full text-sm text-[var(--success)]">
                  Bridge online. Entre na fila — a fase muda automaticamente.
                </p>
              )}
            </div>
            <p className="mt-6 text-xs text-[var(--muted)]">
              LCU falhou?{" "}
              <Link
                href={draftHref}
                className="text-[var(--alttab)] hover:underline"
              >
                Seleção manual (fallback)
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      {uiPhase === "loading" ? (
        <section className="coach-fade rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center">
          <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div className="coach-loading-bar h-full w-1/2 rounded-full bg-[var(--alttab)]" />
          </div>
          <p className="mt-5 text-lg text-[var(--foreground)]">Partida iniciando…</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Build e itens aparecem quando o Live Client abrir.
          </p>
          {lcd?.draft?.myChampionId ? (
            <div className="mt-6 flex items-center justify-center gap-3">
              <ChampionIcon
                ddragonVersion={ddragonVersion}
                championId={lcd.draft.myChampionId}
                idToKey={idToKey}
                keyToId={keyToId}
                width={56}
                height={56}
                className="rounded-[var(--radius)] ring-1 ring-[var(--border-strong)]"
              />
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {champName(lcd.draft.myChampionId) || "Campeão"}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {uiPhase === "draft" ? (
        <div className="coach-fade space-y-5">
          {!lcd?.draft ? (
            <EmptyState
              title={
                bridgeOnline ? "Aguardando bans…" : "Bridge offline"
              }
              description={
                bridgeOnline
                  ? "O board LCU aparece quando a seleção começar."
                  : "Abra o bat no PC do LoL antes da fila."
              }
              action={
                !bridgeOnline ? (
                  <Button href="/config" variant="secondary" size="sm">
                    Configurar bridge
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {draftDecision ? (
                <DecisionCard decision={draftDecision} />
              ) : null}

              {heroChampId ? (
                <section className="rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] sm:p-7">
                  <p className="data-label">
                    {lockedChampId
                      ? "Seu pick · runas"
                      : stolenTop
                        ? "Próximo pick"
                        : "Pick sugerido"}{" "}
                    · {ROLE_LABELS[draftRole] ?? draftRole}
                  </p>
                  {stolenTop && rawTopId ? (
                    <p className="mt-1 text-xs text-[var(--warn)]">
                      {champName(rawTopId) || `#${rawTopId}`} indisponível —
                      pickado no board. Sugerindo o próximo.
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <ChampionIcon
                      ddragonVersion={ddragonVersion}
                      championId={heroChampId}
                      idToKey={idToKey}
                      keyToId={keyToId}
                      width={72}
                      height={72}
                      className="rounded-[var(--radius)] ring-2 ring-[var(--alttab)]"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
                          {champName(heroChampId)}
                        </h2>
                        {topRec ? (
                          <ConfidenceBadge level={topRec.confidence} />
                        ) : lockedChampId ? (
                          <span className="rounded-[var(--radius)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                            Lockado
                          </span>
                        ) : null}
                      </div>
                      {topRec ? (
                        <>
                          <p className="mt-1 text-sm text-[var(--muted-strong)]">
                            {pct(topRec.wrInRole)} WR · {topRec.gamesInRole}{" "}
                            jogos na lane
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]">
                            {topRec.reasons.slice(0, 3).map((r) => (
                              <li key={r}>· {r}</li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-[var(--muted-strong)]">
                          Champ lockado — runas/contexto entram quando houver
                          amostra na lane.
                        </p>
                      )}
                    </div>
                    {recsPending ? (
                      <span className="ml-auto text-xs text-[var(--alttab)]">
                        Atualizando…
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 border-t border-[var(--border)] pt-4">
                    <p className="data-label mb-2">Runas recomendadas</p>
                    {draftRune ? (
                      <>
                        <p className="mb-3 text-sm text-[var(--muted-strong)]">
                          Sua página mais estável neste contexto
                          {draftRune.games
                            ? ` · ${pct(draftRune.wr)} WR em ${draftRune.games} jogos`
                            : ""}
                        </p>
                        <RunePageIcons
                          primaryStyle={draftRune.primaryStyle}
                          subStyle={draftRune.subStyle}
                          keystone={draftRune.keystone}
                          primaryPerkIds={draftRune.primaryPerkIds}
                          subPerkIds={draftRune.subPerkIds}
                          perkIds={draftRune.perkIds}
                          runeCatalog={runeCatalog}
                          size="md"
                          showLabels
                        />
                      </>
                    ) : (
                      <p className="text-sm text-[var(--muted)]">
                        Sem página recorrente no histórico — sincronize mais
                        partidas.
                      </p>
                    )}
                  </div>
                </section>
              ) : (
                <EmptyState
                  title={`Seu pick · ${ROLE_LABELS[draftRole] ?? draftRole}`}
                  description={
                    recsPending ? "Calculando recomendações…" : draftEmptyHint
                  }
                />
              )}

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
                  <p className="data-label mb-3">Board (LCU · só leitura)</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs text-[var(--muted)]">Aliados</p>
                      <div className="flex flex-wrap gap-2">
                        {lcd.draft.allies.length ? (
                          lcd.draft.allies.map((a) => (
                            <ChampionIcon
                              key={`ally-${a.championId}-${a.isMe}`}
                              ddragonVersion={ddragonVersion}
                              championId={a.championId}
                              idToKey={idToKey}
                              keyToId={keyToId}
                              width={44}
                              height={44}
                              className={`rounded-[var(--radius)] ${a.isMe ? "ring-2 ring-[var(--alttab)]" : ""}`}
                            />
                          ))
                        ) : (
                          <p className="text-sm text-[var(--muted)]">—</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs text-[var(--muted)]">Inimigos</p>
                      <div className="flex flex-wrap gap-2">
                        {lcd.draft.enemies.length ? (
                          lcd.draft.enemies.map((e) => (
                            <ChampionIcon
                              key={`enemy-${e.championId}`}
                              ddragonVersion={ddragonVersion}
                              championId={e.championId}
                              idToKey={idToKey}
                              keyToId={keyToId}
                              width={44}
                              height={44}
                              className="rounded-[var(--radius)] ring-1 ring-rose-500/40"
                            />
                          ))
                        ) : (
                          <p className="text-sm text-[var(--muted)]">—</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {lcd.draft.bans.length ? (
                    <div className="mt-4">
                      <p className="data-label mb-2">Bans</p>
                      <div className="flex flex-wrap gap-1.5">
                        {lcd.draft.bans.map((id) => (
                          <ChampionIcon
                            key={`ban-${id}`}
                            ddragonVersion={ddragonVersion}
                            championId={id}
                            idToKey={idToKey}
                            keyToId={keyToId}
                            width={28}
                            height={28}
                            className="rounded-md opacity-55 grayscale"
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-[var(--muted)]">
                      Aguardando bans…
                    </p>
                  )}
                </section>

                <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Alternativas
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {(lockedChampId
                      ? availableRecs.filter((r) => r.championId !== lockedChampId)
                      : availableRecs.slice(1)
                    )
                      .slice(0, 3)
                      .map((r, i) => (
                      <li
                        key={r.championId}
                        className="flex items-center gap-3 rounded-[var(--radius)] bg-[var(--surface-2)] px-3 py-2"
                      >
                        <span className="w-5 text-sm font-bold text-[var(--alttab)]">
                          {i + 1}
                        </span>
                        <ChampionIcon
                          ddragonVersion={ddragonVersion}
                          championId={r.championId}
                          idToKey={idToKey}
                          keyToId={keyToId}
                          width={36}
                          height={36}
                          className="rounded-[var(--radius)]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[var(--foreground)]">
                            {champName(r.championId) || `#${r.championId}`}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            {pct(r.wrInRole)} WR
                          </p>
                        </div>
                        {r.topRune ? (
                          <RunePageIcons
                            primaryStyle={r.topRune.primaryStyle}
                            subStyle={r.topRune.subStyle}
                            keystone={r.topRune.keystone}
                            primaryPerkIds={r.topRune.primaryPerkIds}
                            subPerkIds={r.topRune.subPerkIds}
                            perkIds={r.topRune.perkIds}
                            runeCatalog={runeCatalog}
                            size="sm"
                            showLabels={false}
                          />
                        ) : null}
                      </li>
                    ))}
                    {!availableRecs.length ? (
                      <li className="text-sm text-[var(--muted)]">
                        Aguardando…
                      </li>
                    ) : null}
                  </ul>
                  <Link
                    href={draftHref}
                    className="mt-4 inline-block text-xs text-[var(--muted)] hover:text-[var(--alttab)]"
                  >
                    Seleção manual (fallback)
                  </Link>
                </section>
              </div>
            </>
          )}
        </div>
      ) : null}

      {uiPhase === "inGame" ? (
        <div className="coach-fade space-y-5">
          {inGameDecision ? (
            <DecisionCard decision={inGameDecision} />
          ) : null}

          <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {myChampKey || myChampionId ? (
                  <ChampionIcon
                    ddragonVersion={ddragonVersion}
                    championId={myChampionId || null}
                    nameOrKey={myChampKey || null}
                    idToKey={idToKey}
                    keyToId={keyToId}
                    width={72}
                    height={72}
                    className="rounded-[var(--radius)] ring-1 ring-[var(--border-strong)]"
                  />
                ) : null}
                <div>
                  <p className="data-label">Você</p>
                  <h2 className="text-3xl font-semibold text-[var(--foreground)]">
                    {champName(myChampionId) || myChampKey || "Em jogo"}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {lcd?.game ? formatTime(lcd.game.gameTime) : "—"}
                    {me ? ` · Nv ${me.level}` : ""}
                  </p>
                </div>
              </div>
              {me ? (
                <div className="flex flex-wrap gap-2">
                  <Stat
                    label="Ouro"
                    value={String(Math.round(me.currentGold))}
                  />
                  <Stat
                    label="KDA"
                    value={`${me.kills}/${me.deaths}/${me.assists}`}
                  />
                  <Stat label="CS" value={String(me.creepScore)} />
                </div>
              ) : null}
            </div>

            {nextItem && dynamicBuild ? (
              <div className="mt-6 flex items-center gap-5 rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--alttab)]/8 px-5 py-4">
                <Image
                  src={itemIconUrl(ddragonVersion, nextItem.id)}
                  alt=""
                  width={72}
                  height={72}
                  className="rounded-[var(--radius)] ring-2 ring-[var(--alttab)]"
                />
                <div className="min-w-0">
                  <p className="data-label">Próximo item · dinâmico</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                    Slot {nextItem.index + 1}
                    <span className="ml-2 text-sm font-medium text-[var(--muted-strong)]">
                      · {dynamicBuild.label}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">
                    {dynamicBuild.source === "saved"
                      ? dynamicBuild.reason
                      : `${pct(dynamicBuild.wr)} WR · ${dynamicBuild.games}j · ${dynamicBuild.reason}`}
                  </p>
                  {me ? (
                    <p className="text-sm text-[var(--muted)]">
                      {Math.round(me.currentGold)} ouro
                    </p>
                  ) : null}
                </div>
              </div>
            ) : dynamicBuild ? (
              <p className="mt-6 text-sm text-[var(--success)]">
                Build ativa completa neste momento ({dynamicBuild.label}).
              </p>
            ) : (
              <p className="mt-6 text-sm text-[var(--muted)]">
                Sem build contextual ainda — jogue mais partidas neste champ.
              </p>
            )}

            {dynamicBuild ? (
              <div className="mt-5">
                <ItemRow
                  items={dynamicBuild.items}
                  ddragonVersion={ddragonVersion}
                  label={dynamicBuild.label}
                  wr={
                    dynamicBuild.source === "saved"
                      ? undefined
                      : dynamicBuild.wr
                  }
                  games={
                    dynamicBuild.source === "saved"
                      ? undefined
                      : dynamicBuild.games
                  }
                />
              </div>
            ) : null}

            {me && me.items.length > 0 ? (
              <div className="mt-4">
                <p className="data-label mb-2">Seu inventário</p>
                <div className="flex flex-wrap gap-1.5">
                  {me.items.map((it) => (
                    <Image
                      key={`inv-${it.itemID}-${it.slot ?? 0}`}
                      src={itemIconUrl(ddragonVersion, it.itemID)}
                      alt={it.displayName ?? ""}
                      width={36}
                      height={36}
                      className="rounded-md ring-1 ring-[var(--border)]"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {tips?.topRune ? (
              <div className="mt-4">
                <p className="data-label mb-2">Suas runas</p>
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
          </section>

          {enemyTeam.length > 0 ? (
            <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="data-label mb-3">Itens dos oponentes</p>
              <ul className="space-y-3">
                {enemyTeam.map((p) => {
                  const isLaner =
                    enemyLanerId != null &&
                    champIdFromName(p.championName) === enemyLanerId;
                  return (
                    <li
                      key={`eg-${p.riotId}-${p.championName}`}
                      className={`flex flex-wrap items-center gap-3 rounded-[var(--radius)] px-3 py-2 ${
                        isLaner
                          ? "bg-rose-500/10 ring-1 ring-rose-500/30"
                          : "bg-[var(--surface-2)]"
                      }`}
                    >
                      <ChampionIcon
                        ddragonVersion={ddragonVersion}
                        championId={champIdFromName(p.championName) || null}
                        nameOrKey={p.championName}
                        idToKey={idToKey}
                        keyToId={keyToId}
                        alt={p.championName}
                        width={40}
                        height={40}
                        className="rounded-[var(--radius)] ring-1 ring-rose-500/30"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {p.championName}
                          {isLaner ? (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--danger)]">
                              Laner
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[10px] text-[var(--muted)]">
                          {p.kills}/{p.deaths}/{p.assists} · CS {p.creepScore}
                        </p>
                      </div>
                      <div className="ml-auto flex flex-wrap gap-1">
                        {p.items.length ? (
                          p.items.map((it) => (
                            <Image
                              key={`ei-${p.riotId}-${it.itemID}-${it.slot ?? 0}`}
                              src={itemIconUrl(ddragonVersion, it.itemID)}
                              alt={it.displayName ?? ""}
                              width={28}
                              height={28}
                              className="rounded-md ring-1 ring-[var(--border)]"
                            />
                          ))
                        ) : (
                          <span className="text-xs text-[var(--muted)]">
                            sem itens
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="type-title text-base">Contra o laner</h3>
              {(() => {
                const lanerTip =
                  adapt?.vsLanerBuild ??
                  tips?.vsLanerBuild ??
                  (tips?.topBuild
                    ? {
                        ...tips.topBuild,
                        enemyChampionId: enemyLanerId ?? undefined,
                        sampleNote: "Ordem pessoal · sem histórico vs laner",
                      }
                    : null);
                if (!lanerTip) {
                  return (
                    <p className="mt-3 text-sm text-[var(--muted)]">
                      {adapt?.notes.find((n) =>
                        n.toLowerCase().includes("laner"),
                      ) ?? "Sincronize mais partidas em Config."}
                    </p>
                  );
                }
                return (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-[var(--muted-strong)]">
                      {lanerTip.enemyChampionId
                        ? `Vs ${champName(lanerTip.enemyChampionId)}`
                        : "Contexto de lane"}
                      {lanerTip.sampleNote ? ` · ${lanerTip.sampleNote}` : ""}
                    </p>
                    <ItemRow
                      items={lanerTip.items}
                      ddragonVersion={ddragonVersion}
                      label="Build"
                      wr={lanerTip.wr}
                      games={lanerTip.games}
                    />
                    {adapt?.notes
                      .filter((n) => n.toLowerCase().includes("laner") || n.toLowerCase().includes("lane") || n.toLowerCase().includes("role"))
                      .slice(0, 1)
                      .map((n) => (
                        <p key={n} className="text-xs text-[var(--muted)]">
                          {n}
                        </p>
                      ))}
                  </div>
                );
              })()}
            </section>

            <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="type-title text-base">Contra esta comp</h3>
              {(() => {
                const compTip =
                  adapt?.vsCompBuild ??
                  tips?.vsCompBuild ??
                  (tips?.topBuild
                    ? {
                        ...tips.topBuild,
                        sampleNote: "Ordem pessoal · sem overlap desta comp",
                      }
                    : null);
                if (!compTip) {
                  return (
                    <p className="mt-3 text-sm text-[var(--muted)]">
                      {adapt?.notes.find((n) =>
                        n.toLowerCase().includes("overlap"),
                      ) ?? "Sincronize mais partidas em Config."}
                    </p>
                  );
                }
                return (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-[var(--muted-strong)]">
                      {compTip.sampleNote ??
                        (compTip.overlap != null
                          ? `Overlap ${compTip.overlap}`
                          : "Contexto de composição")}
                    </p>
                    <ItemRow
                      items={compTip.items}
                      ddragonVersion={ddragonVersion}
                      label="Build"
                      wr={compTip.wr}
                      games={compTip.games}
                    />
                    {adapt?.notes
                      .filter(
                        (n) =>
                          n.toLowerCase().includes("overlap") ||
                          n.toLowerCase().includes("comp"),
                      )
                      .slice(0, 1)
                      .map((n) => (
                        <p key={n} className="text-xs text-[var(--muted)]">
                          {n}
                        </p>
                      ))}
                  </div>
                );
              })()}
            </section>
          </div>

          {myTeam.length > 1 ? (
            <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="data-label mb-2">Aliados</p>
              <div className="flex flex-wrap gap-3">
                {myTeam
                  .filter((p) => !p.isMe)
                  .map((p) => (
                    <div
                      key={`ag-${p.riotId}-${p.championName}`}
                      className="flex items-center gap-2"
                    >
                      <ChampionIcon
                        ddragonVersion={ddragonVersion}
                        championId={champIdFromName(p.championName) || null}
                        nameOrKey={p.championName}
                        idToKey={idToKey}
                        keyToId={keyToId}
                        alt={p.championName}
                        width={32}
                        height={32}
                        className="rounded-[var(--radius)]"
                      />
                      <p className="text-xs text-[var(--muted-strong)]">
                        {p.championName}
                      </p>
                    </div>
                  ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {uiPhase === "postGame" ? (
        <div className="coach-fade space-y-4">
          {advice ? (
            <>
              <SessionAdviceAlert
                advice={advice}
                onDismiss={() => {
                  setAdvice(null);
                  wasInGame.current = false;
                  setUiPhase("idle");
                }}
                onRefresh={() => void fetchAdvice()}
              />
              <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
                <p className="data-label">Plano da próxima fila</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {advice.nextPlan.verb}
                  {advice.lp.lastMatchDelta != null
                    ? ` · última ~${advice.lp.lastMatchDelta >= 0 ? "+" : ""}${advice.lp.lastMatchDelta} PDL`
                    : ""}
                </p>
                <p className="mt-1 text-[var(--muted)]">
                  Meta +{advice.lp.goal}
                  {advice.lp.delta != null
                    ? ` · agora ${advice.lp.delta >= 0 ? "+" : ""}${advice.lp.delta}`
                    : ""}
                  {advice.bestWindowLabel
                    ? ` · melhor bloco ${advice.bestWindowLabel}`
                    : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {advice.decision !== "stop" ? (
                    <Button href="/coach" size="sm">
                      Continuar no Coach
                    </Button>
                  ) : (
                    <Button href="/" size="sm">
                      Encerrar no Hub
                    </Button>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="text-sm text-[var(--alttab)]">
                Avaliando PDL e se vale continuar a sessão…
              </p>
            </section>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              setAdvice(null);
              wasInGame.current = false;
              setUiPhase("idle");
            }}
          >
            Voltar a aguardar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

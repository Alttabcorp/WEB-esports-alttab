import { redisGetJson, redisSetJson } from "@/lib/cache/redis";

export const LIVE_CLIENT_TTL_INGAME = 12;
export const LIVE_CLIENT_TTL_DRAFT = 20;
export const LIVE_CLIENT_TTL_LOADING = 20;
export const LIVE_CLIENT_TTL_IDLE = 45;

export type LivePhase = "idle" | "draft" | "loading" | "inGame";

export type LiveClientItem = {
  itemID: number;
  displayName?: string;
  count?: number;
  slot?: number;
};

export type LiveClientPlayer = {
  riotId: string;
  summonerName: string;
  championName: string;
  team: string;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  creepScore: number;
  wardScore?: number;
  items: LiveClientItem[];
  isMe: boolean;
};

export type LiveDraftParticipant = {
  championId: number;
  position: string | null;
  isMe: boolean;
};

export type LiveDraftState = {
  myChampionId: number | null;
  myPosition: string | null;
  allies: LiveDraftParticipant[];
  enemies: LiveDraftParticipant[];
  bans: number[];
  timerPhase: string | null;
};

export type LiveClientSnapshot = {
  source: "live-client";
  receivedAt: number;
  bridgeOnline: true;
  phase: LivePhase;
  inGame: boolean;
  /** PUUID do perfil (vindo do agente). */
  puuid: string | null;
  draft: LiveDraftState | null;
  game: {
    gameMode: string;
    gameTime: number;
    mapName: string;
    mapTerrain?: string;
  } | null;
  me: {
    riotId: string;
    championName: string;
    level: number;
    currentGold: number;
    currentHealth: number;
    maxHealth: number;
    kills: number;
    deaths: number;
    assists: number;
    creepScore: number;
    items: LiveClientItem[];
  } | null;
  players: LiveClientPlayer[];
  recentEvents: { EventName: string; EventTime?: number }[];
};

function liveKey(puuid: string): string {
  return `lol:liveclient:${puuid}`;
}

function ttlForPhase(phase: LivePhase): number {
  switch (phase) {
    case "inGame":
      return LIVE_CLIENT_TTL_INGAME;
    case "draft":
      return LIVE_CLIENT_TTL_DRAFT;
    case "loading":
      return LIVE_CLIENT_TTL_LOADING;
    default:
      return LIVE_CLIENT_TTL_IDLE;
  }
}

export async function setLiveClientSnapshot(
  puuid: string,
  snapshot: LiveClientSnapshot,
): Promise<void> {
  await redisSetJson(liveKey(puuid), snapshot, ttlForPhase(snapshot.phase));
}

export async function getLiveClientSnapshot(
  puuid: string,
): Promise<LiveClientSnapshot | null> {
  const snap = await redisGetJson<LiveClientSnapshot>(liveKey(puuid));
  if (!snap) return null;
  // Compat com snapshots antigos sem phase
  if (!snap.phase) {
    snap.phase = snap.inGame ? "inGame" : "idle";
  }
  if (snap.draft === undefined) snap.draft = null;
  return snap;
}

function emptyIdle(
  puuid: string | null,
  receivedAt: number,
  phase: LivePhase = "idle",
): LiveClientSnapshot {
  return {
    source: "live-client",
    receivedAt,
    bridgeOnline: true,
    phase,
    inGame: false,
    puuid,
    draft: null,
    game: null,
    me: null,
    players: [],
    recentEvents: [],
  };
}

function normalizeDraft(raw: unknown): LiveDraftState | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const asParticipants = (value: unknown): LiveDraftParticipant[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((p) => {
        const row = (p ?? {}) as Record<string, unknown>;
        const championId = Number(row.championId ?? 0);
        if (!Number.isFinite(championId) || championId <= 0) return null;
        return {
          championId,
          position: row.position != null ? String(row.position) : null,
          isMe: Boolean(row.isMe),
        };
      })
      .filter((p): p is LiveDraftParticipant => p != null);
  };
  const bans = Array.isArray(d.bans)
    ? d.bans.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const myChampionId =
    d.myChampionId != null && Number(d.myChampionId) > 0
      ? Number(d.myChampionId)
      : null;
  return {
    myChampionId,
    myPosition: d.myPosition != null ? String(d.myPosition) : null,
    allies: asParticipants(d.allies),
    enemies: asParticipants(d.enemies),
    bans,
    timerPhase: d.timerPhase != null ? String(d.timerPhase) : null,
  };
}

function resolvePhase(input: {
  phase?: string | null;
  inGame: boolean;
  draft: LiveDraftState | null;
}): LivePhase {
  const explicit = input.phase?.trim();
  if (
    explicit === "idle" ||
    explicit === "draft" ||
    explicit === "loading" ||
    explicit === "inGame"
  ) {
    return explicit;
  }
  if (input.inGame) return "inGame";
  if (input.draft) return "draft";
  return "idle";
}

/** Normaliza payload do bridge (LCD + LCU draft). */
export function normalizeLiveClientPayload(input: {
  puuid?: string | null;
  phase?: string | null;
  inGame: boolean;
  raw?: unknown;
  draft?: unknown;
}): LiveClientSnapshot {
  const receivedAt = Date.now();
  const puuid = input.puuid ?? null;
  const draft = normalizeDraft(input.draft);
  const phase = resolvePhase({
    phase: input.phase,
    inGame: input.inGame,
    draft,
  });

  if (phase === "draft") {
    return {
      ...emptyIdle(puuid, receivedAt, "draft"),
      draft,
    };
  }

  if (phase === "loading") {
    return {
      ...emptyIdle(puuid, receivedAt, "loading"),
      draft,
    };
  }

  if (phase !== "inGame" || !input.raw || typeof input.raw !== "object") {
    return emptyIdle(puuid, receivedAt, phase === "inGame" ? "idle" : phase);
  }

  const raw = input.raw as Record<string, unknown>;
  const activePlayer = (raw.activePlayer ?? {}) as Record<string, unknown>;
  const allPlayers = Array.isArray(raw.allPlayers)
    ? (raw.allPlayers as Record<string, unknown>[])
    : [];
  const gameData = (raw.gameData ?? {}) as Record<string, unknown>;
  const eventsObj = (raw.events ?? {}) as Record<string, unknown>;
  const events = Array.isArray(eventsObj.Events)
    ? (eventsObj.Events as Record<string, unknown>[])
    : [];

  const activeName = String(
    activePlayer.summonerName ?? activePlayer.riotId ?? "",
  );
  const scores = (activePlayer.scores ?? {}) as Record<string, number>;
  const championStats = (activePlayer.championStats ?? {}) as Record<
    string,
    number
  >;

  const meFromList = allPlayers.find((p) => {
    const n = String(p.summonerName ?? p.riotId ?? "");
    return n && activeName && n === activeName;
  });

  const itemsRaw = Array.isArray(meFromList?.items)
    ? (meFromList!.items as Record<string, unknown>[])
    : [];

  const meItems: LiveClientItem[] = itemsRaw
    .map((it) => ({
      itemID: Number(it.itemID ?? 0),
      displayName: it.displayName ? String(it.displayName) : undefined,
      count: it.count != null ? Number(it.count) : undefined,
      slot: it.slot != null ? Number(it.slot) : undefined,
    }))
    .filter((it) => it.itemID > 0);

  const players: LiveClientPlayer[] = allPlayers.map((p) => {
    const riotId = String(p.riotId ?? p.summonerName ?? "");
    const items = Array.isArray(p.items)
      ? (p.items as Record<string, unknown>[])
          .map((it) => ({
            itemID: Number(it.itemID ?? 0),
            displayName: it.displayName ? String(it.displayName) : undefined,
            count: it.count != null ? Number(it.count) : undefined,
            slot: it.slot != null ? Number(it.slot) : undefined,
          }))
          .filter((it) => it.itemID > 0)
      : [];
    const sc = (p.scores ?? {}) as Record<string, number>;
    return {
      riotId,
      summonerName: String(p.summonerName ?? riotId),
      championName: String(p.championName ?? ""),
      team: String(p.team ?? ""),
      level: Number(p.level ?? 1),
      kills: Number(sc.kills ?? 0),
      deaths: Number(sc.deaths ?? 0),
      assists: Number(sc.assists ?? 0),
      creepScore: Number(sc.creepScore ?? 0),
      wardScore: sc.wardScore != null ? Number(sc.wardScore) : undefined,
      items,
      isMe: Boolean(activeName && riotId === activeName),
    };
  });

  const mePlayer = players.find((p) => p.isMe) ?? null;

  return {
    source: "live-client",
    receivedAt,
    bridgeOnline: true,
    phase: "inGame",
    inGame: true,
    puuid,
    draft: null,
    game: {
      gameMode: String(gameData.gameMode ?? "CLASSIC"),
      gameTime: Number(gameData.gameTime ?? 0),
      mapName: String(gameData.mapName ?? ""),
      mapTerrain: gameData.mapTerrain
        ? String(gameData.mapTerrain)
        : undefined,
    },
    me: {
      riotId: activeName || mePlayer?.riotId || "",
      championName: String(
        mePlayer?.championName ?? activePlayer.championName ?? "",
      ),
      level: Number(mePlayer?.level ?? activePlayer.level ?? 1),
      currentGold: Number(activePlayer.currentGold ?? 0),
      currentHealth: Number(championStats.currentHealth ?? 0),
      maxHealth: Number(championStats.maxHealth ?? 0),
      kills: Number(scores.kills ?? mePlayer?.kills ?? 0),
      deaths: Number(scores.deaths ?? mePlayer?.deaths ?? 0),
      assists: Number(scores.assists ?? mePlayer?.assists ?? 0),
      creepScore: Number(scores.creepScore ?? mePlayer?.creepScore ?? 0),
      items: meItems.length ? meItems : mePlayer?.items ?? [],
    },
    players,
    recentEvents: events.slice(-8).map((e) => ({
      EventName: String(e.EventName ?? "Event"),
      EventTime: e.EventTime != null ? Number(e.EventTime) : undefined,
    })),
  };
}

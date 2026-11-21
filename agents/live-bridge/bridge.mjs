/**
 * League Persua — Live Bridge (LCU draft + Live Client in-game)
 * Roda no PC de jogo. Lê LCU (lockfile ou processo) + https://127.0.0.1:2999.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import https from "node:https";
import { homedir } from "node:os";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv(resolve(__dirname, ".env"));

const LCD_URL = "https://127.0.0.1:2999/liveclientdata/allgamedata";
const PERSUA_URL = (process.env.PERSUA_URL || "http://127.0.0.1:3001").replace(
  /\/$/,
  "",
);
const TOKEN = process.env.LIVE_AGENT_TOKEN || "";
const PUUID = process.env.PROFILE_PUUID || "";
const POLL_INGAME_MS = Number(process.env.POLL_INGAME_MS || 2000);
const POLL_DRAFT_MS = Number(process.env.POLL_DRAFT_MS || 1500);
const POLL_IDLE_MS = Number(process.env.POLL_IDLE_MS || 5000);
const LOCKFILE_PATH = process.env.LOCKFILE_PATH || "";

if (!TOKEN) {
  console.error("[bridge] LIVE_AGENT_TOKEN obrigatório no .env");
  process.exit(1);
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function loadEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function parseLockfileRaw(raw, path = "") {
  const text = String(raw || "").trim();
  if (!text) return null;
  // name:pid:port:password:protocol — password pode ter ':'
  const m = text.match(/^[^:]+:(\d+):(\d+):(.+):(https?)$/i);
  if (m) {
    return {
      path,
      pid: Number(m[1]),
      port: Number(m[2]),
      password: m[3],
      protocol: m[4].toLowerCase(),
    };
  }
  const parts = text.split(":");
  if (parts.length >= 5) {
    return {
      path,
      pid: Number(parts[1]),
      port: Number(parts[2]),
      password: parts.slice(3, -1).join(":"),
      protocol: parts[parts.length - 1] || "https",
    };
  }
  return null;
}

function defaultLockfileCandidates() {
  const home = homedir();
  const localApp =
    process.env.LOCALAPPDATA ||
    (process.env.USERPROFILE
      ? resolve(process.env.USERPROFILE, "AppData", "Local")
      : "");
  const drives = ["C", "D", "E", "F"];
  const list = [
    LOCKFILE_PATH,
    localApp
      ? resolve(localApp, "Riot Games", "League of Legends", "lockfile")
      : "",
    resolve(home, "Riot Games", "League of Legends", "lockfile"),
  ];
  for (const d of drives) {
    list.push(`${d}:\\Riot Games\\League of Legends\\lockfile`);
    list.push(
      `${d}:\\Games\\Riot Games\\League of Legends\\lockfile`,
    );
    list.push(
      `${d}:\\Program Files\\Riot Games\\League of Legends\\lockfile`,
    );
    list.push(
      `${d}:\\Program Files (x86)\\Riot Games\\League of Legends\\lockfile`,
    );
  }
  return list.filter(Boolean);
}

function findLockfileNearRiot() {
  const roots = [];
  for (const d of ["C", "D", "E"]) {
    roots.push(`${d}:\\Riot Games`);
  }
  const localApp = process.env.LOCALAPPDATA;
  if (localApp) roots.push(resolve(localApp, "Riot Games"));

  for (const root of roots) {
    try {
      if (!existsSync(root)) continue;
      const stack = [root];
      let steps = 0;
      while (stack.length && steps < 80) {
        steps += 1;
        const dir = stack.pop();
        let entries = [];
        try {
          entries = readdirSync(dir, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const ent of entries) {
          const full = join(dir, ent.name);
          if (ent.isFile() && ent.name.toLowerCase() === "lockfile") {
            return full;
          }
          if (
            ent.isDirectory() &&
            !ent.name.startsWith(".") &&
            ent.name.toLowerCase() !== "node_modules"
          ) {
            stack.push(full);
          }
        }
      }
    } catch {
      // next root
    }
  }
  return null;
}

function readLockfileFromDisk() {
  const candidates = defaultLockfileCandidates();
  const extra = findLockfileNearRiot();
  if (extra) candidates.unshift(extra);

  for (const path of candidates) {
    try {
      if (!existsSync(path)) continue;
      const parsed = parseLockfileRaw(readFileSync(path, "utf8"), path);
      if (parsed?.port && parsed.password) return parsed;
    } catch {
      // try next
    }
  }
  return null;
}

/** Mais confiável no Windows: tokens na linha de comando do LeagueClientUx. */
async function readLcuFromProcess() {
  if (process.platform !== "win32") return null;
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Process -Filter \"name='LeagueClientUx.exe'\" | Select-Object -ExpandProperty CommandLine",
      ],
      { timeout: 4000, windowsHide: true },
    );
    const cmd = String(stdout || "");
    const portM = cmd.match(/--app-port=(\d+)/i);
    const tokenM = cmd.match(/--remoting-auth-token=([^\s"']+)/i);
    if (!portM || !tokenM) return null;
    return {
      path: "process:LeagueClientUx.exe",
      port: Number(portM[1]),
      password: tokenM[1],
      protocol: "https",
    };
  } catch {
    return null;
  }
}

let cachedLcu = null;
let cachedLcuAt = 0;

async function resolveLcu() {
  const now = Date.now();
  if (cachedLcu && now - cachedLcuAt < 5000) return cachedLcu;

  const fromProc = await readLcuFromProcess();
  const lock = fromProc || readLockfileFromDisk();
  cachedLcu = lock;
  cachedLcuAt = now;
  return lock;
}

function httpsGetJson(url, headers = {}) {
  return new Promise((resolvePromise, reject) => {
    const req = https.get(
      url,
      { agent: httpsAgent, timeout: 2500, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => {
          if (res.statusCode === 404) {
            resolvePromise({ ok: false, status: 404, json: null, text: data });
            return;
          }
          if (res.statusCode !== 200) {
            resolvePromise({
              ok: false,
              status: res.statusCode ?? 0,
              json: null,
              text: data.slice(0, 200),
            });
            return;
          }
          try {
            const trimmed = data.trim();
            const json =
              trimmed.startsWith("{") || trimmed.startsWith("[")
                ? JSON.parse(trimmed)
                : trimmed.replace(/^"|"$/g, "");
            resolvePromise({ ok: true, status: 200, json, text: data });
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", (err) => {
      if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
        resolvePromise({ ok: false, status: 0, json: null, text: "" });
        return;
      }
      reject(err);
    });
    req.on("timeout", () => {
      req.destroy();
      resolvePromise({ ok: false, status: 0, json: null, text: "" });
    });
  });
}

function lcuGet(lock, path) {
  const auth = Buffer.from(`riot:${lock.password}`).toString("base64");
  const url = `${lock.protocol}://127.0.0.1:${lock.port}${path}`;
  return httpsGetJson(url, { Authorization: `Basic ${auth}` });
}

function fetchLcd() {
  return httpsGetJson(LCD_URL).then((res) => {
    if (res.ok) return { inGame: true, raw: res.json };
    return { inGame: false, raw: null };
  });
}

function mapLcuPosition(pos) {
  const p = String(pos || "").toLowerCase();
  if (p === "top") return "TOP";
  if (p === "jungle") return "JUNGLE";
  if (p === "middle" || p === "mid") return "MIDDLE";
  if (p === "bottom" || p === "bot") return "BOTTOM";
  if (p === "utility" || p === "support") return "UTILITY";
  return null;
}

function mapChampSelect(session) {
  if (!session || typeof session !== "object") return null;
  const localCell = Number(session.localPlayerCellId);
  const myTeam = Array.isArray(session.myTeam) ? session.myTeam : [];
  const theirTeam = Array.isArray(session.theirTeam) ? session.theirTeam : [];
  const bansObj = session.bans || {};
  const myBans = Array.isArray(bansObj.myTeamBans) ? bansObj.myTeamBans : [];
  const theirBans = Array.isArray(bansObj.theirTeamBans)
    ? bansObj.theirTeamBans
    : [];

  const toAlly = (p) => {
    const championId = Number(p.championId || p.championPickIntent || 0);
    return {
      championId: championId > 0 ? championId : 0,
      position: mapLcuPosition(p.assignedPosition),
      isMe: Number(p.cellId) === localCell,
    };
  };

  const alliesRaw = myTeam.map(toAlly);
  const enemiesRaw = theirTeam.map((p) => ({
    championId: Number(p.championId || 0) || 0,
    position: mapLcuPosition(p.assignedPosition),
    isMe: false,
  }));

  const me = alliesRaw.find((a) => a.isMe) || null;
  const allies = alliesRaw
    .filter((a) => a.championId > 0)
    .map((a) => ({
      championId: a.championId,
      position: a.position,
      isMe: a.isMe,
    }));
  const enemies = enemiesRaw
    .filter((a) => a.championId > 0)
    .map((a) => ({
      championId: a.championId,
      position: a.position,
      isMe: false,
    }));

  const bans = [...myBans, ...theirBans]
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0);

  const timerPhase =
    session.timer && session.timer.phase != null
      ? String(session.timer.phase)
      : null;

  return {
    myChampionId: me && me.championId > 0 ? me.championId : null,
    myPosition: me?.position ?? null,
    allies,
    enemies,
    bans,
    timerPhase,
  };
}

async function fetchLcuState() {
  const lock = await resolveLcu();
  if (!lock) {
    return {
      active: false,
      draft: null,
      lock: null,
      gameflow: null,
      reason: "lockfile/processo nao encontrado",
    };
  }

  const flowRes = await lcuGet(lock, "/lol-gameflow/v1/gameflow-phase");
  const gameflow =
    flowRes.ok && flowRes.json != null ? String(flowRes.json) : null;

  const champRes = await lcuGet(lock, "/lol-champ-select/v1/session");
  if (champRes.ok && champRes.json && typeof champRes.json === "object") {
    const draft = mapChampSelect(champRes.json);
    return {
      active: true,
      draft,
      lock,
      gameflow: gameflow || "ChampSelect",
      reason: null,
    };
  }

  // Sem sessão de champ select — ainda pode ser loading / lobby
  if (
    gameflow === "ChampSelect" ||
    gameflow === "GameStart" ||
    gameflow === "InProgress" ||
    gameflow === "ReadyCheck"
  ) {
    return {
      active: gameflow === "ChampSelect" || gameflow === "GameStart",
      draft:
        gameflow === "ChampSelect" || gameflow === "GameStart"
          ? {
              myChampionId: null,
              myPosition: null,
              allies: [],
              enemies: [],
              bans: [],
              timerPhase: gameflow,
            }
          : null,
      lock,
      gameflow,
      reason: champRes.status ? `champ-select HTTP ${champRes.status}` : null,
    };
  }

  return {
    active: false,
    draft: null,
    lock,
    gameflow,
    reason:
      !flowRes.ok && flowRes.status === 0
        ? "LCU inacessivel"
        : `gameflow=${gameflow || "n/a"}`,
  };
}

async function pushToServer(payload) {
  const res = await fetch(`${PERSUA_URL}/api/live/client`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  if (!res.ok) {
    throw new Error(
      json?.error || `Persua HTTP ${res.status}: ${text.slice(0, 120)}`,
    );
  }
  return json;
}

let lastPhase = null;
let lastDiagAt = 0;
let lastDiagMsg = "";

async function tick() {
  let wait = POLL_IDLE_MS;
  try {
    const lcd = await fetchLcd();
    const lcu = lcd.inGame
      ? {
          active: false,
          draft: null,
          lock: null,
          gameflow: "InProgress",
          reason: null,
        }
      : await fetchLcuState();

    let phase = "idle";
    let draft = undefined;
    let raw = undefined;
    let inGame = false;

    if (lcd.inGame) {
      phase = "inGame";
      inGame = true;
      raw = lcd.raw;
      wait = POLL_INGAME_MS;
    } else if (lcu.gameflow === "GameStart") {
      phase = "loading";
      draft = lcu.draft || undefined;
      wait = POLL_DRAFT_MS;
    } else if (lcu.active && lcu.draft) {
      const tp = String(lcu.draft.timerPhase || lcu.gameflow || "").toUpperCase();
      if (tp.includes("GAME_START") || tp === "FINALIZATION") {
        phase = "loading";
      } else {
        phase = "draft";
      }
      draft = lcu.draft;
      wait = POLL_DRAFT_MS;
    } else {
      phase = "idle";
      wait = POLL_IDLE_MS;
    }

    const body = { phase, inGame };
    if (PUUID) body.puuid = PUUID;
    if (raw) body.raw = raw;
    if (draft) body.draft = draft;

    await pushToServer(body);

    if (lastPhase !== phase) {
      const extra = lcu.lock ? ` LCU:${lcu.lock.port}` : "";
      const flow = lcu.gameflow ? ` gameflow=${lcu.gameflow}` : "";
      console.log(
        `\n[bridge] ${new Date().toLocaleTimeString()} → ${phase}${extra}${flow}`,
      );
      lastPhase = phase;
    } else if (phase === "inGame") {
      const t = Math.floor(lcd.raw?.gameData?.gameTime ?? 0);
      process.stdout.write(
        `\r[bridge] in-game ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}   `,
      );
    } else if (phase === "draft") {
      const bans = draft?.bans?.length ?? 0;
      const picks =
        (draft?.allies?.length ?? 0) + (draft?.enemies?.length ?? 0);
      process.stdout.write(
        `\r[bridge] draft bans=${bans} picks=${picks}   `,
      );
    } else if (phase === "idle") {
      const now = Date.now();
      const msg = lcu.lock
        ? `LCU ok :${lcu.lock.port} (${lcu.lock.path}) · ${lcu.reason || lcu.gameflow || "aguardando selecao"}`
        : `LCU nao encontrado · ${lcu.reason || "abra o cliente LoL"}`;
      if (now - lastDiagAt > 15000 || msg !== lastDiagMsg) {
        console.log(`\n[bridge] ${msg}`);
        lastDiagAt = now;
        lastDiagMsg = msg;
      }
    }
  } catch (err) {
    console.error(`\n[bridge] erro: ${err.message || err}`);
  }

  setTimeout(tick, wait);
}

console.log(`[bridge] Persua: ${PERSUA_URL}`);
console.log(`[bridge] LCD: ${LCD_URL}`);
console.log("[bridge] LCU: processo LeagueClientUx + lockfile + gameflow");
console.log("[bridge] Aguardando seleção ou partida… (Ctrl+C para sair)");
tick();

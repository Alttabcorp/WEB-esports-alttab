/**
 * League Persua — Live Client Bridge
 * Roda no PC de jogo. Lê https://127.0.0.1:2999 e POST no servidor.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

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
const POLL_IDLE_MS = Number(process.env.POLL_IDLE_MS || 8000);

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

function fetchLcd() {
  return new Promise((resolvePromise, reject) => {
    const req = https.get(LCD_URL, { agent: httpsAgent, timeout: 2500 }, (res) => {
      let data = "";
      res.on("data", (c) => {
        data += c;
      });
      res.on("end", () => {
        if (res.statusCode === 404) {
          resolvePromise({ inGame: false, raw: null });
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`LCD HTTP ${res.statusCode}`));
          return;
        }
        try {
          resolvePromise({ inGame: true, raw: JSON.parse(data) });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", (err) => {
      // ECONNREFUSED = fora de partida / client fechado
      if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
        resolvePromise({ inGame: false, raw: null });
        return;
      }
      reject(err);
    });
    req.on("timeout", () => {
      req.destroy();
      resolvePromise({ inGame: false, raw: null });
    });
  });
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
    throw new Error(json?.error || `Persua HTTP ${res.status}: ${text.slice(0, 120)}`);
  }
  return json;
}

let lastInGame = null;

async function tick() {
  try {
    const lcd = await fetchLcd();
    const body = {
      inGame: lcd.inGame,
      raw: lcd.raw ?? undefined,
    };
    if (PUUID) body.puuid = PUUID;

    await pushToServer(body);

    if (lastInGame !== lcd.inGame) {
      console.log(
        `[bridge] ${new Date().toLocaleTimeString()} → ${
          lcd.inGame ? "IN-GAME (enviando Live Client)" : "fora de partida (heartbeat)"
        }`,
      );
      lastInGame = lcd.inGame;
    } else if (lcd.inGame) {
      const t = Math.floor(lcd.raw?.gameData?.gameTime ?? 0);
      process.stdout.write(
        `\r[bridge] in-game ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}   `,
      );
    }
  } catch (err) {
    console.error(`\n[bridge] erro: ${err.message || err}`);
  }

  const wait = lastInGame ? POLL_INGAME_MS : POLL_IDLE_MS;
  setTimeout(tick, wait);
}

console.log(`[bridge] Persua: ${PERSUA_URL}`);
console.log(`[bridge] LCD: ${LCD_URL}`);
console.log("[bridge] Aguardando partida… (Ctrl+C para sair)");
tick();

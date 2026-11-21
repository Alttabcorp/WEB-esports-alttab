/**
 * Copia o live-bridge para public/bridge (servido na LAN pelo Next).
 */
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "agents/live-bridge");
const dest = resolve(root, "public/bridge");

const files = [
  "bridge.mjs",
  "package.json",
  "Iniciar-Bridge.bat",
  "Iniciar-Bridge.ps1",
  "Atualizar-e-Iniciar.bat",
  "install.ps1",
  ".env.example",
];

if (existsSync(dest)) {
  rmSync(dest, { recursive: true, force: true });
}
mkdirSync(dest, { recursive: true });

for (const name of files) {
  const from = resolve(src, name);
  if (!existsSync(from)) {
    console.warn(`[sync-bridge] skip missing ${name}`);
    continue;
  }
  cpSync(from, resolve(dest, name));
}

// Template público sem URL real (Config gera o .bat personalizado)
const bootstrap = resolve(dest, "Atualizar-e-Iniciar.bat");
if (existsSync(bootstrap)) {
  let text = readFileSync(bootstrap, "utf8");
  if (!text.includes("__PERSUA_URL__")) {
    // ok
  }
  writeFileSync(bootstrap, text);
}

console.log(`[sync-bridge] ${files.length} arquivos → public/bridge`);

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

const FALLBACK = `# League Persua — instala/atualiza live-bridge
$ErrorActionPreference = "Stop"
$base = if ($env:PERSUA_URL) { $env:PERSUA_URL.TrimEnd("/") } else { "http://192.168.18.45:3001" }
$dir = Join-Path $env:LOCALAPPDATA "LeaguePersua\\live-bridge"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Write-Host "Persua: $base"
Write-Host "Pasta:  $dir"
foreach ($f in @("bridge.mjs","package.json","Iniciar-Bridge.bat","Iniciar-Bridge.ps1","Atualizar-e-Iniciar.bat")) {
  Write-Host "  baixando $f"
  Invoke-WebRequest -UseBasicParsing -Uri "$base/bridge/$f" -OutFile (Join-Path $dir $f)
}
Invoke-WebRequest -UseBasicParsing -Uri "$base/api/live/bridge-env" -OutFile (Join-Path $dir ".env")
$batPath = Join-Path $dir "Atualizar-e-Iniciar.bat"
$bat = (Get-Content $batPath -Raw).Replace("__PERSUA_URL__", $base)
Set-Content -Path $batPath -Value $bat -Encoding Ascii
$startup = Join-Path $env:APPDATA "Microsoft\\Windows\\Start Menu\\Programs\\Startup\\LeaguePersua-Bridge.lnk"
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($startup)
$sc.TargetPath = $batPath
$sc.WorkingDirectory = $dir
$sc.Save()
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[ERRO] Node.js nao encontrado. Instale LTS em https://nodejs.org/"
  exit 1
}
Start-Process -FilePath "cmd.exe" -ArgumentList "/k","cd /d \`"\$dir\`" && node bridge.mjs" -WorkingDirectory $dir
Write-Host "OK"
`;

/** PowerShell one-liner: irm http://IP:3001/api/live/bridge-install | iex */
export async function GET() {
  const candidates = [
    join(process.cwd(), "public", "bridge", "install.ps1"),
    join(process.cwd(), "agents", "live-bridge", "install.ps1"),
  ];
  let body = FALLBACK;
  for (const path of candidates) {
    if (existsSync(path)) {
      body = readFileSync(path, "utf8");
      break;
    }
  }
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

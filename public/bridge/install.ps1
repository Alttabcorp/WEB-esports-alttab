# League Persua — instala/atualiza live-bridge e sobe o agente
$ErrorActionPreference = "Stop"
$base = if ($env:PERSUA_URL) { $env:PERSUA_URL.TrimEnd("/") } else { "http://192.168.18.45:3001" }
$dir = Join-Path $env:LOCALAPPDATA "LeaguePersua\live-bridge"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Write-Host "Persua: $base"
Write-Host "Pasta:  $dir"

$files = @(
  "bridge.mjs",
  "package.json",
  "Iniciar-Bridge.bat",
  "Iniciar-Bridge.ps1",
  "Atualizar-e-Iniciar.bat"
)
foreach ($f in $files) {
  Write-Host "  baixando $f"
  Invoke-WebRequest -UseBasicParsing -Uri "$base/bridge/$f" -OutFile (Join-Path $dir $f)
}

Write-Host "  baixando .env"
Invoke-WebRequest -UseBasicParsing -Uri "$base/api/live/bridge-env" -OutFile (Join-Path $dir ".env")

$batPath = Join-Path $dir "Atualizar-e-Iniciar.bat"
$bat = Get-Content $batPath -Raw
$bat = $bat.Replace("__PERSUA_URL__", $base)
Set-Content -Path $batPath -Value $bat -Encoding Ascii

$startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\LeaguePersua-Bridge.lnk"
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($startup)
$sc.TargetPath = $batPath
$sc.WorkingDirectory = $dir
$sc.WindowStyle = 1
$sc.Description = "League Persua Live Bridge"
$sc.Save()
Write-Host "Atalho Startup: $startup"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[ERRO] Node.js nao encontrado. Instale LTS em https://nodejs.org/"
  Read-Host "Enter para sair"
  exit 1
}

Write-Host "Iniciando bridge..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$dir`" && node bridge.mjs" -WorkingDirectory $dir
Write-Host "OK"

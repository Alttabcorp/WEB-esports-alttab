$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$Host.UI.RawUI.WindowTitle = "League Persua — Live Bridge"
$log = Join-Path $PSScriptRoot "bridge-log.txt"

function Write-Log([string]$msg) {
  Add-Content -Path $log -Value $msg
}

"===== $(Get-Date) =====" | Set-Content -Path $log
Write-Log "Pasta: $PSScriptRoot"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " League Persua — Live Bridge" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pasta: $PSScriptRoot"
Write-Host ""
Write-Host "NAO rode como Administrador." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path ".env") -and (Test-Path "league-persua-bridge.env")) {
  Rename-Item "league-persua-bridge.env" ".env"
  Write-Host "Renomeado league-persua-bridge.env -> .env"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[ERRO] Node.js nao encontrado." -ForegroundColor Red
  Write-Host "Instale LTS em https://nodejs.org/ marcando Add to PATH,"
  Write-Host "feche a janela e abra de novo SEM administrador."
  Write-Log "[ERRO] Node.js nao encontrado"
  Read-Host "Enter para sair"
  exit 1
}

$nodeVer = node -v
Write-Host "Node: $nodeVer"
Write-Log "Node: $nodeVer"

if (-not (Test-Path "bridge.mjs")) {
  Write-Host "[ERRO] bridge.mjs ausente nesta pasta." -ForegroundColor Red
  Write-Log "[ERRO] bridge.mjs ausente"
  Read-Host "Enter para sair"
  exit 1
}

if (-not (Test-Path ".env")) {
  Write-Host "[ERRO] Falta o arquivo .env nesta pasta:" -ForegroundColor Red
  Write-Host "  $PSScriptRoot"
  Write-Log "[ERRO] .env ausente"
  Read-Host "Enter para sair"
  exit 1
}

Write-Host ".env: OK"
Write-Log ".env: OK"
Write-Host ""
Write-Host "Iniciando bridge... Ctrl+C para parar"
Write-Host "----------------------------------------"

try {
  node bridge.mjs 2>&1 | Tee-Object -FilePath $log -Append
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Log $_.Exception.Message
}

Write-Host ""
Write-Host "Log salvo em: $log"
Read-Host "Enter para sair"

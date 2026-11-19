$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$Host.UI.RawUI.WindowTitle = "League Persua — Live Bridge"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[ERRO] Node.js nao encontrado. Instale LTS em https://nodejs.org/" -ForegroundColor Red
  Read-Host "Enter para sair"
  exit 1
}

if (-not (Test-Path ".env")) {
  Write-Host "[AVISO] Falta o arquivo .env" -ForegroundColor Yellow
  Write-Host "Baixe em Config > Bridge do PC de jogo e salve como .env aqui:"
  Write-Host "  $PSScriptRoot"
  Read-Host "Enter para sair"
  exit 1
}

Write-Host "League Persua Live Bridge" -ForegroundColor Cyan
Write-Host "Ctrl+C para parar`n"
node bridge.mjs

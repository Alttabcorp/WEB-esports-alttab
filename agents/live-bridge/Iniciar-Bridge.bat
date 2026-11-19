@echo off
chcp 65001 >nul
title League Persua — Live Bridge
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao encontrado.
  echo Baixe o LTS em https://nodejs.org/ e reinstale marcando "Add to PATH".
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  echo.
  echo [AVISO] Arquivo .env nao encontrado nesta pasta.
  echo.
  echo 1. Abra o League Persua no navegador -^> Config
  echo 2. Em "Bridge do PC de jogo", clique Baixar .env
  echo 3. Renomeie o arquivo para .env e coloque nesta pasta
  echo    (%cd%)
  echo.
  pause
  exit /b 1
)

echo.
echo League Persua Live Bridge
echo Pasta: %cd%
echo Ctrl+C para parar
echo.
node bridge.mjs
echo.
pause

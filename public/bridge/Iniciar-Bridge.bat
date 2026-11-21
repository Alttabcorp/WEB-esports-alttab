@echo off
chcp 65001 >nul
title League Persua Live Bridge
cd /d "%~dp0"

set "LOG=%~dp0bridge-log.txt"
echo ===== %date% %time% ===== > "%LOG%"
echo Pasta: %cd% >> "%LOG%"
echo.

echo ========================================
echo  League Persua - Live Bridge
echo ========================================
echo Pasta: %cd%
echo.
echo NAO rode como Administrador.
echo Clique normal com o botao esquerdo.
echo.

if not exist ".env" (
  if exist "league-persua-bridge.env" (
    echo Renomeando league-persua-bridge.env para .env ...
    ren "league-persua-bridge.env" ".env"
  )
)

where node >nul 2>&1
if errorlevel 1 goto :NO_NODE

for /f "delims=" %%v in ('node -v 2^>^&1') do set "NODEVER=%%v"
echo Node: %NODEVER%
echo Node: %NODEVER% >> "%LOG%"

if not exist "bridge.mjs" goto :NO_BRIDGE
if not exist ".env" goto :NO_ENV

echo .env: OK
echo .env: OK >> "%LOG%"
echo.
echo Iniciando bridge... Ctrl+C para parar
echo ----------------------------------------
echo.

node bridge.mjs
set "ERR=%ERRORLEVEL%"
echo.
echo ----------------------------------------
echo Bridge encerrou com codigo %ERR%
echo Bridge exit=%ERR% >> "%LOG%"
echo.
echo Se apareceu erro acima, tire um print ou abra:
echo %LOG%
echo.
pause
exit /b %ERR%

:NO_NODE
echo.
echo [ERRO] Node.js nao encontrado.
echo.
echo Instale o Node.js LTS:
echo   https://nodejs.org/
echo.
echo Na instalacao, marque a opcao Add to PATH.
echo Depois FECHE esta janela e abra o .bat de novo.
echo.
echo [ERRO] Node.js nao encontrado >> "%LOG%"
echo Log: %LOG%
echo.
pause
exit /b 1

:NO_BRIDGE
echo.
echo [ERRO] bridge.mjs nao esta nesta pasta.
echo Pasta atual: %cd%
echo.
echo [ERRO] bridge.mjs ausente >> "%LOG%"
pause
exit /b 1

:NO_ENV
echo.
echo [ERRO] Arquivo .env nao encontrado.
echo Coloque o .env em:
echo   %cd%
echo.
echo [ERRO] .env ausente >> "%LOG%"
echo Log: %LOG%
echo.
pause
exit /b 1

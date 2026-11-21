@echo off
chcp 65001 >nul
title League Persua - Bridge auto
setlocal EnableExtensions

REM URL do Persua na sua rede
set "PERSUA_URL=__PERSUA_URL__"
set "DIR=%LOCALAPPDATA%\LeaguePersua\live-bridge"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo ========================================
echo  League Persua - Bridge automatico
echo ========================================
echo Servidor: %PERSUA_URL%
echo Pasta:    %DIR%
echo.

if "%PERSUA_URL%"=="__PERSUA_URL__" (
  echo [ERRO] Baixe este .bat em Config no site do Persua.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  echo Instale LTS em https://nodejs.org/ marcando Add to PATH.
  pause
  exit /b 1
)

if not exist "%DIR%" mkdir "%DIR%"
cd /d "%DIR%"

echo Baixando arquivos do bridge...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $base='%PERSUA_URL%'.TrimEnd('/'); $dir='%DIR%'; $files=@('bridge.mjs','package.json','Iniciar-Bridge.bat','Iniciar-Bridge.ps1'); foreach($f in $files){ Write-Host ('  '+$f); Invoke-WebRequest -UseBasicParsing -Uri ($base+'/bridge/'+$f) -OutFile (Join-Path $dir $f) }; Invoke-WebRequest -UseBasicParsing -Uri ($base+'/api/live/bridge-env') -OutFile (Join-Path $dir '.env')"
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao baixar. Confira se o PC alcanca %PERSUA_URL%
  pause
  exit /b 1
)

copy /Y "%~f0" "%DIR%\Atualizar-e-Iniciar.bat" >nul

if not exist "%DIR%\bridge.mjs" (
  echo [ERRO] bridge.mjs nao baixou.
  pause
  exit /b 1
)
if not exist "%DIR%\.env" (
  echo [ERRO] .env nao baixou.
  pause
  exit /b 1
)

echo Arquivos OK.
echo.

if not exist "%STARTUP%\LeaguePersua-Bridge.lnk" (
  echo Criando atalho na Inicializacao do Windows...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $p=Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup\LeaguePersua-Bridge.lnk'; $sc=$ws.CreateShortcut($p); $sc.TargetPath=(Join-Path $env:LOCALAPPDATA 'LeaguePersua\live-bridge\Atualizar-e-Iniciar.bat'); $sc.WorkingDirectory=(Join-Path $env:LOCALAPPDATA 'LeaguePersua\live-bridge'); $sc.WindowStyle=1; $sc.Description='League Persua Live Bridge'; $sc.Save(); Write-Host 'Atalho criado.'"
)

echo Iniciando bridge... Ctrl+C para parar
echo ----------------------------------------
node bridge.mjs
echo.
echo Bridge encerrou.
pause

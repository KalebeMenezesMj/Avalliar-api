@echo off
rem ============================================================
rem  Avalliar - relay residencial + tunnel gratuito (Cloudflare)
rem
rem  1. Abre o relay (python infra\relay.py, porta 8899) na janela "Relay".
rem  2. Baixa o cloudflared.exe na 1a vez e abre um Quick Tunnel que
rem     imprime uma URL tipo https://xxxx.trycloudflare.com
rem
rem  Depois copie a URL e atualize a VPS:
rem    az containerapp update -n avalliar-ml -g rg-avalliar ^
rem      --set-env-vars "VIVAREAL_RELAY=https://xxxx.trycloudflare.com" "VIVAREAL_RELAY_KEY=<mesma RELAY_KEY>"
rem
rem  Para encerrar: feche as duas janelas. A URL muda a cada execucao
rem  (no dia em que abrir de novo, rode o az update outra vez).
rem ============================================================
setlocal
cd /d "%~dp0"

if "%RELAY_KEY%"=="" (
    echo AVISO: RELAY_KEY nao definida; o tunnel ficara sem senha.
    echo Exemplo:  set RELAY_KEY=uma-frase-secreta   e so abrir este script depois.
    echo.
)

if not exist cloudflared.exe (
    echo Baixando cloudflared.exe (1a vez, ~40 MB)...
    curl -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    if errorlevel 1 (
        echo Falha ao baixar. Instale manualmente:  winget install Cloudflare.cloudflared
        pause
        exit /b 1
    )
)

start "Relay Avalliar" cmd /k "set "RELAY_KEY=%RELAY_KEY%" && python "%~dp0relay.py""
timeout /t 2 /nobreak >nul
start "Tunnel Avalliar" cmd /k "%~dp0cloudflared.exe" tunnel --url http://localhost:8899 --loglevel info

echo.
echo Pronto. A URL do tunnel aparece na janela "Tunnel Avalliar" (https://...trycloudflare.com).
endlocal

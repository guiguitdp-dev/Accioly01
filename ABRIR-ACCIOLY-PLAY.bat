@echo off
chcp 65001 >nul
rem Accioly Play - liga o servidor (se precisar) e abre o app em janela propria.
rem Uso: ABRIR-ACCIOLY-PLAY.bat          -> app da TV
rem      ABRIR-ACCIOLY-PLAY.bat admin    -> Painel do Dono
cd /d "%~dp0"
set "URL=http://localhost:3000/tv/"
if /i "%~1"=="admin" set "URL=http://localhost:3000/admin/"

where node >nul 2>nul
if errorlevel 1 goto semnode

rem Servidor ja esta ligado?
powershell -NoProfile -Command "try { $null = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri 'http://localhost:3000/health'; exit 0 } catch { exit 1 }"
if not errorlevel 1 goto abrir
start "Accioly Play - servidor (pode minimizar, nao feche)" /min node server\server.js
powershell -NoProfile -Command "for ($i=0; $i -lt 40; $i++) { try { $null = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri 'http://localhost:3000/health'; exit 0 } catch { Start-Sleep -Milliseconds 500 } }; exit 1"

:abrir
if /i "%~1"=="admin" goto navegador
rem Abre como aplicativo (sem barra de endereco), com perfil proprio para guardar o login
set "PERFIL=%LOCALAPPDATA%\AcciolyPlay\navegador"
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" goto edge
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" goto chrome
goto navegador

:edge
start "" "%EDGE%" --app=%URL% --start-maximized --user-data-dir="%PERFIL%"
exit /b 0

:chrome
start "" "%CHROME%" --app=%URL% --start-maximized --user-data-dir="%PERFIL%"
exit /b 0

:navegador
start "" "%URL%"
exit /b 0

:semnode
echo O Node.js ainda nao esta instalado neste computador.
echo Vou abrir o instalador (INSTALAR-WINDOWS.bat)...
timeout /t 3 >nul
call "%~dp0INSTALAR-WINDOWS.bat"

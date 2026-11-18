@echo off
chcp 65001 >nul
title Accioly Play - Instalador
cd /d "%~dp0"
echo ==========================================================
echo   ACCIOLY PLAY - instalando e ligando no seu computador
echo ==========================================================
echo.
where node >nul 2>nul
if not errorlevel 1 goto temnode
echo [1/3] Node.js nao encontrado. Instalando pelo winget...
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto semwinget
echo.
echo Node.js instalado! FECHE esta janela e abra o INSTALAR-WINDOWS.bat de novo.
pause
exit /b 0

:semwinget
echo Nao consegui instalar sozinho. Vou abrir o site: baixe a versao LTS, instale e rode este arquivo de novo.
start https://nodejs.org/pt
pause
exit /b 1

:temnode
echo [1/3] Node.js OK
echo [2/3] Montando a pasta do pendrive (dist\pendrive\AcciolyPlay)...
call node scripts\build-pendrive.js
echo.
echo [3/3] Ligando o servidor. O Painel do Dono vai abrir no navegador.
echo        Se o Windows perguntar sobre o Firewall, clique em PERMITIR (para a TV conseguir acessar).
echo        Para desligar, feche esta janela.
echo.
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000/admin/"
node server\server.js
pause

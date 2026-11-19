@echo off
chcp 65001 >nul
rem Accioly Play - monta o app do pendrive e copia para o pendrive conectado.
rem Depois e so colocar o pendrive no computador/notebook e dar dois cliques
rem em "ABRIR ACCIOLY PLAY" (ou instalar o APK na Android TV).
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo O Node.js nao esta instalado. Rode INSTALAR-WINDOWS.bat primeiro.
  pause
  exit /b 1
)
echo [1/2] Montando o app do pendrive...
call node scripts\build-pendrive.js
if errorlevel 1 ( pause & exit /b 1 )
echo.
echo [2/2] Procurando o pendrive...
rem Uso opcional: COPIAR-PARA-PENDRIVE.bat E   (forca a letra do pendrive)
set "ALVO=%~1"
if not defined ALVO for /f "usebackq delims=" %%L in (`powershell -NoProfile -Command "$d = @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=2' | Where-Object { $_.Size }); if ($d.Count -eq 1) { $d[0].DeviceID }"`) do set "ALVO=%%L"
if not defined ALVO (
  powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=2' | Where-Object { $_.Size } | ForEach-Object { '  ' + $_.DeviceID + '  ' + $_.VolumeName + '  (' + [math]::Round($_.Size/1GB,1) + ' GB)' }"
  echo.
  echo Nao achei exatamente 1 pendrive conectado.
  set /p "ALVO=Digite a letra do pendrive (ex.: E) ou Enter para cancelar: "
)
if not defined ALVO ( echo Cancelado. & pause & exit /b 1 )
set "ALVO=%ALVO::=%"
set "ALVO=%ALVO:~0,1%:"
if not exist "%ALVO%\" ( echo Unidade %ALVO% nao encontrada. & pause & exit /b 1 )
echo Copiando para o pendrive %ALVO% ...
robocopy "dist\pendrive\AcciolyPlay" %ALVO%\ /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1
if errorlevel 8 ( echo Erro ao copiar. O pendrive esta cheio ou protegido? & pause & exit /b 1 )
echo.
echo Pronto! Pendrive %ALVO% preparado.
echo  - Computador/notebook Windows: dois cliques em "ABRIR ACCIOLY PLAY".
echo  - Mac/Linux: dois cliques em "ABRIR NO MAC OU LINUX.html".
echo  - Android TV / TV Box: instale o AcciolyPlay-AndroidTV.apk (se estiver no pendrive).
echo Leia o LEIA-ME.txt do pendrive para mais detalhes.
pause
exit /b 0
@echo off
chcp 65001 >nul
title Accioly Play - Instalar no Android
cd /d "%~dp0"
echo ==========================================================
echo   ACCIOLY PLAY - instalar no celular Android / Android TV
echo ==========================================================
set "APK="
if exist "AcciolyPlay-AndroidTV.apk" set "APK=AcciolyPlay-AndroidTV.apk"
for %%f in (dist\apk\*.apk) do set "APK=%%f"
if not "%APK%"=="" goto achou
echo.
echo Nao achei o APK. Baixe em: GitHub ^> Actions ^> "Gerar APK Android TV" ^> Artifacts
echo Descompacte e coloque o arquivo .apk na pasta dist\apk e rode de novo.
pause
exit /b 1

:achou
echo APK: %APK%
set "ADB=adb"
where adb >nul 2>nul
if not errorlevel 1 goto temadb
if exist "tools\platform-tools\adb.exe" goto adblocal
echo Baixando as ferramentas oficiais do Android (Google platform-tools)...
powershell -NoProfile -Command "Invoke-WebRequest https://dl.google.com/android/repository/platform-tools-latest-windows.zip -OutFile tools.zip; Expand-Archive tools.zip -DestinationPath tools -Force; Remove-Item tools.zip"
:adblocal
set "ADB=tools\platform-tools\adb.exe"

:temadb
echo.
echo Como o aparelho esta ligado?
echo   1) Celular Android no cabo USB (ative "Depuracao USB" nas Opcoes do desenvolvedor)
echo   2) Android TV / TV Box / celular na mesma rede Wi-Fi (ative "Depuracao" / "Depuracao por rede")
set /p MODO=Digite 1 ou 2 e aperte Enter: 
if "%MODO%"=="2" goto wifi
goto instalar

:wifi
set /p IP=Digite o IP do aparelho (Configuracoes ^> Rede ^> Status), ex. 192.168.0.20: 
"%ADB%" connect %IP%:5555
echo Se a TV mostrar "Permitir depuracao?", escolha PERMITIR e rode este arquivo de novo se falhar.

:instalar
"%ADB%" devices
"%ADB%" install -r "%APK%"
if errorlevel 1 goto falhou
echo.
echo INSTALADO! Abra o "Accioly Play" no aparelho e digite o endereco que aparece na janela do servidor
echo (linha "Na TV (mesma rede Wi-Fi)").
pause
exit /b 0

:falhou
echo.
echo Nao deu certo. Confira: depuracao ativada, aparelho autorizado ("Permitir"), mesmo Wi-Fi.
echo Alternativa sem cabo: copie o APK no pendrive e instale com um gerenciador de arquivos (docs\INSTALAR-NA-TV.md).
pause
exit /b 1

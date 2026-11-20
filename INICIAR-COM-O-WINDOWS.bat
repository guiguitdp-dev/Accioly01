@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
(
  echo @echo off
  echo cd /d "%~dp0"
  echo if exist "%~dp0ATUALIZAR.bat" call "%~dp0ATUALIZAR.bat" auto
  echo start "Accioly Play" /min node server\server.js
) > "%STARTUP%\AcciolyPlay.bat"
echo Pronto! O servidor do Accioly Play vai ligar sozinho quando o Windows iniciar
echo (e se atualizar sozinho pelo GitHub antes de ligar).
echo Para desfazer, apague o arquivo: %STARTUP%\AcciolyPlay.bat
pause

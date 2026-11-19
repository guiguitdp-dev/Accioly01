@echo off
chcp 65001 >nul
rem Liga o servidor do Accioly Play junto com o Windows.
rem Cria um atalho (.lnk) na pasta Inicializar. O atalho guarda o caminho em
rem Unicode, entao funciona mesmo em pastas com acento (ex.: C:\Users\Usuario
rem com acento), o que um .bat gerado nao garante: no boot o cmd le o arquivo
rem em outra pagina de codigo e o "cd" falha.
cd /d "%~dp0"
set "AP_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$dir = $env:AP_DIR; $startup = [Environment]::GetFolderPath('Startup'); $antigo = Join-Path $startup 'AcciolyPlay.bat'; if (Test-Path $antigo) { Remove-Item $antigo -Force }; $ws = New-Object -ComObject WScript.Shell; $l = $ws.CreateShortcut((Join-Path $startup 'AcciolyPlay.lnk')); $l.TargetPath = $env:ComSpec; $l.Arguments = '/c start \"Accioly Play\" /min node server\server.js'; $l.WorkingDirectory = $dir; $l.IconLocation = (Join-Path $dir 'app\icon.ico') + ',0'; $l.WindowStyle = 7; $l.Description = 'Accioly Play - servidor'; $l.Save(); Write-Host ''; Write-Host 'Pronto! O servidor do Accioly Play vai ligar sozinho quando o Windows iniciar.'; Write-Host ('Para desfazer, apague o arquivo: ' + (Join-Path $startup 'AcciolyPlay.lnk'))"
if errorlevel 1 (
  echo Nao consegui configurar o inicio automatico.
  echo Alternativa: aperte Win+R, digite shell:startup e coloque la um atalho para ABRIR-ACCIOLY-PLAY.bat.
)
echo.
pause

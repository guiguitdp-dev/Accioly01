@echo off
chcp 65001 >nul
rem Cria os atalhos do Accioly Play na Area de Trabalho e no Menu Iniciar.
cd /d "%~dp0"
set "AP_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$dir = $env:AP_DIR; $ws = New-Object -ComObject WScript.Shell; $alvo = Join-Path $dir 'ABRIR-ACCIOLY-PLAY.bat'; $icone = (Join-Path $dir 'app\icon.ico') + ',0'; $lista = @( @([Environment]::GetFolderPath('Desktop'), 'Accioly Play', ''), @([Environment]::GetFolderPath('Desktop'), 'Accioly Play - Painel do Dono', 'admin'), @([Environment]::GetFolderPath('Programs'), 'Accioly Play', '') ); foreach ($a in $lista) { $l = $ws.CreateShortcut((Join-Path $a[0] ($a[1] + '.lnk'))); $l.TargetPath = $alvo; $l.Arguments = $a[2]; $l.WorkingDirectory = $dir; $l.IconLocation = $icone; $l.WindowStyle = 7; $l.Description = 'Accioly Play - TV, filmes e jogos'; $l.Save() }; Write-Host ''; Write-Host 'Pronto! Atalhos criados:'; Write-Host ' - Area de Trabalho: Accioly Play'; Write-Host ' - Area de Trabalho: Accioly Play - Painel do Dono'; Write-Host ' - Menu Iniciar: Accioly Play'"
if errorlevel 1 (
  echo Nao consegui criar os atalhos automaticamente.
  echo Alternativa: clique com o botao direito em ABRIR-ACCIOLY-PLAY.bat ^> Enviar para ^> Area de trabalho.
)
echo.
pause

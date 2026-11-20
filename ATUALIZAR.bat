<# : Accioly Play - atualizador
@echo off
rem Arquivo hibrido: o Windows roda a parte de baixo no PowerShell.
rem Baixa a versao mais nova do Accioly Play do GitHub. Seus dados (server\data) ficam intactos.
rem Uso: dois cliques  |  ATUALIZAR.bat auto  (usado pelo atalho: rapido e silencioso se ja estiver em dia)
set "AP_DIR=%~dp0"
set "AP_MODO=%~1"
set "AP_SELF=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ([IO.File]::ReadAllText($env:AP_SELF))" & if /i not "%~1"=="auto" pause & exit /b
exit /b
: fim da parte do Windows / inicio do PowerShell #>
$ErrorActionPreference = 'Stop'
$dir = $env:AP_DIR.TrimEnd('\')
$auto = $env:AP_MODO -eq 'auto'
$repo = 'guiguitdp-dev/Accioly01'
$verFile = Join-Path $dir '.versao'
$ua = @{ 'User-Agent' = 'AcciolyPlay-Atualizador' }
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
try {
  $sha = (Invoke-RestMethod -UseBasicParsing -TimeoutSec 8 -Headers $ua -Uri "https://api.github.com/repos/$repo/commits/main").sha
} catch {
  if (-not $auto) { Write-Host 'Sem internet (ou GitHub fora do ar). Tente de novo depois.' }
  exit 1
}
$git = Test-Path (Join-Path $dir '.git')
$atual = ''
if ($git) { try { $atual = (& git -C $dir rev-parse HEAD 2>$null) } catch {} }
elseif (Test-Path $verFile) { $atual = (Get-Content $verFile -Raw).Trim() }
if ($atual -and $sha -and ($atual.Trim() -eq $sha)) { if (-not $auto) { Write-Host 'Voce ja tem a versao mais nova do Accioly Play.' }; exit 0 }
Write-Host 'Baixando a versao nova do Accioly Play...'
if ($git) {
  $ErrorActionPreference = 'Continue'
  & git -C $dir pull --ff-only -q
  if ($LASTEXITCODE -eq 0) { Write-Host 'Pronto! Accioly Play atualizado.'; exit 10 }
  Write-Host 'Nao deu para atualizar pelo git (ha arquivos mudados nesta pasta).'
  exit 1
}
$tmp = Join-Path $env:TEMP ('accioly-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  $zip = Join-Path $tmp 'main.zip'
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 180 -Headers $ua -Uri "https://codeload.github.com/$repo/zip/refs/heads/main" -OutFile $zip
  Expand-Archive -Path $zip -DestinationPath (Join-Path $tmp 'x') -Force
  $src = (Get-ChildItem (Join-Path $tmp 'x') -Directory | Select-Object -First 1).FullName
  # Os .bat em uso nao podem ser trocados com o atalho aberto: no modo automatico vao depois
  $xf = @(); if ($auto) { $xf = @('/XF', '*.bat') }
  & robocopy $src $dir /E /XD data .git node_modules dist /NFL /NDL /NJH /NJS /NP @xf | Out-Null
  if ($LASTEXITCODE -ge 8) { Write-Host 'Erro ao copiar os arquivos novos.'; exit 1 }
  if ($auto) {
    $bats = Join-Path $env:TEMP 'accioly-bats'
    if (Test-Path $bats) { Remove-Item $bats -Recurse -Force }
    New-Item -ItemType Directory -Path $bats | Out-Null
    Copy-Item (Join-Path $src '*.bat') $bats
    $cmd = "Start-Sleep -Seconds 45; Copy-Item -Path '$bats\*.bat' -Destination '$dir' -Force"
    Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile', '-Command', $cmd
  }
  Set-Content -Path $verFile -Value $sha -Encoding ascii
  Write-Host 'Pronto! Accioly Play atualizado.'
  exit 10
} finally {
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}

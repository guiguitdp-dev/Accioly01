# Accioly Play - abridor do pendrive (Windows).
# Serve a pasta "app" do pendrive em http://127.0.0.1 (só neste computador) e abre
# o app em tela cheia no Edge/Chrome. Precisa ser http (e não file://) para o
# player oficial do YouTube tocar dentro do app. Fecha sozinho quando o app fecha.
# Não instala nada e não abre porta para a rede (escuta só em 127.0.0.1).
param([string]$Raiz = (Split-Path -Parent $MyInvocation.MyCommand.Path))

$ErrorActionPreference = 'Stop'
$app = Join-Path $Raiz 'app'
$porta = 8473   # fixa: mantém favoritos e "assistidos recentemente" entre usos

function Find-Browser {
  $c = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
  foreach ($p in $c) { if ($p -and (Test-Path $p)) { return $p } }
  return $null
}

function Open-App([int]$p) {
  $url = "http://127.0.0.1:$p/index.html"
  $b = Find-Browser
  if (-not $b) { Start-Process $url; return $null }
  $perfil = Join-Path $env:LOCALAPPDATA 'AcciolyPlay\pendrive'
  $opcoes = @("--app=$url", "--user-data-dir=`"$perfil`"", '--start-fullscreen',
            '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check')
  return Start-Process -FilePath $b -ArgumentList $opcoes -PassThru
}

$tipos = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.json'='application/json'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml';
  '.ico'='image/x-icon'; '.webp'='image/webp'; '.gif'='image/gif'; '.woff2'='font/woff2'; '.woff'='font/woff';
  '.mp3'='audio/mpeg'; '.ogg'='audio/ogg'; '.wav'='audio/wav'; '.webmanifest'='application/manifest+json'; '.txt'='text/plain; charset=utf-8' }

# Se já existe um Accioly Play aberto (servidor no ar), só abre outra janela
try {
  $t = New-Object Net.Sockets.TcpClient
  $t.Connect('127.0.0.1', $porta); $t.Close()
  Open-App $porta | Out-Null
  exit 0
} catch { }

$ouvinte = $null
foreach ($p in @($porta, 8474, 8475, 8476)) {
  try { $ouvinte = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $p); $ouvinte.Start(); $porta = $p; break }
  catch { $ouvinte = $null }
}
if (-not $ouvinte) { Start-Process (Join-Path $app 'index.html'); exit 1 }

$raizApp = [IO.Path]::GetFullPath($app).TrimEnd('\') + '\'

function Send-Reply($stream, [int]$code, [string]$tipo, [byte[]]$corpo) {
  $txt = @{ 200='OK'; 404='Not Found'; 405='Method Not Allowed' }[$code]
  $cab = "HTTP/1.1 $code $txt`r`nContent-Type: $tipo`r`nContent-Length: $($corpo.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
  $h = [Text.Encoding]::ASCII.GetBytes($cab)
  $stream.Write($h, 0, $h.Length)
  if ($corpo.Length) { $stream.Write($corpo, 0, $corpo.Length) }
}

# Ao vivo de agora de um canal oficial do YouTube (mesma regra de server/lib/health.js).
# O app toca o vídeo pelo player oficial do YouTube (embed), com os anúncios do próprio YouTube.
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$cacheYt = @{}
function Get-YtLive([string]$canal) {
  $r = @{ channelId = $canal; live = $false; videoId = $null }
  if ($canal -notmatch '^UC[\w-]{22}$') { $r.channelId = $null; return $r }
  $c = $cacheYt[$canal]
  if ($c -and ((Get-Date) - $c.em).TotalMinutes -lt 10) { return $c.r }
  try {
    $wc = New-Object Net.WebClient
    $wc.Encoding = [Text.Encoding]::UTF8
    $wc.Headers['User-Agent'] = 'Mozilla/5.0 (Linux; Android 12; Smart TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    $wc.Headers['Accept-Language'] = 'pt-BR,pt;q=0.9'
    $wc.Headers['Cookie'] = 'CONSENT=YES+1'
    $html = $wc.DownloadString("https://www.youtube.com/channel/$canal/live")
    $m = [regex]::Match($html, '"videoDetails":\{"videoId":"([\w-]{11})"[^}]*?"isLive":true')
    if ($m.Success -and $html.Contains('"playabilityStatus":{"status":"OK"')) { $r.live = $true; $r.videoId = $m.Groups[1].Value }
  } catch {
    # Falhou a consulta: o app tenta o endereço live_stream do canal (não guarda no cache)
    $r.live = $true; return $r
  }
  $cacheYt[$canal] = @{ em = Get-Date; r = $r }
  return $r
}

function Serve-Client($cliente) {
  try {
    $cliente.ReceiveTimeout = 3000
    $s = $cliente.GetStream()
    $leitor = New-Object IO.StreamReader($s, [Text.Encoding]::ASCII, $false, 1024, $true)
    $linha = $leitor.ReadLine()
    while ($true) { $l = $leitor.ReadLine(); if ($null -eq $l -or $l -eq '') { break } }
    if (-not $linha) { return }
    $partes = $linha.Split(' ')
    if ($partes[0] -ne 'GET' -and $partes[0] -ne 'HEAD') { Send-Reply $s 405 'text/plain' ([byte[]]@()); return }
    $caminho = [Uri]::UnescapeDataString(($partes[1].Split('?')[0]).TrimStart('/'))
    if ($caminho -eq 'api/yt/resolve') {
      $canal = ''
      $q = $partes[1] -split '\?', 2
      if ($q.Count -gt 1) { foreach ($par in $q[1].Split('&')) { $kv = $par.Split('=', 2); if ($kv[0] -eq 'channelId' -and $kv.Count -gt 1) { $canal = [Uri]::UnescapeDataString($kv[1]) } } }
      $y = Get-YtLive $canal
      $json = '{"channelId":' + $(if ($y.channelId) { '"' + $y.channelId + '"' } else { 'null' }) +
              ',"live":' + $(if ($y.live) { 'true' } else { 'false' }) +
              ',"videoId":' + $(if ($y.videoId) { '"' + $y.videoId + '"' } else { 'null' }) + '}'
      Send-Reply $s 200 'application/json' ([Text.Encoding]::ASCII.GetBytes($json)); return
    }
    if ($caminho -eq '') { $caminho = 'index.html' }
    $arq = [IO.Path]::GetFullPath((Join-Path $raizApp ($caminho -replace '/', '\')))
    # Só arquivos de dentro da pasta app (nada de ..\)
    if (-not $arq.StartsWith($raizApp, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $arq -PathType Leaf)) {
      Send-Reply $s 404 'text/plain' ([Text.Encoding]::ASCII.GetBytes('404')); return
    }
    $tipo = $tipos[[IO.Path]::GetExtension($arq).ToLower()]
    if (-not $tipo) { $tipo = 'application/octet-stream' }
    $corpo = if ($partes[0] -eq 'HEAD') { [byte[]]@() } else { [IO.File]::ReadAllBytes($arq) }
    Send-Reply $s 200 $tipo $corpo
  } catch { } finally { $cliente.Close() }
}

$navegador = Open-App $porta
$inicio = Get-Date
$perfilDir = Join-Path $env:LOCALAPPDATA 'AcciolyPlay\pendrive'

function Test-AppOpen {
  # O navegador pode trocar de processo; confere se ainda há um Edge/Chrome com o nosso perfil
  if ($navegador -and -not $navegador.HasExited) { return $true }
  $ps = Get-CimInstance Win32_Process -Filter "Name='msedge.exe' OR Name='chrome.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine.Contains($perfilDir) }
  return [bool]$ps
}

$ultimaChecagem = Get-Date
while ($true) {
  if ($ouvinte.Pending()) { Serve-Client ($ouvinte.AcceptTcpClient()); continue }
  Start-Sleep -Milliseconds 15
  if (((Get-Date) - $ultimaChecagem).TotalSeconds -ge 5) {
    $ultimaChecagem = Get-Date
    # Sem navegador (abriu no navegador padrão): fica no ar por 8 horas
    if (-not $navegador) { if (((Get-Date) - $inicio).TotalHours -ge 8) { break } }
    elseif (-not (Test-AppOpen)) { break }
  }
}
$ouvinte.Stop()

# Registra a conversa no Obsidian em tempo real.
# Roda como hook do Claude Code: não imprime nada, então não gasta nenhum token.
param([Parameter(Mandatory = $true)][string]$Vault)

$ErrorActionPreference = 'SilentlyContinue'
[Console]::InputEncoding = [Text.Encoding]::UTF8
$d = [Console]::In.ReadToEnd() | ConvertFrom-Json
if (-not $d) { exit 0 }

function Curto([string]$t, [int]$max) {
    if (-not $t) { return '' }
    $t = ($t -replace '\s+', ' ').Trim()
    if ($t.Length -gt $max) { $t = $t.Substring(0, $max) + '…' }
    return $t
}

function Escrever([string]$arquivo, [string]$texto) {
    $utf8 = New-Object Text.UTF8Encoding $false
    [IO.File]::AppendAllText($arquivo, $texto + "`n", $utf8)
}

function UltimaResposta($d) {
    if ($d.last_assistant_message) { return [string]$d.last_assistant_message }
    if (-not (Test-Path -LiteralPath $d.transcript_path)) { return '' }
    $linhas = @(Get-Content -LiteralPath $d.transcript_path -Tail 200 -Encoding UTF8)
    for ($i = $linhas.Count - 1; $i -ge 0; $i--) {
        $o = $linhas[$i] | ConvertFrom-Json
        if ($o.type -ne 'assistant') { continue }
        $txt = @($o.message.content | Where-Object { $_.type -eq 'text' } | ForEach-Object { $_.text }) -join ' '
        if ($txt) { return $txt }
    }
    return ''
}

$projeto = if ($d.cwd) { Split-Path -Leaf $d.cwd } else { 'Geral' }
$projeto = $projeto -replace '[\\/:*?"<>|#\[\]]', '-'
$pasta = Join-Path $Vault "Projetos\$projeto"
New-Item -ItemType Directory -Force -Path $pasta | Out-Null

# Nota do projeto (resumo curto, mantido pela skill obsidian-memoria)
$nota = Join-Path $pasta 'README.md'
if (-not (Test-Path -LiteralPath $nota)) {
    Escrever $nota "# $projeto`n`n**Pasta:** ``$($d.cwd)```n`n## Status`n- (a preencher)`n`n## Decisões`n`n## Próximos passos`n`n## Logs`n"
    $indice = Join-Path $Vault 'Índice.md'
    if (-not (Test-Path -LiteralPath $indice)) { Escrever $indice "# Índice`n" }
    Escrever $indice "- [[Projetos/$projeto/README|$projeto]]"
}

$hoje = Get-Date -Format 'yyyy-MM-dd'
$hora = Get-Date -Format 'HH:mm'
$log = Join-Path $pasta "Log $hoje.md"
if (-not (Test-Path -LiteralPath $log)) {
    Escrever $log "# $projeto — $hoje`n[[Projetos/$projeto/README|← $projeto]]`n"
    Escrever $nota "- [[Projetos/$projeto/Log $hoje|$hoje]]"
}

switch ($d.hook_event_name) {
    'UserPromptSubmit' { Escrever $log "- **$hora** 🧑 $(Curto $d.prompt 300)" }
    'Stop'             { $r = Curto (UltimaResposta $d) 400; if ($r) { Escrever $log "- **$hora** 🤖 $r" } }
    'SessionEnd'       { Escrever $log "- **$hora** ⏹ sessão encerrada`n" }
}
exit 0

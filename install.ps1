# Kit Accioly: memória no Obsidian + economia de tokens para o Claude Code (Windows).
# Uso (PowerShell):
#   irm https://raw.githubusercontent.com/guiguitdp-dev/Accioly01/claude/kit-obsidian/install.ps1 | iex
$ErrorActionPreference = 'Stop'
$base = 'https://raw.githubusercontent.com/guiguitdp-dev/Accioly01/claude/kit-obsidian'
$claude = Join-Path $env:USERPROFILE '.claude'
$utf8 = New-Object Text.UTF8Encoding $false
$utf8Bom = New-Object Text.UTF8Encoding $true

function Baixar([string]$caminho) {
    $r = Invoke-WebRequest -UseBasicParsing "$base/$caminho"
    return $utf8.GetString($r.RawContentStream.ToArray())
}

# 1. Cofre do Obsidian
$padrao = Join-Path $env:USERPROFILE 'Documents\Obsidian Vault\Claude'
$vault = Read-Host "Pasta no Obsidian onde salvar (Enter = $padrao)"
if (-not $vault) { $vault = $padrao }
New-Item -ItemType Directory -Force -Path $vault | Out-Null
$vaultFwd = $vault -replace '\\', '/'

# 2. Hook de log em tempo real (PowerShell 5 exige BOM para ler acentos)
$hookDir = Join-Path $claude 'hooks'
New-Item -ItemType Directory -Force -Path $hookDir | Out-Null
$hook = Join-Path $hookDir 'obsidian-log.ps1'
[IO.File]::WriteAllText($hook, (Baixar 'hooks/obsidian-log.ps1'), $utf8Bom)

# 3. Skill obsidian-memoria
$skillDir = Join-Path $claude 'skills\obsidian-memoria'
New-Item -ItemType Directory -Force -Path $skillDir | Out-Null
$skill = (Baixar 'skills/obsidian-memoria/SKILL.md').Replace('{{VAULT}}', $vault)
[IO.File]::WriteAllText((Join-Path $skillDir 'SKILL.md'), $skill, $utf8)

# 4. Regras de economia no CLAUDE.md global (sem apagar o que já existe)
$md = Join-Path $claude 'CLAUDE.md'
$bloco = Baixar 'templates/CLAUDE.md'
$atual = if (Test-Path $md) { [IO.File]::ReadAllText($md) } else { '' }
$atual = [regex]::Replace($atual, '(?s)<!-- kit-accioly:inicio -->.*?<!-- kit-accioly:fim -->\s*', '')
[IO.File]::WriteAllText($md, ($atual.TrimEnd() + "`n`n" + $bloco).TrimStart(), $utf8)

# 5. Liga os hooks no settings.json (com backup)
$settings = Join-Path $claude 'settings.json'
if (Test-Path $settings) {
    Copy-Item $settings "$settings.bak" -Force
    $s = [IO.File]::ReadAllText($settings) | ConvertFrom-Json
} else { $s = New-Object psobject }
if (-not $s.hooks) { $s | Add-Member -NotePropertyName hooks -NotePropertyValue (New-Object psobject) }
$cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$($hook -replace '\\', '/')`" -Vault `"$vaultFwd`""
foreach ($ev in 'UserPromptSubmit', 'Stop', 'SessionEnd') {
    $lista = @($s.hooks.$ev | Where-Object { $_ -and -not ((@($_.hooks) | ForEach-Object { $_.command }) -match 'obsidian-log') })
    $lista += [pscustomobject]@{ hooks = @([pscustomobject]@{ type = 'command'; command = $cmd; timeout = 10 }) }
    $s.hooks | Add-Member -Force -NotePropertyName $ev -NotePropertyValue $lista
}
[IO.File]::WriteAllText($settings, ($s | ConvertTo-Json -Depth 32), $utf8)

Write-Host ""
Write-Host "Pronto! Kit instalado." -ForegroundColor Green
Write-Host "  Obsidian: $vault"
Write-Host "  Feche e abra o Claude Code de novo para ativar."

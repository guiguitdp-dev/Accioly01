# Abre o Claude Code no seu PC em modo Remote Control:
# você conversa pelo celular ou pelo navegador (app Claude) e ele executa aqui no computador.
# Uso: clique com o botão direito > "Executar com PowerShell", ou:
#   powershell -ExecutionPolicy Bypass -File claude-remoto.ps1 -Pasta "C:\caminho\do\projeto"
param([string]$Pasta = (Join-Path $env:USERPROFILE 'Projetos'))

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host "Claude Code não encontrado. Instale com:" -ForegroundColor Yellow
    Write-Host "  irm https://claude.ai/install.ps1 | iex"
    Read-Host "Enter para sair"; exit 1
}
New-Item -ItemType Directory -Force -Path $Pasta | Out-Null
Set-Location $Pasta
Write-Host "Remote Control ligado em $Pasta. Deixe esta janela aberta." -ForegroundColor Green
claude remote-control

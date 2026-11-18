#!/usr/bin/env bash
# Accioly Play — instala e liga o servidor no Mac ou Linux.  Uso: bash instalar-mac-linux.sh
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale a versão LTS em https://nodejs.org (Mac: brew install node · Ubuntu: sudo apt install nodejs)"
  exit 1
fi
echo "[1/2] Montando a pasta do pendrive…"
node scripts/build-pendrive.js
echo "[2/2] Ligando o servidor (Ctrl+C para desligar)…"
( sleep 3; open http://localhost:3000/admin/ 2>/dev/null || xdg-open http://localhost:3000/admin/ 2>/dev/null ) >/dev/null 2>&1 &
exec node server/server.js

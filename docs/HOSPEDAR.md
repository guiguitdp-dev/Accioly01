# Como colocar o servidor no ar

O servidor é **um único programa Node.js sem dependências**. Escolha a opção:

## Opção 1 — No seu computador (para começar, custo zero)

1. Instale o **Node.js 20 ou mais novo**: https://nodejs.org (versão LTS).
2. Baixe o projeto (botão verde **Code → Download ZIP** no GitHub) e descompacte.
3. Abra o terminal na pasta e rode:
   ```
   npm start
   ```
4. Vai aparecer:
   - o endereço do **Painel do Dono** (`http://localhost:3000/admin/`)
   - o **código de primeiro acesso** (use para criar sua conta de dono)
   - o endereço para abrir **na TV** pela mesma rede Wi-Fi (`http://192.168.x.x:3000/tv/`)

Limitação: só funciona para quem está na sua rede de casa e com o PC ligado. Para vender para outras pessoas, use a opção 2 ou 3.

### Deixar acessível pela internet sem servidor pago (teste)
Use um túnel gratuito, por exemplo o **Cloudflare Tunnel** (`cloudflared tunnel --url http://localhost:3000`). Ele te dá um endereço `https://...trycloudflare.com`. Coloque esse endereço em **Painel > Configurações > Endereço público**.

## Opção 2 — Servidor VPS (recomendado para vender) ~R$ 25–40/mês

Qualquer VPS Linux pequena (1 GB RAM) aguenta milhares de clientes.
```bash
# no servidor (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
git clone <seu-repositorio> accioly && cd accioly
PORT=3000 PUBLIC_URL=https://seudominio.com.br node server/server.js
```
Use o **Caddy** na frente para HTTPS automático:
```
seudominio.com.br {
    reverse_proxy localhost:3000
}
```
E um serviço do systemd (ou `pm2`) para manter o servidor ligado.

## Opção 3 — Plataformas prontas (Render, Railway, Fly.io)

- Comando de start: `node server/server.js`
- Variáveis: `PUBLIC_URL=https://seu-app...`, `DATA_DIR=/data` (e crie um **disco persistente** montado em `/data` — sem isso os clientes somem a cada reinício!).

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `PORT` | Porta (padrão 3000) |
| `PUBLIC_URL` | Endereço público com https (Mercado Pago e links de indicação) |
| `DATA_DIR` | Pasta do banco de dados e backups |
| `ADMIN_EMAIL` + `ADMIN_PASSWORD` | Cria o dono automaticamente no primeiro start |
| `MP_ACCESS_TOKEN` | Token do Mercado Pago (alternativa a salvar no painel) |

## Backup

O banco fica em `server/data/db.json` (ou `DATA_DIR`). Backups diários automáticos em `server/data/backups/` (14 dias). **Copie essa pasta para outro lugar de vez em quando.** Nunca envie essa pasta para o GitHub (ela já está no `.gitignore`).

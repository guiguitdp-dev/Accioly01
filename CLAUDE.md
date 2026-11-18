# Accioly Play — guia rápido para agentes

Produto: app de TV (web) com canais gratuitos OFICIAIS, atalhos para apps legais e 8 jogos no controle remoto, vendido por assinatura (teste grátis → R$ 15,99 fundador p/ 50 primeiros → preço normal).

## Mapa (leia só o que precisar)
- `app/` app da TV (HTML/JS puro, sem build). `app/js/catalog.js` = canais. `app/js/games/*` = jogos. NÃO leia `app/vendor/`.
- `server/server.js` API (Node puro, sem dependências) + `server/admin/` Painel do Dono. Banco: `server/data/db.json` (privado, nunca commitar/ler).
- `scripts/` verificação de canais, pendrive, teste automático, relatório.
- `agentes/` estado e backlog da equipe de IA. `marketing/` estratégia e conteúdos.

## Comandos
- `npm start` servidor · `npm run teste` teste com navegador · `npm run checar-canais` · `npm run pendrive`

## Regras inegociáveis
1. Só fontes oficiais e gratuitas. Nunca IPTV pirata / canais pagos liberados.
2. Tudo navegável com setas + OK + VOLTAR.
3. Marketing só com promessas verdadeiras.
4. Economize tokens: leia trechos, não arquivos inteiros; registre conclusões em `agentes/ESTADO.md`.

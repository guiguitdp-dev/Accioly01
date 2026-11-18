# Accioly Play 📺🎮

**Sua TV mais divertida:** canais ao vivo de fontes oficiais, filmes/séries/novelas grátis organizados e **8 jogos para jogar com o controle remoto** (ou controle de videogame) — com **Painel do Dono**, **teste grátis** e **assinatura** (R$ 15,99 para os 50 primeiros).

Funciona em **Android TV / Google TV / TV Box / Fire TV** (instala pelo pendrive), **Smart TV Samsung/LG** (pelo navegador), **computador** (pelo pendrive) e **celular**.

---

## Começar em 3 passos

```bash
# 1. Precisa do Node.js 20+ (https://nodejs.org). Não precisa instalar mais nada.
npm start

# 2. Abra o endereço do Painel do Dono que aparece na tela e use o CÓDIGO DE PRIMEIRO ACESSO.
#    Em Configurações: coloque sua chave Pix, seu WhatsApp e (opcional) o token do Mercado Pago.

# 3. Na TV (mesma rede Wi-Fi), abra o endereço que aparece como "Na TV".
```

Pendrive para uso próprio (tudo liberado, sem login):
```bash
npm run pendrive      # gera dist/pendrive/AcciolyPlay -> copie para o pendrive
```

Passo a passo completo: **[docs/INSTALAR-NA-TV.md](docs/INSTALAR-NA-TV.md)** · Colocar online para vender: **[docs/HOSPEDAR.md](docs/HOSPEDAR.md)**

---

## O que tem dentro

| Parte | O que faz |
|---|---|
| **App da TV** (`app/`) | Telas estilo streaming, navegação só com setas + OK + VOLTAR, player de canais ao vivo (troca de canal com ▲▼), favoritos, "continuar assistindo", Pix por QR Code na própria TV |
| **8 jogos** (`app/js/games/`) | Cobrinha Neon, Quebra-Blocos, Pingue-Pongue (2 jogadores), Chuva de Meteoros, Memória Brasil, Quiz Brasil, Jogo da Velha, Corrida Neon — 3 grátis, 5 premium (configurável) |
| **Canais** (`app/js/catalog.js`) | 37 itens: TV aberta, notícias 24h, esportes, filmes/novelas grátis, infantil, educação, fé. Só fontes oficiais |
| **Servidor** (`server/`) | Contas, teste grátis, preço de fundador com contador real, Pix copia-e-cola, Mercado Pago automático, indicação (+7 dias), backups |
| **Painel do Dono** (`/admin/`) | Visão geral, **Ações do dia** (mensagens de WhatsApp prontas), clientes, pedidos, canais e jogos, configurações, equipe com papéis (dono/suporte) e histórico |
| **Página de vendas** (`/`) | Landing com contador de vagas de fundador e botão de teste grátis |
| **App Android TV** (`android/`) | APK gerado pelo GitHub Actions para instalar pelo pendrive |
| **Agentes de IA** (`.claude/agents/`, `agentes/`) | 7 agentes com áreas separadas + agenda pronta — veja [agentes/README.md](agentes/README.md) |
| **Marketing** (`marketing/`) | Estratégia de lançamento dos 50 fundadores, calendário de 30 dias, roteiros de vídeo, mensagens de WhatsApp, anúncios, FAQ |

## Comandos

| Comando | Para quê |
|---|---|
| `npm start` | Liga o servidor (site, app e painel) |
| `npm run pendrive` | Monta a pasta do pendrive (`-- --servidor https://...` para versão de clientes) |
| `npm run checar-canais` | Verifica todos os canais (sem IA, sem custo) |
| `npm run teste` | Teste automático com navegador simulando o controle remoto |
| `npm run relatorio` | Relatório resumido para os agentes de IA (sem dados pessoais) |

## ⚖️ Sobre canais pagos (importante)

Este projeto **não** distribui canais pagos (SporTV, Premiere, HBO, Telecine…) nem listas IPTV de terceiros: isso é pirataria (art. 184 do Código Penal), a Anatel bloqueia esses servidores constantemente e anunciar isso derruba contas de anúncio. O Accioly Play reúne **somente** transmissões e serviços **oficiais e gratuitos** e cobra pela **organização, praticidade e pelos jogos**. Para oferecer canais pagos de forma legal, o caminho é parceria/licenciamento com as programadoras ou afiliação aos apps oficiais.

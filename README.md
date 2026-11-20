# Accioly Play 📺🎮

**Sua TV mais divertida:** canais ao vivo de fontes oficiais, filmes/séries/novelas grátis organizados e **17 jogos para jogar com o controle remoto** (ou controle de videogame) — com **Painel do Dono**, **teste grátis** e **assinatura** (R$ 15,99 para os 50 primeiros).

Funciona em **Android TV / Google TV / TV Box / Fire TV** (instala pelo pendrive), **Smart TV Samsung/LG** (pelo navegador), **computador** (pelo pendrive) e **celular**.

---

## 📱 Instalar no celular ou na TV Android (direto, sem computador)

Aponte a câmera do celular para o QR Code ou abra o link no celular/TV:

<img src="docs/baixar-apk-qrcode.svg" width="180" alt="QR Code para baixar o APK">

**https://github.com/guiguitdp-dev/Accioly01/releases/download/app-latest/AcciolyPlay.apk**

1. Baixe o arquivo **AcciolyPlay.apk** e toque nele para instalar (o Android vai pedir para **permitir instalar apps desta fonte** → permita).
2. Abra o **Accioly Play**: ele já funciona **direto no aparelho, sem servidor** (modo dono, tudo liberado).
3. Para usar com seu servidor (contas, assinaturas): **Conta → 📡 Conectar ao meu servidor**.
4. Para a busca do YouTube no aparelho: **Conta → Chave do YouTube** (grátis, veja `docs/ANUNCIOS-E-YOUTUBE.md`).

O link sempre aponta para a versão mais nova (atualiza sozinho a cada mudança no projeto).

## 🍎 iPhone e iPad

O iPhone não instala APK. Use o app web (mesmo app, mesma tela):

1. No iPhone, abra no **Safari**: **https://guiguitdp-dev.github.io/Accioly01/**
2. Toque em **Compartilhar** (quadrado com seta ⬆️) → **Adicionar à Tela de Início**.
3. Pronto: o Accioly Play fica com ícone e abre em tela cheia, com controle na tela para os jogos.

> Primeira vez (dono): no GitHub, **Settings → Pages → Source: GitHub Actions**. Depois disso o site se atualiza sozinho.
> Um app nativo na App Store exige Mac, conta de desenvolvedor Apple (US$ 99/ano) e aprovação da Apple.

## Começar com 1 clique

- **Windows:** dê dois cliques em **`INSTALAR-WINDOWS.bat`** (instala o Node.js se faltar, monta o pendrive, **cria os atalhos na Área de Trabalho**, liga o servidor e abre o Painel do Dono). Para ligar junto com o Windows: **`INICIAR-COM-O-WINDOWS.bat`**.
- **Atalho na Área de Trabalho:** **`CRIAR-ATALHO.bat`** cria os ícones **"Accioly Play"** (abre o app em janela própria, como um programa, e liga o servidor sozinho) e **"Accioly Play - Painel do Dono"**, além do atalho no Menu Iniciar. Se o Windows avisar "O Windows protegeu o computador", clique em **Mais informações → Executar assim mesmo**.
- **Mac/Linux:** `bash instalar-mac-linux.sh`
- **Android (celular, Android TV, TV Box):** **`INSTALAR-NO-ANDROID.bat`** instala o APK pelo cabo USB ou pelo Wi-Fi. Ou copie o APK no pendrive.

## Começar pelo terminal (3 passos)

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
| **App da TV** (`app/`) | Telas estilo streaming, navegação só com setas + OK + VOLTAR, player de canais ao vivo (troca de canal com ▲▼), fileira **🔥 Em alta**, aba **Kids**, favoritos, "continuar assistindo", recordes nos jogos, aviso de canal fora do ar, vídeos recentes quando o canal do YouTube não está ao vivo, Pix por QR Code na própria TV |
| **Visual do futuro + opções** (`css/futuro.css`, `js/options.js`) | Tema neon/vidro com fonte futurista; **⚙️ Opções no vídeo**: qualidade, tamanho da imagem (ajustar/preencher/esticar/zoom), legendas, velocidade e volume; **⚙️ Opções nos jogos**: som, vibração do controle, gráficos (máximo/leve), tela cheia e FPS; **⚙️ Ajustes**: visual, tamanho da tela (letras grandes), legendas. Modo leve automático em TV/TV Box fraca |
| **17 jogos** (`app/js/games/`) | **Em alta:** Festa das Frutas (combinar 3), Blocos Encaixe (block puzzle), Disputa de Pênaltis, Palavra Secreta (palavra do dia), Corre Capivara (corrida infinita). **Tiro e Ação (nostalgia):** Esquadrilha 2000, Comando Retrô, Mira Certeira, Operação 3D (3D retrô em primeira pessoa). **Clássicos:** Cobrinha Neon, Quebra-Blocos, Pingue-Pongue (2 jogadores), Chuva de Meteoros, Memória Brasil, Quiz Brasil, Jogo da Velha, Corrida Neon — 5 grátis, 8 premium (configurável) |
| **Música e Vídeos** (`app/js/media.js`) | Busca oficial do YouTube (músicas e vídeos em alta no Brasil, toca em sequência) + **Música livre sem anúncios** (Audius). Veja [docs/ANUNCIOS-E-YOUTUBE.md](docs/ANUNCIOS-E-YOUTUBE.md) |
| **Anúncios que pagam você** (`app/js/ads.js`) | Só para quem não assina: **AdSense** no navegador (entre partidas, "ver 1 anúncio e jogar 30 min", banner) e **AdMob** no app Android (tela cheia e premiado). `ads.txt`, `app-ads.txt` e `/privacidade` automáticos |
| **Canais** (`app/js/catalog.js`) | 71 itens (64 tocam dentro do app): TV aberta, notícias 24h, esportes, filmes/novelas grátis, infantil, educação, fé. Só fontes oficiais |
| **Servidor** (`server/`) | Contas, teste grátis, preço de fundador com contador real, Pix copia-e-cola, Mercado Pago automático, indicação (+7 dias), backups |
| **Painel do Dono** (`/admin/`) | Visão geral, **Ações do dia** (mensagens de WhatsApp prontas), clientes, pedidos, canais e jogos, configurações, equipe com papéis (dono/suporte) e histórico |
| **Página de vendas** (`/`) | Landing com contador de vagas de fundador e botão de teste grátis |
| **App Android** (`android/`) | APK universal (celular, Android TV, TV Box, Fire TV) gerado pelo GitHub Actions; pergunta o endereço do servidor na 1ª abertura |
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

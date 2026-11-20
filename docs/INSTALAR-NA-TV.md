# Como colocar o Accioly Play na TV

Escolha o seu caso:

## ⭐ Mais fácil: link direto (celular, Android TV, TV Box, Fire TV)

1. No aparelho, abra o navegador e entre em
   **https://github.com/guiguitdp-dev/Accioly01/releases/download/app-latest/AcciolyPlay.apk**
   (no celular dá para escanear o QR Code do README).
   - Na Android TV/TV Box sem navegador: instale o app **Downloader** (grátis na Play Store) e digite esse link.
2. Abra o arquivo baixado e permita **instalar apps desta fonte**.
3. O app abre **funcionando sem servidor** (modo dono). Para conectar ao seu servidor depois: **Conta → 📡 Conectar ao meu servidor**.

## 💾 Pendrive pronto para mostrar e vender (vitrine)

Baixe o pendrive completo, já montado: **https://github.com/guiguitdp-dev/Accioly01/releases/download/app-latest/AcciolyPlay-Pendrive.zip**
(é refeito sozinho a cada versão nova, com as notícias do dia).

1. Descompacte o ZIP e copie **tudo o que está dentro** para a **raiz** do pendrive.
2. O pendrive aparece no Windows com o nome e o ícone do **Accioly Play**.
3. Em qualquer aparelho, a pessoa usa o app **com tudo liberado por 30 minutos**; depois os canais, as notícias e os jogos grátis continuam, e o resto mostra **"Gostou? Assine"** com QR Code do seu WhatsApp/site.

| Aparelho | O que fazer |
|---|---|
| Computador (Windows, Mac, Linux) | 2 cliques em **ABRIR ACCIOLY PLAY.html** (no Windows, **ABRIR EM TELA CHEIA (Windows).bat** abre como aplicativo) |
| Android TV, TV Box, Fire TV, celular Android | Gerenciador de arquivos → **AcciolyPlay.apk** (versão vitrine) |
| Smart TV Samsung/LG | Abra o pendrive na TV e toque o **VIDEO-DEMONSTRACAO.mp4** (essas TVs só tocam vídeo pelo USB) |
| iPhone | Não abre pelo pendrive: use o link do app no Safari |

> **Por que não abre sozinho ao conectar?** Nenhum computador, celular ou TV atual executa programas automaticamente ao conectar um pendrive — o Windows desligou isso em 2011 por causa de vírus, e Mac, Android e TVs nunca permitiram. Por isso o pendrive mostra o nome/ícone do Accioly Play e o arquivo "ABRIR" bem visível.

**Seu WhatsApp e site no convite para assinar:** no GitHub, **Settings → Secrets and variables → Actions → Variables** → crie `ACCIOLY_WHATSAPP` (ex.: `5511999999999`) e, se tiver, `ACCIOLY_SITE`. O próximo pendrive e o APK vitrine já saem com eles.
Montar no seu PC: `npm run pendrive -- --whatsapp 5511999999999` (vitrine) · `npm run pendrive:dono` (tudo liberado, só para você).

## A) Android TV, Google TV, TV Box ou Fire TV (instala pelo pendrive) ✅ melhor opção

**1. Baixar o APK (uma vez só):**
1. No GitHub do projeto, abra **Actions** → **Gerar APK Android TV** → clique na execução mais recente (verde) → baixe **AcciolyPlay-AndroidTV** em "Artifacts".
   - O APK é **universal**: na primeira abertura ele pergunta o endereço do servidor (aparece na janela do servidor, linha "Na TV").
   - Para clientes, gere um APK com o endereço já fixo: **Run workflow** → preencha `https://seudominio.com.br/tv/`.
2. Descompacte e coloque o `.apk` na pasta `dist/apk/` do projeto. Rode `npm run pendrive:dono` — o APK vai junto para a pasta do pendrive (a vitrine usa o `AcciolyPlay-Vitrine.apk`).

**Jeito mais rápido (sem pendrive):** no Windows, dê dois cliques em `INSTALAR-NO-ANDROID.bat` e escolha cabo USB (celular) ou Wi-Fi (TV/TV Box com depuração ativada).

**2. Instalar na TV:**
1. Copie a pasta `dist/pendrive/AcciolyPlay` para o pendrive e conecte na TV/TV Box.
2. Na TV, instale um gerenciador de arquivos grátis da Play Store (ex.: **File Commander** ou **X-plore**).
3. Abra o pendrive pelo gerenciador e selecione `AcciolyPlay.apk`.
4. A TV vai pedir para **permitir instalar apps desconhecidos** para o gerenciador → permita → Instalar.
5. Pronto: o **Accioly Play** aparece na tela inicial da TV. Na primeira vez, digite o endereço do servidor (ex.: `http://192.168.0.15:3000/tv/`). Use setas + OK + VOLTAR.
6. Para trocar o servidor depois: **Minha Conta → 📡 Trocar servidor**.

> Fire TV: em Configurações > Minha Fire TV > Opções do desenvolvedor, ative "Apps de fontes desconhecidas".

## B) Smart TV Samsung (Tizen) ou LG (webOS)

Essas TVs **não instalam apps pelo pendrive**. Use o navegador da TV:
1. Abra o app **Internet** (Samsung) ou **Navegador da Web** (LG).
2. Digite o endereço: `http://IP-DO-PC:3000/tv/` (mesma rede) ou `https://seudominio.com.br/tv/`.
3. Adicione aos favoritos do navegador para abrir rápido.

## C) Computador (Windows/Mac/Linux) pelo pendrive

1. Rode `npm run pendrive:dono` (só para você, tudo liberado) e copie o conteúdo de `dist/pendrive/AcciolyPlay` para o pendrive.
2. No computador, dê dois cliques em **ABRIR ACCIOLY PLAY.html**.
3. Aperte **F11** para tela cheia. Ligue o PC na TV pelo cabo HDMI se quiser jogar na tela grande.

## Controles

| Ação | Controle remoto | Teclado | Controle de videogame |
|---|---|---|---|
| Mover | Setas | Setas | Direcional / analógico |
| Escolher | OK | Enter | A (Xbox) / X (PlayStation) |
| Voltar / Pausar | Voltar | Esc | B (Xbox) / Círculo (PlayStation) |
| Trocar de canal | ▲ ▼ no player | ▲ ▼ | ▲ ▼ |
| 2º jogador | — | W / S | 2º controle |

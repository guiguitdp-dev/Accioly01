# Como colocar o Accioly Play na TV

Escolha o seu caso:

## ⭐ Mais fácil: link direto (celular, Android TV, TV Box, Fire TV)

1. No aparelho, abra o navegador e entre em
   **https://github.com/guiguitdp-dev/Accioly01/releases/download/app-latest/AcciolyPlay.apk**
   (no celular dá para escanear o QR Code do README).
   - Na Android TV/TV Box sem navegador: instale o app **Downloader** (grátis na Play Store) e digite esse link.
2. Abra o arquivo baixado e permita **instalar apps desta fonte**.
3. O app abre **funcionando sem servidor** (modo dono). Para conectar ao seu servidor depois: **Conta → 📡 Conectar ao meu servidor**.

## A) Android TV, Google TV, TV Box ou Fire TV (instala pelo pendrive) ✅ melhor opção

**1. Baixar o APK (uma vez só):**
1. No GitHub do projeto, abra **Actions** → **Gerar APK Android TV** → clique na execução mais recente (verde) → baixe **AcciolyPlay-AndroidTV** em "Artifacts".
   - O APK é **universal**: na primeira abertura ele pergunta o endereço do servidor (aparece na janela do servidor, linha "Na TV").
   - Para clientes, gere um APK com o endereço já fixo: **Run workflow** → preencha `https://seudominio.com.br/tv/`.
2. Descompacte e coloque o `.apk` na pasta `dist/apk/` do projeto. Rode `npm run pendrive` — o APK vai junto para a pasta do pendrive.

**Jeito mais rápido (sem pendrive):** no Windows, dê dois cliques em `INSTALAR-NO-ANDROID.bat` e escolha cabo USB (celular) ou Wi-Fi (TV/TV Box com depuração ativada).

**2. Instalar na TV:**
1. Copie a pasta `dist/pendrive/AcciolyPlay` para o pendrive e conecte na TV/TV Box.
2. Na TV, instale um gerenciador de arquivos grátis da Play Store (ex.: **File Commander** ou **X-plore**).
3. Abra o pendrive pelo gerenciador e selecione `AcciolyPlay-AndroidTV.apk`.
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

1. Rode `npm run pendrive` e copie `dist/pendrive/AcciolyPlay` para o pendrive.
2. No computador, dê dois cliques em **ABRIR-ACCIOLY-PLAY.html**.
3. Aperte **F11** para tela cheia. Ligue o PC na TV pelo cabo HDMI se quiser jogar na tela grande.

## Controles

| Ação | Controle remoto | Teclado | Controle de videogame |
|---|---|---|---|
| Mover | Setas | Setas | Direcional / analógico |
| Escolher | OK | Enter | A (Xbox) / X (PlayStation) |
| Voltar / Pausar | Voltar | Esc | B (Xbox) / Círculo (PlayStation) |
| Trocar de canal | ▲ ▼ no player | ▲ ▼ | ▲ ▼ |
| 2º jogador | — | W / S | 2º controle |

# Como colocar o Accioly Play na TV

Escolha o seu caso:

## A) Android TV, Google TV, TV Box ou Fire TV (instala pelo pendrive) ✅ melhor opção

**1. Gerar o APK (uma vez só, feito pelo dono):**
1. No GitHub do projeto, abra **Actions** → **Gerar APK Android TV** → **Run workflow**.
2. Em "Endereço do app", coloque o endereço do seu servidor + `/tv/`:
   - Servidor no seu PC, mesma rede Wi-Fi: `http://IP-DO-PC:3000/tv/` (o IP aparece na janela do servidor)
   - Servidor na internet: `https://seudominio.com.br/tv/`
3. Espere ~5 minutos, abra a execução e baixe **AcciolyPlay-AndroidTV** em "Artifacts".
4. Descompacte e coloque o `.apk` na pasta `dist/apk/` do projeto. Rode `npm run pendrive` — o APK vai junto para a pasta do pendrive.

**2. Instalar na TV:**
1. Copie a pasta `dist/pendrive/AcciolyPlay` para o pendrive e conecte na TV/TV Box.
2. Na TV, instale um gerenciador de arquivos grátis da Play Store (ex.: **File Commander** ou **X-plore**).
3. Abra o pendrive pelo gerenciador e selecione `AcciolyPlay-AndroidTV.apk`.
4. A TV vai pedir para **permitir instalar apps desconhecidos** para o gerenciador → permita → Instalar.
5. Pronto: o **Accioly Play** aparece na tela inicial da TV. Use setas + OK + VOLTAR.

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

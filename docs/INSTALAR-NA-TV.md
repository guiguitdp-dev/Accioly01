# Como colocar o Accioly Play na TV

Escolha o seu caso:

## A) Android TV, Google TV, TV Box ou Fire TV (instala pelo pendrive) ✅ melhor opção

**1. Baixar o APK (uma vez só):**
1. No GitHub do projeto, abra **Actions** → **Gerar APK Android TV** → clique na execução mais recente (verde) → baixe **AcciolyPlay-AndroidTV** em "Artifacts".
   - O APK **universal** (sem endereço) já traz o app dentro: abre **direto nos canais, em Modo Dono** (tudo liberado), sem precisar do PC ligado. É para **uso próprio** — não entregue esse APK a clientes.
   - Para clientes, gere um APK com o endereço já fixo: **Run workflow** → preencha `https://seudominio.com.br/tv/`. Esse APK sempre exige conta e nunca oferece o Modo Dono.
2. Descompacte e coloque o `.apk` na pasta `dist/apk/` do projeto. Rode `npm run pendrive` — o APK vai junto para a pasta do pendrive.

**Jeito mais rápido (sem pendrive):** no Windows, dê dois cliques em `INSTALAR-NO-ANDROID.bat` e escolha cabo USB (celular) ou Wi-Fi (TV/TV Box com depuração ativada).

**2. Instalar na TV:**
1. Copie a pasta `dist/pendrive/AcciolyPlay` para o pendrive e conecte na TV/TV Box.
2. Na TV, instale um gerenciador de arquivos grátis da Play Store (ex.: **File Commander** ou **X-plore**).
3. Abra o pendrive pelo gerenciador e selecione `AcciolyPlay-AndroidTV.apk`.
4. A TV vai pedir para **permitir instalar apps desconhecidos** para o gerenciador → permita → Instalar.
5. Pronto: o **Accioly Play** aparece na tela inicial da TV e abre direto nos canais. Use setas + OK + VOLTAR.
6. Para usar o seu servidor (contas, Pix, música): **Conta → 📡 Trocar servidor** e digite o endereço (ex.: `http://192.168.0.15:3000/tv/`). Para voltar: **Trocar servidor → Usar sem servidor (Modo Dono)**.

> Fire TV: em Configurações > Minha Fire TV > Opções do desenvolvedor, ative "Apps de fontes desconhecidas".

## B) Smart TV Samsung (Tizen) ou LG (webOS)

Essas TVs **não instalam apps pelo pendrive**. Use o navegador da TV:
1. Abra o app **Internet** (Samsung) ou **Navegador da Web** (LG).
2. Digite o endereço: `http://IP-DO-PC:3000/tv/` (mesma rede) ou `https://seudominio.com.br/tv/`.
3. Adicione aos favoritos do navegador para abrir rápido.

## C) Computador (Windows/Mac/Linux) pelo pendrive

1. Conecte o pendrive e dê dois cliques em **`COPIAR-PARA-PENDRIVE.bat`** (monta o app e copia para o pendrive sozinho). Ou rode `npm run pendrive` e copie o **conteúdo** de `dist/pendrive/AcciolyPlay` para a raiz do pendrive.
2. **Windows:** no pendrive, dê dois cliques em **ABRIR ACCIOLY PLAY** — abre em tela cheia, direto nos canais (Alt+F4 para sair). **Mac/Linux:** dois cliques em **ABRIR NO MAC OU LINUX.html** e F11.
3. O Windows não abre nada sozinho ao conectar um pendrive (bloqueio de segurança do próprio Windows), por isso o clique duplo. Ligue o PC na TV pelo cabo HDMI se quiser jogar na tela grande.

## Controles

| Ação | Controle remoto | Teclado | Controle de videogame |
|---|---|---|---|
| Mover | Setas | Setas | Direcional / analógico |
| Escolher | OK | Enter | A (Xbox) / X (PlayStation) |
| Voltar / Pausar | Voltar | Esc | B (Xbox) / Círculo (PlayStation) |
| Trocar de canal | ▲ ▼ no player | ▲ ▼ | ▲ ▼ |
| 2º jogador | — | W / S | 2º controle |

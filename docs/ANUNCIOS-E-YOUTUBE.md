# Música/Vídeos do YouTube e anúncios que pagam você

## 1. Ativar a busca do YouTube (grátis, 5 minutos)

1. Entre em **console.cloud.google.com** com sua conta Google.
2. Crie um projeto (ex.: "Accioly Play").
3. Menu **APIs e serviços → Biblioteca** → procure **YouTube Data API v3** → **Ativar**.
4. **APIs e serviços → Credenciais → Criar credenciais → Chave de API**. Copie a chave.
5. (Recomendado) Clique na chave → **Restrições de API** → marque só "YouTube Data API v3".
6. No **Painel do Dono → Configurações → Música e Vídeos**, cole a chave e salve.

Cota grátis: 10.000 unidades por dia. "Em alta" custa 1 unidade e fica 3 horas guardado; cada busca nova custa ~101 unidades e fica 12 horas guardada (buscas repetidas não gastam). Dá ~90 buscas novas por dia; se precisar de mais, peça aumento de cota ao Google (é grátis, mas passa por revisão).

**Importante (regras do YouTube):**
- Os vídeos tocam no **player oficial** e mostram os **anúncios do próprio YouTube**. É proibido bloquear, pular ou trocar esses anúncios — é isso que paga os artistas, e apps que bloqueiam são banidos.
- É proibido vender anúncios **em cima** dos vídeos do YouTube. Por isso os anúncios do Accioly Play nunca aparecem na aba de Música e Vídeos nem no player.
- Quem quiser YouTube sem anúncios precisa assinar o **YouTube Premium** e usar o app oficial do YouTube.
- A seção **"Música livre — sem anúncios"** usa músicas que os próprios artistas liberaram na plataforma **Audius**. Essa é sem anúncio de verdade e não precisa de chave.

## 2. Ganhar dinheiro com anúncios (Google AdSense)

Como funciona no app:
- Só quem **não assina** vê anúncios. Assinar = sem anúncios (argumento de venda!).
- Lugares: **entre partidas** dos jogos, **"Ver 1 anúncio e jogar 30 min"** um jogo premium (anúncio recompensado) e **um banner** na tela inicial.
- Nunca em cima de vídeos, canais ao vivo ou música.
- Se o anúncio não carregar (bloqueador, conta não aprovada), o jogo abre na hora.

Passo a passo:
1. **Coloque o servidor online com domínio próprio** (ex.: `acciolyplay.com.br`) — veja `docs/HOSPEDAR.md`. O AdSense não aprova `localhost` nem IP.
2. Crie a conta em **adsense.google.com** com seus dados e chave Pix/conta bancária para receber (o Google paga quando o saldo passa do mínimo).
3. Adicione seu site no AdSense. O Google pede o **ads.txt** — o servidor já gera sozinho em `https://seudominio/ads.txt` depois que você colar o ID no painel.
4. Para anúncios em jogos (entre partidas e recompensados), peça acesso ao **H5 Games Ads (Ad Placement API)** no AdSense / no formulário indicado em developers.google.com/ad-placement.
5. (Opcional) Crie um **bloco de anúncio de display** para o banner e copie o número `data-ad-slot`.
6. No **Painel do Dono → Configurações → Anúncios**:
   - Mostrar anúncios: **Ligado**
   - ID de editor: `ca-pub-...`
   - Bloco do banner: o número do passo 5
   - Modo de teste: **Ligado** até o Google aprovar; depois **Desligado** para anúncios reais.
7. A política de privacidade exigida pelo Google já está em `https://seudominio/privacidade`.

A receita aparece no painel do **AdSense**. No Painel do Dono você vê quantos anúncios foram pedidos nos últimos 7 dias.

## 2b. Anúncios no app Android (AdMob) — já integrado

O APK já vem com o **AdMob** (SDK oficial do Google): anúncio de **tela cheia entre partidas** e **anúncio premiado** ("ver 1 anúncio e jogar 30 min"). Valem as mesmas regras da web: só para quem não assina, nunca em cima de vídeos/canais. Antes de mostrar anúncios, o app pede consentimento quando a lei exige (Europa); no Brasil normalmente passa direto.

Passo a passo:
1. Crie a conta em **admob.google.com** (use a mesma conta Google do AdSense — o pagamento vai para o mesmo lugar).
2. **Apps → Adicionar app → Android**. O AdMob só libera anúncios de verdade para apps publicados numa loja (Google Play, ou Amazon Appstore para Fire TV). Distribuindo só por APK/pendrive, os anúncios reais podem ficar limitados.
3. Copie o **ID do app** (`ca-app-pub-...~...`):
   - cole em **Painel do Dono → Configurações → AdMob**;
   - gere o APK com ele: **GitHub → Actions → Gerar APK Android TV → Run workflow** → campo **admob_app_id**.
4. **Blocos de anúncios → Adicionar**: crie um **Intersticial** e um **Premiado**. Copie os dois IDs (`ca-app-pub-.../...`) para o painel. Mudar os blocos depois **não** exige gerar outro APK.
5. Na página do app na Play Store, informe seu site como "site do desenvolvedor". O servidor já gera o **`/app-ads.txt`** que o AdMob pede.
6. Deixe o **modo de teste ligado** até o AdMob aprovar o app (o app usa os anúncios de teste do Google). Depois desligue. **Nunca clique nos seus próprios anúncios** — dá suspensão da conta.
7. Ligue **"Anúncios no app Android"** no painel.

Na TV, o anúncio fecha com o botão **VOLTAR** do controle. O AdMob costuma ter mais anúncios disponíveis no celular do que em TVs.

## 3. Estratégia recomendada
- **Grátis com anúncios:** canais abertos + jogos grátis + música livre, com anúncios entre partidas.
- **Assinante (R$ 15,99 fundador):** todos os jogos, sem anúncios.
- O "ver 1 anúncio e jogar 30 min" gera receita de quem não paga e mostra o valor dos jogos premium — muita gente assina depois.

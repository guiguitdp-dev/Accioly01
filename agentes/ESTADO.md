# Estado atual (memória curta da equipe — máx. ~40 linhas)

Atualizado em: 2026-11-20

## Produto
- v1.1: 17 jogos (5 novos em alta), fileira Em alta, aba Kids, status de canal, vídeos recentes no YouTube, APK universal, instaladores de 1 clique.

## Música e anúncios
- v1.2: aba Música e Vídeos (YouTube oficial + Música livre/Audius) e AdSense só para não assinantes.
- v1.3: AdMob no APK (intersticial + premiado, consentimento UMP; IDs de teste até o dono configurar). Dono precisa: chave YouTube API e conta AdSense aprovada (docs/ANUNCIOS-E-YOUTUBE.md).

## Notícias e vitrine (v1.8)
- Aba 📰 Notícias + fileira na tela inicial: feeds RSS oficiais (server/lib/news.js), publicados de hora em hora no ramo `noticias-dados` (workflow noticias.yml). Sem servidor o app lê o raw do GitHub; pendrive/APK levam cópia embutida. Ouvir (voz do navegador ou TTS do Android) e QR "ler no celular".
- Pendrive VITRINE (padrão de `npm run pendrive`): 30 min tudo liberado → convite com QR do WhatsApp (vars ACCIOLY_WHATSAPP/ACCIOLY_SITE). Release app-latest: AcciolyPlay.apk (dono), AcciolyPlay-Vitrine.apk, AcciolyPlay-Pendrive.zip, AcciolyPlay-Video.mp4.
- Autorun ao conectar é impossível (bloqueado pelos sistemas): pendrive tem autorun.inf só com nome/ícone + "ABRIR ACCIOLY PLAY.html".

## Visual e opções (v1.7)
- Tema "Futuro" (css/futuro.css + fonte Orbitron embutida): vidro, neon, grade holográfica; modo leve automático em aparelho fraco.
- ⚙️ Opções no player (qualidade, tamanho da imagem, legendas, velocidade, volume) e na pausa dos jogos (som, vibração, gráficos, tela, FPS). ⚙️ Ajustes no topo (visual, tamanho da tela, legendas, enquadramento).

## Canais (v1.6)
- Catálogo v3: 71 itens, 64 tocando dentro do app (IDs oficiais confirmados por pesquisa). Novas categorias: Humor e Entretenimento; Rádios em Música/Notícias. Sem ID ainda: Band (@BandTVOficial), Times Brasil, TV Evangelizar.

## Jogos (v1.5)
- 17 jogos. Novos de tiro (nostalgia): Esquadrilha 2000 (navinha), Comando Retrô (corre-e-atira), Mira Certeira (pistola sobre trilhos, toque/mouse), Operação 3D (FPS raycasting). Controle na tela no celular.
- iPhone: app web instalável (GitHub Pages) — dono precisa ativar Settings → Pages → GitHub Actions uma vez.

## Canais (v1.4)
- Catálogo v2: canais tocando DENTRO do app (sinal oficial .m3u8 ou canal oficial no YouTube — ao vivo ou vídeos recentes). Pesquisa de fontes em nov/2026: handles corrigidos (@otimesbrasil, @tvcancaonova, @tvredevida.aovivo), Canal UOL removido (sem prova de ser oficial). Globo/Record: ao vivo completo só nos apps deles.
- APK traz o app embutido (funciona sem servidor) + link fixo: releases/download/app-latest/AcciolyPlay.apk

## Canais (antigo)
- 37 itens no catálogo (HLS oficiais, YouTube oficiais e links de apps gratuitos). Primeira verificação real deve rodar no servidor do dono (no Brasil).

## Qualidade
- Teste automático: 72/72 passando (inclui notícias e vitrine) (Pix, 17 jogos, Música e Vídeos, AdSense, AdMob simulado).
- APK Android TV compila no GitHub Actions (artefato "AcciolyPlay-AndroidTV").

## Números
- Ainda sem vendas. Meta: 50 fundadores.

## Próximos passos
1. Dono: configurar Pix e WhatsApp no painel; colocar o servidor online (docs/HOSPEDAR.md).
2. Curador: rodar a primeira verificação real e corrigir links.
3. Marketing: executar a semana 1 do plano de lançamento (marketing/ESTRATEGIA.md).

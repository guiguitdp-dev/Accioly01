# Estado atual (memória curta da equipe — máx. ~40 linhas)

Atualizado em: 2026-11-19

## Produto
- v1.1: 13 jogos (5 novos em alta), fileira Em alta, aba Kids, status de canal, vídeos recentes no YouTube, APK universal, instaladores de 1 clique.

## Música e anúncios
- v1.2: aba Música e Vídeos (YouTube oficial + Música livre/Audius) e AdSense só para não assinantes.
- v1.3: AdMob no APK (intersticial + premiado, consentimento UMP; IDs de teste até o dono configurar). Dono precisa: chave YouTube API e conta AdSense aprovada (docs/ANUNCIOS-E-YOUTUBE.md).

## Canais
- 37 itens no catálogo (HLS oficiais, YouTube oficiais e links de apps gratuitos). Primeira verificação real deve rodar no servidor do dono (no Brasil).
- v1.4 (19/11): SBT passou a tocar no app (live oficial "SBT Ao Vivo" no YouTube). Todo item YouTube tem `channelId`. O app toca o live de agora por ID do vídeo (`/api/yt/resolve` → `videoId`), também no pendrive (abrir.ps1 em 127.0.0.1) e no APK (app embutido em https://appassets..., YtLive.java). `live_stream?channel=` falha em vários canais.
- NÃO dá (DRM/login/regra nº 1): Globo, Record, Band ao vivo; tirar sinal de apps (Globoplay, Pluto) ou YouTube sem anúncio (ReVanced). CazéTV bloqueia embed de jogos: o app mostra o aviso + "Abrir no YouTube".

## Qualidade
- Teste automático: 53/53 passando (Pix, 13 jogos, Música e Vídeos, AdSense, AdMob simulado).
- APK Android TV compila no GitHub Actions (artefato "AcciolyPlay-AndroidTV").

## Números
- Ainda sem vendas. Meta: 50 fundadores.

## Próximos passos
1. Dono: configurar Pix e WhatsApp no painel; colocar o servidor online (docs/HOSPEDAR.md).
2. Curador: rodar a primeira verificação real e corrigir links.
3. Marketing: executar a semana 1 do plano de lançamento (marketing/ESTRATEGIA.md).

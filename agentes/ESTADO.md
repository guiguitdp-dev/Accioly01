# Estado atual (memória curta da equipe — máx. ~40 linhas)

Atualizado em: 2026-11-18

## Produto
- v1.1: 13 jogos (5 novos em alta), fileira Em alta, aba Kids, status de canal, vídeos recentes no YouTube, APK universal, instaladores de 1 clique.

## Música e anúncios
- v1.2: aba Música e Vídeos (YouTube oficial + Música livre/Audius) e AdSense só para não assinantes.
- v1.3: AdMob no APK (intersticial + premiado, consentimento UMP; IDs de teste até o dono configurar). Dono precisa: chave YouTube API e conta AdSense aprovada (docs/ANUNCIOS-E-YOUTUBE.md).

## Canais (v1.4)
- Catálogo v2: canais tocando DENTRO do app (sinal oficial .m3u8 ou canal oficial no YouTube — ao vivo ou vídeos recentes). Pesquisa de fontes em nov/2026: handles corrigidos (@otimesbrasil, @tvcancaonova, @tvredevida.aovivo), Canal UOL removido (sem prova de ser oficial). Globo/Record: ao vivo completo só nos apps deles.
- APK traz o app embutido (funciona sem servidor) + link fixo: releases/download/app-latest/AcciolyPlay.apk

## Canais (antigo)
- 37 itens no catálogo (HLS oficiais, YouTube oficiais e links de apps gratuitos). Primeira verificação real deve rodar no servidor do dono (no Brasil).

## Qualidade
- Teste automático: 53/53 passando (Pix, 13 jogos, Música e Vídeos, AdSense, AdMob simulado).
- APK Android TV compila no GitHub Actions (artefato "AcciolyPlay-AndroidTV").

## Números
- Ainda sem vendas. Meta: 50 fundadores.

## Próximos passos
1. Dono: configurar Pix e WhatsApp no painel; colocar o servidor online (docs/HOSPEDAR.md).
2. Curador: rodar a primeira verificação real e corrigir links.
3. Marketing: executar a semana 1 do plano de lançamento (marketing/ESTRATEGIA.md).

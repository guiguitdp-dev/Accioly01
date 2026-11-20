/*
 * Catálogo padrão do Accioly Play.
 *
 * REGRA DE OURO: aqui só entram fontes OFICIAIS e GRATUITAS
 * (sinal da própria emissora/órgão público, canal OFICIAL da emissora no YouTube,
 * plataformas FAST legais). Nada de listas IPTV piratas ou canais pagos "liberados".
 *
 * Tipos (todos tocam DENTRO do app, exceto "link"):
 *   hls     -> sinal oficial .m3u8 da emissora
 *   youtube -> canal oficial no YouTube: toca a transmissão AO VIVO quando houver;
 *              se não houver, toca os vídeos mais recentes do canal (player oficial)
 *   link    -> apps/plataformas que só funcionam no app deles (abre o app oficial)
 *
 * Campos: handle (@do canal), channelId (UC..., opcional — evita uma consulta),
 * live (false = canal sem live 24h: começa pelos vídeos), fallback (página oficial),
 * android (pacote do app oficial na TV/celular), mono (sigla no "logo" do card).
 *
 * Fontes conferidas por pesquisa em nov/2026 (agentes/ESTADO.md). O curador de
 * canais verifica tudo automaticamente a cada 6h. O dono edita no Painel do Dono.
 */
(function (root) {
  var CATALOG = {
    version: 4,
    categories: [
      { id: 'abertos', name: 'TV Aberta' },
      { id: 'noticias', name: 'Notícias 24h' },
      { id: 'esportes', name: 'Esportes' },
      { id: 'musica', name: 'Música, Clipes e Rádios' },
      { id: 'humor', name: 'Humor e Entretenimento' },
      { id: 'infantil', name: 'Infantil' },
      { id: 'educacao', name: 'Educação e Cultura' },
      { id: 'fe', name: 'Fé e Família' },
      { id: 'filmes', name: 'Apps de filmes, séries e novelas grátis (abrem o app oficial)' }
    ],
    items: [
      // ---------------- TV ABERTA ----------------
      { id: 'globo', mono: 'GLOBO', name: 'TV Globo', cat: 'abertos', type: 'youtube', color: '#1f6feb', live: false,
        handle: '@tvglobo', channelId: 'UCEPRQVF6hxGGM9gi1ELaWHg', fallback: 'https://globoplay.globo.com/', android: 'com.globo.globotv',
        desc: 'Vídeos oficiais da Globo aqui no app. Ao vivo completo, só no Globoplay (grátis com a Conta Globo): use "Abrir no site oficial".' },
      { id: 'sbt', mono: 'SBT', name: 'SBT', cat: 'abertos', type: 'youtube', color: '#e3a008',
        handle: '@sbt', channelId: 'UCR3TOnFWDeAlT-Ho6LueDmg', fallback: 'https://www.sbt.com.br/aovivo', desc: 'Canal oficial do SBT: ao vivo quando a emissora transmite; nos outros horários, os vídeos mais recentes.' },
      { id: 'band', mono: 'BAND', name: 'Band', cat: 'abertos', type: 'youtube', color: '#0e9f6e', live: false,
        handle: '@BandTVOficial', fallback: 'https://www.band.uol.com.br/ao-vivo', desc: 'Vídeos oficiais da Band, direto do canal da emissora.' },
      { id: 'record', mono: 'REC', name: 'Record', cat: 'abertos', type: 'youtube', color: '#2563eb', live: false,
        handle: '@recordtvoficial', channelId: 'UCu_a6PAzp30Bn2mM-Ll09LA', fallback: 'https://www.recordplus.com/', desc: 'Vídeos oficiais da Record aqui no app. Ao vivo completo, só no app RecordPlus.' },
      { id: 'redetv', mono: 'RTV', name: 'RedeTV!', cat: 'abertos', type: 'youtube', color: '#d61f69',
        handle: '@redetv', channelId: 'UCd7VVhgnd2eCv9JEghvR_1w', fallback: 'https://www.redetv.uol.com.br/aovivo', desc: 'Canal oficial da RedeTV!: ao vivo quando a emissora transmite; senão, os vídeos mais recentes.' },
      { id: 'cultura', mono: 'CULT', name: 'TV Cultura', cat: 'abertos', type: 'hls', color: '#0891b2',
        url: 'https://player-tvcultura.stream.uol.com.br/live/tvcultura.m3u8', fallback: 'https://cultura.uol.com.br/aovivo',
        desc: 'TV Cultura ao vivo, com o sinal oficial da emissora.' },
      { id: 'tvbrasil', mono: 'TVB', name: 'TV Brasil', cat: 'abertos', type: 'hls', color: '#16a34a',
        url: 'https://tvbrasil-stream.ebc.com.br/index.m3u8', fallback: 'https://tvbrasil.ebc.com.br/aovivo',
        desc: 'A TV pública nacional (EBC) ao vivo, com sinal oficial.' },
      { id: 'gazeta', mono: 'GAZ', name: 'TV Gazeta', cat: 'abertos', type: 'youtube', color: '#f97316', live: false,
        handle: '@tvgazetaoficial', channelId: 'UCwQ6N3gJGWFG8bXgaxkedIw', desc: 'Vídeos oficiais da TV Gazeta, direto do canal da emissora.' },

      // ---------------- NOTÍCIAS ----------------
      { id: 'cnnbrasil', mono: 'CNN', name: 'CNN Brasil', cat: 'noticias', type: 'youtube', color: '#b91c1c',
        handle: '@CNNbrasil', channelId: 'UCvdwhh_fDyWccR42-rReZLw', live: true, desc: 'Notícias ao vivo durante quase todo o dia, no canal oficial.' },
      { id: 'sbtnews', mono: 'SN', name: 'SBT News', cat: 'noticias', type: 'youtube', color: '#ca8a04',
        handle: '@SBTNews', channelId: 'UC376n347Ob5Lwzq2WGzF1AA', live: true, desc: 'Canal de notícias 24h do SBT, ao vivo e grátis.' },
      { id: 'jpnews', mono: 'JP', name: 'Jovem Pan News', cat: 'noticias', type: 'youtube', color: '#1d4ed8',
        handle: '@jovempannews', channelId: 'UCP391YRAjSOdM_bwievgaZA', live: true, desc: 'Notícias ao vivo da Jovem Pan, no canal oficial.' },
      { id: 'recordnews', mono: 'RN', name: 'Record News', cat: 'noticias', type: 'youtube', color: '#1e40af',
        handle: '@recordnews', channelId: 'UCuiLR4p6wQ3xLEm15pEn1Xw', desc: 'Jornalismo da Record: ao vivo quando está no ar; senão, os vídeos recentes.' },
      { id: 'bandnews', mono: 'BN', name: 'Band Jornalismo', cat: 'noticias', type: 'youtube', color: '#047857',
        handle: '@BandJornalismo', channelId: 'UCoa-D_VfMkFrCYodrOC9-mA', desc: 'BandNews e jornais da Band, ao vivo quando estão no ar.' },
      { id: 'metropoles', mono: 'MET', name: 'Metrópoles', cat: 'noticias', type: 'youtube', color: '#7c3aed',
        handle: '@MetropolesTV', channelId: 'UC9mdw2mmn49ZuqGOpSri7Fw', desc: 'Jornalismo do Metrópoles, com transmissões ao vivo.' },
      { id: 'timesbrasil', mono: 'TB', name: 'Times Brasil', cat: 'noticias', type: 'youtube', color: '#334155',
        handle: '@otimesbrasil', live: true, desc: 'Economia, negócios e mercado ao vivo (licenciado CNBC).' },
      { id: 'canalrural', mono: 'RUR', name: 'Canal Rural', cat: 'noticias', type: 'youtube', color: '#65a30d',
        handle: '@canalrural', channelId: 'UCcmbSgSpK0dQhw3IBaBGo-g', desc: 'Notícias do campo e do agronegócio.' },
      { id: 'tvcamara', mono: 'CÂM', name: 'TV Câmara', cat: 'noticias', type: 'hls', color: '#15803d',
        url: 'https://stream3.camara.gov.br/tv1/manifest.m3u8', fallback: 'https://www.camara.leg.br/tv/aovivo',
        desc: 'TV oficial da Câmara dos Deputados, ao vivo.' },
      { id: 'tvsenado', mono: 'SEN', name: 'TV Senado', cat: 'noticias', type: 'youtube', color: '#1e3a8a',
        handle: '@tvsenado', channelId: 'UCLgti7NuK0RuW9wty-fxPjQ', desc: 'TV oficial do Senado, com sessões ao vivo em dias úteis.' },
      { id: 'canalgov', mono: 'GOV', name: 'Canal Gov', cat: 'noticias', type: 'hls', color: '#0f766e',
        url: 'https://canalgov-stream.ebc.com.br/index.m3u8', desc: 'Canal oficial do Governo Federal (EBC), ao vivo.' },

      // ---------------- ESPORTES ----------------
      { id: 'cazetv', mono: 'CZÉ', name: 'CazéTV', cat: 'esportes', type: 'youtube', color: '#7c3aed',
        handle: '@CazeTV', channelId: 'UCZiYbVptd3PVPf4f6eR6UaQ', desc: 'Jogos ao vivo e grátis quando há transmissão; senão, os vídeos mais recentes.' },
      { id: 'goat', mono: 'GOAT', name: 'Canal GOAT', cat: 'esportes', type: 'youtube', color: '#0f172a',
        handle: '@canalgoatbr', channelId: 'UC_oToDrJ6uca7d1dFVBmLtg', desc: 'Futebol ao vivo e grátis quando há jogo; senão, os vídeos mais recentes.' },
      { id: 'tntsports', mono: 'TNT', name: 'TNT Sports Brasil', cat: 'esportes', type: 'youtube', color: '#dc2626',
        handle: '@TNTSportsBR', channelId: 'UCs-6sCz2LJm1PrWQN4ErsPw', desc: 'Gols, bastidores e programas no canal oficial.' },
      { id: 'donosdabola', mono: 'DB', name: 'Os Donos da Bola', cat: 'esportes', type: 'youtube', color: '#16a34a',
        handle: '@OsDonosDaBola', channelId: 'UCjlcZ5YIXlBTaob0BkS_gDg', desc: 'Resenha de futebol da Band, no canal oficial.' },
      { id: 'esportenaband', mono: 'EB', name: 'Esporte na Band', cat: 'esportes', type: 'youtube', color: '#059669',
        handle: '@EsportenaBand', channelId: 'UC896QaWKoSGdZTmy9rHyU_g', desc: 'Os vídeos de esporte da Band.' },
      { id: 'ge', mono: 'ge', name: 'ge (Globo Esporte)', cat: 'esportes', type: 'youtube', color: '#16a34a', live: false,
        channelId: 'UCgCKagVhzGnZcuP9bSMgMCg', fallback: 'https://ge.globo.com/', desc: 'Gols, melhores momentos e notícias do esporte.' },

      { id: 'bbcbrasil', mono: 'BBC', name: 'BBC News Brasil', cat: 'noticias', type: 'youtube', color: '#991b1b', live: false,
        handle: '@bbcnewsbrasil', channelId: 'UCthbIFAxbXTTQEC7EcQvP1Q', desc: 'Reportagens e explicações da BBC, em português.' },
      { id: 'cbn', mono: 'CBN', name: 'Rádio CBN', cat: 'noticias', type: 'youtube', color: '#b45309',
        handle: '@cbnrede', channelId: 'UCbiGwU0-W1XCDUrt3BTVrag', desc: 'A rádio que toca notícia, com transmissões ao vivo.' },
      { id: 'bandnewsfm', mono: 'BNF', name: 'BandNews FM', cat: 'noticias', type: 'youtube', color: '#065f46',
        handle: '@radiobandnewsfm', channelId: 'UCWijW6tW0iI5ghsAbWDFtTg', desc: 'Rádio de notícias, com transmissões ao vivo.' },
      { id: 'jornalcultura', mono: 'JC', name: 'Jornalismo TV Cultura', cat: 'noticias', type: 'youtube', color: '#0e7490', live: false,
        channelId: 'UCXdXYG8dUmEv6jhEji_lSHg', desc: 'Jornalismo da TV Cultura, no canal oficial.' },
      { id: 'sbtsports', mono: 'SBS', name: 'SBT Sports', cat: 'esportes', type: 'youtube', color: '#a16207', live: false,
        handle: '@SBTSports', channelId: 'UCxc3marqP9BJSkQ0_K4mqDg', desc: 'Futebol e esporte do SBT, no canal oficial.' },
      { id: 'cbftv', mono: 'CBF', name: 'CBF TV', cat: 'esportes', type: 'youtube', color: '#15803d', live: false,
        channelId: 'UCdQuDaRww5NkKpQQ1BJBWww', desc: 'Seleção Brasileira: bastidores, gols e entrevistas.' },
      { id: 'paulistao', mono: 'FPF', name: 'Paulistão', cat: 'esportes', type: 'youtube', color: '#1e3a8a', live: false,
        handle: '@paulistao', channelId: 'UCaf4uhI8ItLyM_6kZ5I5Zdw', desc: 'Gols e melhores momentos do Paulistão.' },
      { id: 'nbb', mono: 'NBB', name: 'NBB (basquete)', cat: 'esportes', type: 'youtube', color: '#ea580c', live: false,
        channelId: 'UChEKXfUm_mYBmzeJHI8kMYg', desc: 'Basquete brasileiro: transmissões e melhores momentos.' },
      { id: 'kingsleague', mono: 'KL', name: 'Kings League Brasil', cat: 'esportes', type: 'youtube', color: '#7c2d12', live: false,
        channelId: 'UCh5WrXMEdOifhfihh3KwEmg', desc: 'Futebol 7 com craques e influenciadores.' },
      { id: 'desimpedidos', mono: 'DES', name: 'Desimpedidos', cat: 'esportes', type: 'youtube', color: '#16a34a', live: false,
        handle: '@desimpedidos', channelId: 'UCFjrDmEnxrG5TRGVO0TPHLA', desc: 'Futebol com humor, desafios e resenha.' },

      // ---------------- MÚSICA ----------------
      { id: 'musicamultishow', mono: 'MM', name: 'Música Multishow', cat: 'musica', type: 'youtube', color: '#be185d', live: false,
        handle: '@musicamultishow', channelId: 'UCIzAIM-zatIDHErC0Z23hbQ', desc: 'Shows e apresentações musicais do Multishow.' },
      { id: 'jovempanfm', mono: 'JPFM', name: 'Jovem Pan FM', cat: 'musica', type: 'youtube', color: '#1d4ed8', live: false,
        channelId: 'UCsahCqRiZarflb9vXpAOVtQ', desc: 'Os hits e os programas da rádio.' },
      { id: 'kondzilla', mono: 'KZ', name: 'KondZilla', cat: 'musica', type: 'youtube', color: '#111827', live: false,
        handle: '@KondZilla', channelId: 'UCffDXn7ycAzwL2LDlbyWOTw', desc: 'Clipes de funk, um atrás do outro.' },
      { id: 'gr6', mono: 'GR6', name: 'GR6 Explode', cat: 'musica', type: 'youtube', color: '#b91c1c', live: false,
        handle: '@gr6explode', channelId: 'UCNUQK9mQoqi4yNXw2_Rj6SA', desc: 'Clipes oficiais de funk, um atrás do outro.' },
      { id: 'somlivre', mono: 'SL', name: 'Som Livre', cat: 'musica', type: 'youtube', color: '#0ea5e9', live: false,
        handle: '@somlivre', channelId: 'UCEATCATai_oafDuqKssZITw', desc: 'Sertanejo, pagode, pop e mais: clipes oficiais.' },

      // ---------------- HUMOR E ENTRETENIMENTO ----------------
      { id: 'portadosfundos', mono: 'PDF', name: 'Porta dos Fundos', cat: 'humor', type: 'youtube', color: '#f59e0b', live: false,
        handle: '@portadosfundos', channelId: 'UCEWHPFNilsT0IfQfutVzsag', desc: 'Esquetes de humor para dar boas risadas.' },
      { id: 'thenoite', mono: 'TN', name: 'The Noite', cat: 'humor', type: 'youtube', color: '#312e81', live: false,
        handle: '@thenoite', channelId: 'UCEWOoncsrmirqnFqxer9lmA', desc: 'Entrevistas e humor com Danilo Gentili (SBT).' },
      { id: 'ratinho', mono: 'RAT', name: 'Programa do Ratinho', cat: 'humor', type: 'youtube', color: '#ca8a04', live: false,
        channelId: 'UC9JPNM6VyxUrmZb3SPp3zwA', desc: 'Quadros e momentos marcantes do programa (SBT).' },
      { id: 'multishow', mono: 'MS', name: 'Multishow', cat: 'humor', type: 'youtube', color: '#db2777', live: false,
        handle: '@multishow', channelId: 'UC11JFCoslUUMTuAsUPH8RdQ', desc: 'Humor, realities e shows.' },

      // ---------------- INFANTIL ----------------
      { id: 'peppa', mono: 'PEP', name: 'Peppa Pig (português)', cat: 'infantil', type: 'youtube', color: '#f472b6', live: false,
        handle: '@peppapigportuguesoficial', channelId: 'UCvD9GB-E4q_TuMpwUtFBhLA', desc: 'Episódios oficiais da Peppa, em português.' },
      { id: 'masha', mono: 'MU', name: 'Masha e o Urso', cat: 'infantil', type: 'youtube', color: '#e11d48', live: false,
        handle: '@Mashaurso', channelId: 'UCJKBSfD5JSUxGhriFeoPCCg', desc: 'Episódios oficiais da Masha, em português.' },
      { id: 'luna', mono: 'LUA', name: 'O Show da Luna', cat: 'infantil', type: 'youtube', color: '#7c3aed', live: false,
        handle: '@oshowdaluna', channelId: 'UC-adUJnjdrRnRlOJGoDtTqw', desc: 'A Luna ensina ciência brincando.' },
      { id: 'pocoyo', mono: 'POC', name: 'Pocoyo', cat: 'infantil', type: 'youtube', color: '#0ea5e9', live: false,
        handle: '@pocoyobrasil', channelId: 'UCEnXFTwKRy4zSafAGPkooNA', desc: 'Episódios oficiais do Pocoyo, em português.' },
      { id: 'cocomelon', mono: 'CM', name: 'CoComelon (português)', cat: 'infantil', type: 'youtube', color: '#16a34a', live: false,
        handle: '@cocomelonbr', channelId: 'UC7G8k15G_FOFQ0hlyj_R7_w', desc: 'Músicas infantis animadas, em português.' },
      { id: 'galinha', mono: 'GP', name: 'Galinha Pintadinha', cat: 'infantil', type: 'youtube', color: '#2563eb', live: false,
        handle: '@galinhapintadinha', channelId: 'UCBAb_DK4GYZqZR9MFA7y2Xg', desc: 'Músicas e desenhos para cantar junto, um depois do outro.' },
      { id: 'monica', mono: 'TM', name: 'Turma da Mônica', cat: 'infantil', type: 'youtube', color: '#dc2626', live: false,
        handle: '@turmadamonica', channelId: 'UCV4XcEqBswMCryorV_gNENw', desc: 'Episódios oficiais da Turma da Mônica.' },
      { id: 'mundobita', mono: 'MB', name: 'Mundo Bita', cat: 'infantil', type: 'youtube', color: '#f59e0b', live: false,
        handle: '@MundoBita', channelId: 'UC0cGVh96osM7yqMu0ENSKKQ', desc: 'Músicas e clipes do Mundo Bita para cantar junto.' },
      { id: 'bobzoom', mono: 'BZ', name: 'Bob Zoom', cat: 'infantil', type: 'youtube', color: '#22c55e', live: false,
        handle: '@BobZoom', channelId: 'UCZcsG6kUpOLQZZpTMSAernw', desc: 'Músicas infantis animadas para cantar e dançar.' },
      { id: 'patati', mono: 'PP', name: 'Patati Patatá', cat: 'infantil', type: 'youtube', color: '#ec4899', live: false,
        handle: '@patatipatata', channelId: 'UCe-BBpsnL89BMr6WbvBQ9dw', desc: 'Músicas e brincadeiras da dupla de palhaços.' },

      // ---------------- EDUCAÇÃO E CULTURA ----------------
      { id: 'canaleducacao', mono: 'EDU', name: 'Canal Educação', cat: 'educacao', type: 'hls', color: '#0284c7',
        url: 'https://canaleducacao-stream.ebc.com.br/index.m3u8', desc: 'Canal educativo oficial (EBC/MEC), ao vivo.' },
      { id: 'tvers', mono: 'TVE', name: 'TVE RS', cat: 'educacao', type: 'hls', color: '#0369a1',
        url: 'https://streaming.procergs.com.br:8443/tve/stve/playlist.m3u8', desc: 'TV educativa do Rio Grande do Sul, ao vivo.' },
      { id: 'multicultura', mono: 'MC', name: 'Multicultura', cat: 'educacao', type: 'youtube', color: '#0e7490',
        handle: '@Multicultura', channelId: 'UCiU2TTS7XoJ5DDWgmNaw17g', live: true, desc: 'Canal 24h da TV Cultura (Fundação Padre Anchieta).' },
      { id: 'natgeo', mono: 'NG', name: 'National Geographic Brasil', cat: 'educacao', type: 'youtube', color: '#eab308', live: false,
        handle: '@natgeobrasil', channelId: 'UCFupUY6CNLg5Z7U7u4oEb5w', desc: 'Natureza, animais, ciência e exploração.' },
      { id: 'tvcultura_yt', mono: 'CULT', name: 'TV Cultura (lives e programas)', cat: 'educacao', type: 'youtube', color: '#155e75', live: false,
        handle: '@tvcultura', channelId: 'UCjOJvvYe6tyEHY21OD33h8A', desc: 'Programas e transmissões da TV Cultura, no canal oficial.' },

      // ---------------- FÉ E FAMÍLIA ----------------
      { id: 'cancaonova', mono: 'CN', name: 'TV Canção Nova', cat: 'fe', type: 'youtube', color: '#0ea5e9',
        handle: '@tvcancaonova', channelId: 'UCVrKQMmA2ew9LFzeIDaOFgw', live: true, desc: 'TV Canção Nova ao vivo, em transmissão contínua.' },
      { id: 'redevida', mono: 'RV', name: 'Rede Vida', cat: 'fe', type: 'youtube', color: '#0f766e',
        handle: '@tvredevida', channelId: 'UC7MUmXqD_kEChxYFME0bdtg', desc: 'Missas e programas da Rede Vida, no canal oficial.' },
      { id: 'novotempo', mono: 'NT', name: 'Novo Tempo', cat: 'fe', type: 'youtube', color: '#2563eb',
        channelId: 'UC_OaSsAydgSIjUtjYn9qLog', live: true, desc: 'TV Novo Tempo ao vivo, 24 horas.' },
      { id: 'aparecida', mono: 'TA', name: 'TV Aparecida', cat: 'fe', type: 'youtube', color: '#1d4ed8',
        handle: '@tvaparecida', channelId: 'UCfYrK5JU5EznsnK3wQE7iIg', fallback: 'https://www.a12.com/tv', desc: 'Missas e programas da TV Aparecida, ao vivo quando estão no ar.' },
      { id: 'evangelizar', mono: 'EV', name: 'TV Evangelizar', cat: 'fe', type: 'youtube', color: '#7c2d12',
        handle: '@TVEvangelizarOficial', desc: 'Missas e programas de fé, no canal oficial.' },

      // ---------------- APPS GRÁTIS (abrem o app oficial) ----------------
      { id: 'plutotv', android: 'tv.pluto.android', name: 'Pluto TV', cat: 'filmes', type: 'link', color: '#0b0b0f',
        url: 'https://pluto.tv/br', desc: 'Muitos canais temáticos e filmes grátis e legais. Abre o app oficial.' },
      { id: 'samsungtvplus', android: 'com.samsung.android.tvplus', name: 'Samsung TV Plus', cat: 'filmes', type: 'link', color: '#1428a0', mono: 'TV+',
        url: 'https://www.samsung.com/br/televisions-home-theater/tvs/tvplus/', desc: 'Canais grátis 24h, inclusive novelas e esportes. Sem cadastro, nas TVs e celulares Samsung.' },
      { id: 'vix', name: 'ViX', cat: 'filmes', type: 'link', color: '#f97316',
        url: 'https://vix.com/pt-br', desc: 'Novelas, filmes e séries grátis. Abre o app oficial.' },
      { id: 'plex', android: 'com.plexapp.android', name: 'Plex', cat: 'filmes', type: 'link', color: '#e5a00d',
        url: 'https://watch.plex.tv/pt-BR', desc: 'Filmes e canais ao vivo grátis. Abre o app oficial.' },
      { id: 'globoplayfree', android: 'com.globo.globotv', name: 'Globoplay Grátis', cat: 'filmes', type: 'link', color: '#ef4444',
        url: 'https://globoplay.globo.com/', desc: 'Sinal da Globo ao vivo e conteúdos liberados com a Conta Globo gratuita.' },
      { id: 'maissbt', name: '+SBT', cat: 'filmes', type: 'link', color: '#eab308',
        url: 'https://www.maissbt.com/', desc: 'Novelas e programas do SBT grátis, no app oficial.' },
      { id: 'mercadoplay', name: 'Mercado Play', cat: 'filmes', type: 'link', color: '#facc15',
        url: 'https://play.mercadolivre.com.br/', desc: 'Filmes e séries grátis do Mercado Livre.' },
      { id: 'libreflix', name: 'Libreflix', cat: 'filmes', type: 'link', color: '#9333ea',
        url: 'https://libreflix.org/', desc: 'Filmes independentes e documentários livres e gratuitos.' }
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CATALOG;
  else root.CATALOG = CATALOG;
})(this);

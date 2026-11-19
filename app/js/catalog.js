/*
 * Catálogo padrão do Accioly Play.
 *
 * REGRA DE OURO: aqui só entram fontes OFICIAIS e GRATUITAS
 * (sinal da própria emissora, órgãos públicos, canais oficiais no YouTube
 * e plataformas FAST legais como Pluto TV, ViX e Plex).
 * Nada de listas IPTV piratas ou canais pagos "liberados".
 *
 * Tipos:
 *   hls     -> toca dentro do app (sinal oficial .m3u8)
 *   youtube -> toca dentro do app via player oficial do YouTube (handle @canal)
 *   link    -> abre o site/app oficial da emissora ou plataforma
 *
 * Campo opcional "android": pacote do app oficial na Android TV
 * (o app Android abre direto o app oficial, ou a Play Store para instalar).
 *
 * O dono edita tudo isso no Painel do Dono (aba "Canais").
 * Este arquivo é só o ponto de partida.
 */
(function (root) {
  var CATALOG = {
    version: 1,
    categories: [
      { id: 'abertos', name: 'TV Aberta ao Vivo' },
      { id: 'noticias', name: 'Notícias 24h' },
      { id: 'esportes', name: 'Esportes' },
      { id: 'filmes', name: 'Filmes, Séries e Novelas Grátis' },
      { id: 'infantil', name: 'Infantil' },
      { id: 'educacao', name: 'Educação e Cultura' },
      { id: 'fe', name: 'Fé e Família' }
    ],
    items: [
      // ---------------- TV ABERTA ----------------
      { id: 'globo', android: 'com.globo.globotv', name: 'TV Globo', cat: 'abertos', type: 'link', color: '#1f6feb',
        url: 'https://globoplay.globo.com/',
        desc: 'Sinal ao vivo da Globo da sua região no Globoplay. Crie a Conta Globo grátis e escolha "Ao vivo".' },
      { id: 'sbt', name: 'SBT', cat: 'abertos', type: 'youtube', color: '#e3a008',
        handle: '@SBT', channelId: 'UCR3TOnFWDeAlT-Ho6LueDmg', fallback: 'https://www.sbt.com.br/ao-vivo',
        desc: 'Sinal ao vivo do SBT no canal oficial do YouTube, direto no app.' },
      { id: 'band', name: 'Band', cat: 'abertos', type: 'link', color: '#0e9f6e',
        url: 'https://www.band.uol.com.br/ao-vivo',
        desc: 'Band ao vivo no site oficial / Bandplay.' },
      { id: 'record', name: 'Record', cat: 'abertos', type: 'link', color: '#2563eb',
        url: 'https://www.recordplus.com/',
        desc: 'Record ao vivo no app oficial (cadastro grátis).' },
      { id: 'redetv', name: 'RedeTV!', cat: 'abertos', type: 'link', color: '#d61f69',
        url: 'https://www.redetv.uol.com.br/aovivo',
        desc: 'RedeTV! ao vivo no site oficial.' },
      { id: 'cultura', name: 'TV Cultura', cat: 'abertos', type: 'hls', color: '#0891b2',
        url: 'https://player-tvcultura.stream.uol.com.br/live/tvcultura.m3u8',
        fallback: 'https://cultura.uol.com.br/aovivo',
        desc: 'Sinal oficial da TV Cultura, direto no app.' },
      { id: 'tvbrasil', name: 'TV Brasil', cat: 'abertos', type: 'hls', color: '#16a34a',
        url: 'https://tvbrasil-stream.ebc.com.br/index.m3u8',
        fallback: 'https://tvbrasil.ebc.com.br/aovivo',
        desc: 'TV pública nacional (EBC), sinal oficial.' },

      // ---------------- NOTÍCIAS ----------------
      { id: 'cnnbrasil', name: 'CNN Brasil', cat: 'noticias', type: 'youtube', color: '#b91c1c',
        handle: '@CNNbrasil', channelId: 'UCvdwhh_fDyWccR42-rReZLw', desc: 'Notícias 24h no canal oficial do YouTube.' },
      { id: 'jpnews', name: 'Jovem Pan News', cat: 'noticias', type: 'youtube', color: '#1d4ed8',
        handle: '@jovempannews', channelId: 'UCP391YRAjSOdM_bwievgaZA', desc: 'Notícias ao vivo no canal oficial.' },
      { id: 'sbtnews', name: 'SBT News', cat: 'noticias', type: 'youtube', color: '#ca8a04',
        handle: '@SBTNews', channelId: 'UC376n347Ob5Lwzq2WGzF1AA', desc: 'Canal de notícias 24h do SBT no YouTube.' },
      { id: 'recordnews', name: 'Record News', cat: 'noticias', type: 'youtube', color: '#1e40af',
        handle: '@recordnews', channelId: 'UCuiLR4p6wQ3xLEm15pEn1Xw', desc: 'Notícias ao vivo da Record.' },
      { id: 'bandnews', name: 'Band Jornalismo', cat: 'noticias', type: 'youtube', color: '#047857',
        handle: '@BandJornalismo', channelId: 'UCoa-D_VfMkFrCYodrOC9-mA', desc: 'Jornalismo da Band ao vivo.' },
      { id: 'timesbrasil', name: 'Times Brasil', cat: 'noticias', type: 'youtube', color: '#334155',
        handle: '@TimesBrasil', channelId: 'UC2vs-PnhPNxACC5wti_KMTg', desc: 'Economia e negócios ao vivo.' },
      { id: 'canaluol', name: 'Canal UOL', cat: 'noticias', type: 'hls', color: '#ea580c',
        url: 'https://video24.mais.uol.com.br/live/6146.m3u8', desc: 'Sinal oficial do Canal UOL.' },
      { id: 'tvcamara', name: 'TV Câmara', cat: 'noticias', type: 'hls', color: '#15803d',
        url: 'https://stream3.camara.gov.br/tv1/manifest.m3u8', desc: 'TV oficial da Câmara dos Deputados.' },
      { id: 'tvsenado', name: 'TV Senado', cat: 'noticias', type: 'youtube', color: '#1e3a8a',
        handle: '@TVSenado', channelId: 'UCLgti7NuK0RuW9wty-fxPjQ', desc: 'TV oficial do Senado Federal.' },
      { id: 'canalgov', name: 'Canal Gov', cat: 'noticias', type: 'hls', color: '#0f766e',
        url: 'https://canalgov-stream.ebc.com.br/index.m3u8', desc: 'Canal oficial do Governo Federal (EBC).' },
      { id: 'canalrural', name: 'Canal Rural', cat: 'noticias', type: 'youtube', color: '#65a30d',
        handle: '@canalrural', channelId: 'UCPumJ2ayrr-JDsA9JDCUDDQ', desc: 'Agronegócio ao vivo.' },

      // ---------------- ESPORTES ----------------
      { id: 'cazetv', name: 'CazéTV', cat: 'esportes', type: 'youtube', color: '#7c3aed',
        handle: '@CazeTV', channelId: 'UCZiYbVptd3PVPf4f6eR6UaQ', desc: 'Transmissões oficiais e gratuitas de jogos e eventos (quando ao vivo).' },
      { id: 'ge', name: 'ge (Globo Esporte)', cat: 'esportes', type: 'link', color: '#16a34a',
        url: 'https://ge.globo.com/', desc: 'Notícias, gols e o canal grátis ge FAST no Globoplay.' },
      { id: 'plutoesportes', android: 'tv.pluto.android', name: 'Pluto TV Esportes', cat: 'esportes', type: 'link', color: '#111827',
        url: 'https://pluto.tv/br/live-tv', desc: 'Canais de esporte grátis da Pluto TV.' },

      // ---------------- FILMES / SÉRIES / NOVELAS ----------------
      { id: 'plutotv', android: 'tv.pluto.android', name: 'Pluto TV', cat: 'filmes', type: 'link', color: '#0b0b0f',
        url: 'https://pluto.tv/br', desc: '+250 canais e milhares de filmes grátis e legais.' },
      { id: 'vix', name: 'ViX', cat: 'filmes', type: 'link', color: '#f97316',
        url: 'https://vix.com/pt-br', desc: 'Novelas, filmes e séries grátis em português.' },
      { id: 'plex', android: 'com.plexapp.android', name: 'Plex', cat: 'filmes', type: 'link', color: '#e5a00d',
        url: 'https://watch.plex.tv/pt-BR', desc: 'Filmes e canais ao vivo grátis.' },
      { id: 'globoplayfree', android: 'com.globo.globotv', name: 'Globoplay Grátis', cat: 'filmes', type: 'link', color: '#ef4444',
        url: 'https://globoplay.globo.com/', desc: 'Novelas e séries liberadas com a Conta Globo gratuita.' },
      { id: 'maissbt', name: '+SBT', cat: 'filmes', type: 'link', color: '#eab308',
        url: 'https://www.maissbt.com/', desc: 'Novelas e programas do SBT grátis.' },
      { id: 'mercadoplay', name: 'Mercado Play', cat: 'filmes', type: 'link', color: '#facc15',
        url: 'https://play.mercadolivre.com.br/', desc: 'Filmes e séries grátis do Mercado Livre.' },
      { id: 'libreflix', name: 'Libreflix', cat: 'filmes', type: 'link', color: '#9333ea',
        url: 'https://libreflix.org/', desc: 'Cinema independente e documentários livres.' },

      // ---------------- INFANTIL ----------------
      { id: 'galinha', name: 'Galinha Pintadinha', cat: 'infantil', type: 'youtube', color: '#2563eb',
        handle: '@GalinhaPintadinha', channelId: 'UCBAb_DK4GYZqZR9MFA7y2Xg', live: false, desc: 'Clipes e desenhos do canal oficial, direto no app.' },
      { id: 'monica', name: 'Turma da Mônica', cat: 'infantil', type: 'youtube', color: '#dc2626',
        handle: '@TurmadaMonica', channelId: 'UCV4XcEqBswMCryorV_gNENw', live: false, desc: 'Canal oficial da Turma da Mônica.' },
      { id: 'plutokids', android: 'tv.pluto.android', name: 'Pluto TV Kids', cat: 'infantil', type: 'link', color: '#22c55e',
        url: 'https://pluto.tv/br/live-tv', desc: 'Desenhos grátis na Pluto TV (categoria Kids).' },

      // ---------------- EDUCAÇÃO ----------------
      { id: 'canaleducacao', name: 'Canal Educação', cat: 'educacao', type: 'hls', color: '#0284c7',
        url: 'https://canaleducacao-stream.ebc.com.br/index.m3u8', desc: 'Canal educativo oficial (EBC/MEC).' },
      { id: 'tvers', name: 'TVE RS', cat: 'educacao', type: 'hls', color: '#0369a1',
        url: 'https://streaming.procergs.com.br:8443/tve/stve/playlist.m3u8', desc: 'TV educativa oficial do RS.' },
      { id: 'tvcultura_yt', name: 'TV Cultura (YouTube)', cat: 'educacao', type: 'youtube', color: '#0e7490',
        handle: '@tvcultura', channelId: 'UCjOJvvYe6tyEHY21OD33h8A', desc: 'Programas da TV Cultura no canal oficial.' },

      // ---------------- FÉ E FAMÍLIA ----------------
      { id: 'cancaonova', name: 'Canção Nova', cat: 'fe', type: 'youtube', color: '#0ea5e9',
        handle: '@cancaonova', channelId: 'UC6V9mqiVuzd-v3ozUfCtZFA', desc: 'Canal oficial ao vivo.' },
      { id: 'aparecida', name: 'TV Aparecida', cat: 'fe', type: 'youtube', color: '#1d4ed8',
        handle: '@TVAparecida', channelId: 'UCfYrK5JU5EznsnK3wQE7iIg', desc: 'Canal oficial ao vivo.' },
      { id: 'redevida', name: 'Rede Vida', cat: 'fe', type: 'youtube', color: '#0f766e',
        handle: '@redevida', channelId: 'UCO8Xj__-fz-YJEJ2gN7h9gQ', desc: 'Canal oficial ao vivo.' }
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CATALOG;
  else root.CATALOG = CATALOG;
})(this);

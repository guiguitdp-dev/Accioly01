/* Service worker: deixa o app abrir rápido e os jogos funcionarem mesmo com internet ruim. */
var CACHE = 'accioly-play-v7';
var SHELL = ['./', 'index.html', 'css/app.css', 'css/futuro.css', 'js/options.js', 'vendor/fonts/orbitron-latin-700-normal.woff2', 'vendor/fonts/orbitron-latin-900-normal.woff2', 'js/config.js', 'js/catalog.js', 'js/input.js', 'js/player.js', 'js/app.js', 'js/ads.js', 'js/media.js', 'js/localmedia.js', 'js/news.js', 'js/noticias-snapshot.js',
  'js/games/hub.js', 'js/games/cobrinha.js', 'js/games/quebrablocos.js', 'js/games/pingpong.js', 'js/games/meteoros.js',
  'js/games/memoria.js', 'js/games/quiz.js', 'js/games/velha.js', 'js/games/corrida.js',
  'js/games/frutas.js', 'js/games/blocos.js', 'js/games/penaltis.js', 'js/games/palavra.js', 'js/games/capivara.js',
  'js/games/esquadrilha.js', 'js/games/comando.js', 'js/games/mira.js', 'js/games/operacao3d.js', 'icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.indexOf('/api/') >= 0) return;
  // Rede primeiro (pega atualizações), cache se estiver offline.
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone();
    if (res.ok) caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return res;
  }).catch(function () { return caches.match(e.request); }));
});

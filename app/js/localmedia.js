/*
 * Música e Vídeos SEM servidor (modo dono: app dentro do celular/TV ou pendrive).
 * Mesmo resultado que /api/media/* do servidor, mas feito direto no aparelho:
 *  - YouTube oficial: usa a chave da YouTube Data API guardada NESTE aparelho
 *    (Conta → "Chave do YouTube"). Cache local para economizar cota.
 *  - Música livre (Audius): sem chave, sem anúncios.
 */
(function () {
  var YT = 'https://www.googleapis.com/youtube/v3';
  var AUDIUS = 'https://api.audius.co/v1';
  var APP = 'AcciolyPlay';

  function key() { try { return localStorage.getItem('ap_ytkey') || ''; } catch (e) { return ''; } }
  function cacheGet(k, ttl) {
    try { var v = JSON.parse(localStorage.getItem('ap_mc_' + k) || 'null'); if (v && Date.now() - v.at < ttl) return v.data; } catch (e) {}
    return null;
  }
  function cacheSet(k, data) { try { localStorage.setItem('ap_mc_' + k, JSON.stringify({ at: Date.now(), data: data })); } catch (e) {} }
  function getJson(url) {
    return fetch(url).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error((j.error && j.error.message) || ('Erro ' + r.status)); return j; }); });
  }
  function cached(k, ttl, fn) { var c = cacheGet(k, ttl); return c ? Promise.resolve(c) : fn().then(function (d) { cacheSet(k, d); return d; }); }

  function dur(d) {
    var m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || '');
    if (!m) return '';
    var h = +m[1] || 0, mi = +m[2] || 0, s = +m[3] || 0;
    return (h ? h + ':' + ('0' + mi).slice(-2) : mi) + ':' + ('0' + s).slice(-2);
  }
  function ytItem(v) {
    var sn = v.snippet || {}, th = sn.thumbnails || {};
    return { id: typeof v.id === 'string' ? v.id : (v.id && v.id.videoId), title: sn.title || '', channel: sn.channelTitle || '',
      thumb: (th.high || th.medium || th.default || {}).url || '', duration: v.contentDetails ? dur(v.contentDetails.duration) : '', live: sn.liveBroadcastContent === 'live' };
  }
  function chart(kind) {
    if (!key()) return Promise.resolve([]);
    return cached('chart_' + kind, 3 * 3600e3, function () {
      var q = 'part=snippet,contentDetails&chart=mostPopular&regionCode=BR&hl=pt_BR&maxResults=30&key=' + encodeURIComponent(key()) + (kind === 'music' ? '&videoCategoryId=10' : '');
      return getJson(YT + '/videos?' + q).then(function (j) { return (j.items || []).map(ytItem).filter(function (x) { return x.id; }); });
    });
  }
  function search(q, kind) {
    if (!key()) return Promise.resolve([]);
    return cached('s_' + kind + '_' + q.toLowerCase(), 12 * 3600e3, function () {
      var p = 'part=snippet&type=video&videoEmbeddable=true&regionCode=BR&relevanceLanguage=pt&safeSearch=moderate&maxResults=24&q=' + encodeURIComponent(q) + '&key=' + encodeURIComponent(key()) + (kind === 'music' ? '&videoCategoryId=10' : '');
      return getJson(YT + '/search?' + p).then(function (s) {
        var ids = (s.items || []).map(function (i) { return i.id && i.id.videoId; }).filter(Boolean);
        if (!ids.length) return [];
        return getJson(YT + '/videos?part=snippet,contentDetails&id=' + ids.join(',') + '&key=' + encodeURIComponent(key()))
          .then(function (v) { return (v.items || []).map(ytItem).filter(function (x) { return x.id; }); });
      });
    });
  }
  function audiusItem(t) {
    var a = t.artwork || {};
    return { id: t.id, title: t.title || '', channel: (t.user && t.user.name) || '', thumb: a['480x480'] || a['150x150'] || '',
      duration: t.duration ? Math.floor(t.duration / 60) + ':' + ('0' + (t.duration % 60)).slice(-2) : '',
      stream: AUDIUS + '/tracks/' + encodeURIComponent(t.id) + '/stream?app_name=' + APP };
  }
  function audiusTrending() {
    return cached('audius_trend', 3600e3, function () {
      return getJson(AUDIUS + '/tracks/trending?time=week&app_name=' + APP).then(function (j) { return (j.data || []).slice(0, 30).map(audiusItem); });
    });
  }
  function audiusSearch(q) {
    return cached('audius_' + q.toLowerCase(), 6 * 3600e3, function () {
      return getJson(AUDIUS + '/tracks/search?query=' + encodeURIComponent(q) + '&app_name=' + APP).then(function (j) { return (j.data || []).slice(0, 24).map(audiusItem); });
    });
  }
  function safe(p) { return p.catch(function () { return []; }); }

  window.LocalMedia = {
    hasKey: function () { return !!key(); },
    setKey: function (k) { try { localStorage.setItem('ap_ytkey', String(k || '').trim()); } catch (e) {} },
    home: function () {
      return Promise.all([safe(chart('music')), safe(chart('videos')), safe(audiusTrending())])
        .then(function (r) { return { youtube: !!key(), local: true, music: r[0], videos: r[1], free: r[2] }; });
    },
    search: function (q, kind) {
      return Promise.all([safe(search(q, kind)), safe(audiusSearch(q))]).then(function (r) { return { youtube: r[0], free: r[1] }; });
    }
  };
})();

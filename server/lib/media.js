/*
 * Música e vídeos de fontes oficiais:
 *  - YouTube Data API v3 (chave do dono). Os vídeos tocam no player OFICIAL do YouTube,
 *    com os anúncios do próprio YouTube (é o que paga os artistas; bloquear é proibido).
 *    Economia de cota: "em alta" custa 1 unidade e fica 3h em cache; cada busca custa
 *    ~101 unidades e fica 12h em cache (cota grátis: 10.000 unidades/dia).
 *  - Audius: músicas liberadas pelos próprios artistas, sem anúncios.
 */
const YT = 'https://www.googleapis.com/youtube/v3';
const AUDIUS = 'https://api.audius.co/v1';
const APP_NAME = 'AcciolyPlay';

const cache = new Map();
function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
  return fn().then((value) => {
    cache.set(key, { at: Date.now(), value });
    if (cache.size > 600) cache.delete(cache.keys().next().value);
    return value;
  });
}

async function getJson(url, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms || 12000);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && (j.error.message || j.error)) || ('HTTP ' + r.status));
    return j;
  } finally { clearTimeout(t); }
}

// "PT3M45S" -> "3:45"
function isoDuration(d) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || '');
  if (!m) return '';
  const h = +m[1] || 0, min = +m[2] || 0, s = +m[3] || 0;
  if (!h && !min && !s) return 'AO VIVO';
  return (h ? h + ':' + String(min).padStart(2, '0') : min) + ':' + String(s).padStart(2, '0');
}

function ytItem(v) {
  const sn = v.snippet || {};
  const th = sn.thumbnails || {};
  return {
    id: typeof v.id === 'string' ? v.id : (v.id && v.id.videoId),
    title: sn.title || '', channel: sn.channelTitle || '',
    thumb: (th.high || th.medium || th.default || {}).url || '',
    duration: v.contentDetails ? isoDuration(v.contentDetails.duration) : '',
    live: sn.liveBroadcastContent === 'live'
  };
}

function ytChart(key, kind) {
  return cached('chart:' + kind, 3 * 3600e3, async () => {
    const params = new URLSearchParams({ part: 'snippet,contentDetails', chart: 'mostPopular', regionCode: 'BR', hl: 'pt_BR', maxResults: '30', key });
    if (kind === 'music') params.set('videoCategoryId', '10');
    const j = await getJson(YT + '/videos?' + params);
    return (j.items || []).map(ytItem).filter((x) => x.id);
  });
}

function ytSearch(key, q, kind) {
  const query = String(q || '').trim().slice(0, 80);
  if (query.length < 2) return Promise.resolve([]);
  return cached('search:' + kind + ':' + query.toLowerCase(), 12 * 3600e3, async () => {
    const params = new URLSearchParams({ part: 'snippet', type: 'video', videoEmbeddable: 'true', regionCode: 'BR', relevanceLanguage: 'pt', safeSearch: 'moderate', maxResults: '24', q: query, key });
    if (kind === 'music') params.set('videoCategoryId', '10');
    const s = await getJson(YT + '/search?' + params);
    const ids = (s.items || []).map((i) => i.id && i.id.videoId).filter(Boolean);
    if (!ids.length) return [];
    const v = await getJson(YT + '/videos?' + new URLSearchParams({ part: 'snippet,contentDetails', id: ids.join(','), key }));
    return (v.items || []).map(ytItem).filter((x) => x.id);
  });
}

function audiusItem(t) {
  const art = t.artwork || {};
  return {
    id: t.id, title: t.title || '', channel: (t.user && t.user.name) || '',
    thumb: art['480x480'] || art['150x150'] || '',
    duration: t.duration ? Math.floor(t.duration / 60) + ':' + String(t.duration % 60).padStart(2, '0') : '',
    stream: AUDIUS + '/tracks/' + encodeURIComponent(t.id) + '/stream?app_name=' + APP_NAME
  };
}

function audiusTrending() {
  return cached('audius:trending', 3600e3, async () => {
    const j = await getJson(AUDIUS + '/tracks/trending?time=week&app_name=' + APP_NAME);
    return (j.data || []).slice(0, 30).map(audiusItem).filter((x) => x.id);
  });
}

function audiusSearch(q) {
  const query = String(q || '').trim().slice(0, 80);
  if (query.length < 2) return Promise.resolve([]);
  return cached('audius:search:' + query.toLowerCase(), 6 * 3600e3, async () => {
    const j = await getJson(AUDIUS + '/tracks/search?' + new URLSearchParams({ query, app_name: APP_NAME }));
    return (j.data || []).slice(0, 24).map(audiusItem).filter((x) => x.id);
  });
}

// Dados de exemplo para testes automáticos sem internet (MEDIA_MOCK=1)
function mock(prefix, n) {
  const out = [];
  for (let i = 1; i <= n; i++) out.push({ id: prefix + i, title: 'Exemplo ' + prefix + ' ' + i, channel: 'Canal ' + i, thumb: '', duration: '3:0' + i, stream: 'about:blank' });
  return out;
}

module.exports = { ytChart, ytSearch, audiusTrending, audiusSearch, isoDuration, mock };

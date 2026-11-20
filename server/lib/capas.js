/*
 * Capas reais dos canais: o vídeo mais recente de cada canal OFICIAL do YouTube
 * (feed público do canal). O app mostra a miniatura oficial do vídeo no cartão,
 * como num streaming de verdade. Sem chave de API e sem custo.
 */
const UA = 'Mozilla/5.0 (compatible; AcciolyPlay/1.0; capas)';

async function feed(channelId, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms || 12000);
  try {
    const r = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId, { signal: ctl.signal, headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

function decode(s) {
  return String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n));
}

// Primeiro vídeo do feed que não é Short (Shorts ficam em pé e cortados no cartão)
function latest(xml) {
  const entries = String(xml || '').match(/<entry>[\s\S]*?<\/entry>/g) || [];
  for (const e of entries.slice(0, 6)) {
    const v = (/<yt:videoId>([\w-]{11})<\/yt:videoId>/.exec(e) || [])[1];
    if (!v) continue;
    const link = (/<link[^>]+href="([^"]+)"/.exec(e) || [])[1] || '';
    if (/\/shorts\//.test(link)) continue;
    const title = decode((/<title>([^<]*)<\/title>/.exec(e) || [])[1] || '').trim().slice(0, 140);
    const d = Date.parse((/<published>([^<]+)<\/published>/.exec(e) || [])[1] || '') || 0;
    return { v, t: title, d };
  }
  return null;
}

// items: itens do catálogo. Devolve { updatedAt, items: { id: { v, t, d } } }
async function collect(items, opts) {
  opts = opts || {};
  const get = opts.feed || feed;
  const list = items.filter((i) => i.type === 'youtube' && /^UC[\w-]{22}$/.test(i.channelId || '') && i.enabled !== false);
  const out = {};
  let fails = 0;
  const queue = list.slice();
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const it = queue.shift();
      try { const l = latest(await get(it.channelId)); if (l) out[it.id] = l; } catch (e) { fails++; }
    }
  }));
  return { updatedAt: Date.now(), total: Object.keys(out).length, fails, items: out };
}

let memo = null, memoAt = 0, pending = null;
// Cache de 1 hora; quando vence, responde na hora com a lista guardada e atualiza por trás
function get(items, ttlMs) {
  if (!(memo && Date.now() - memoAt < (ttlMs || 3600e3)) && !pending) {
    pending = collect(items).then((r) => { if (r.total || !memo) memo = r; memoAt = Date.now(); return memo; })
      .catch((e) => { memoAt = Date.now(); if (!memo) throw e; return memo; })
      .finally(() => { pending = null; });
  }
  return memo ? Promise.resolve(memo) : pending;
}

function mock(items) {
  const out = {};
  items.filter((i) => i.type === 'youtube').slice(0, 12).forEach((i, k) => { out[i.id] = { v: 'aaaaaaaaa' + String(k).padStart(2, '0'), t: 'Vídeo de teste ' + (k + 1), d: Date.now() - k * 3600e3 }; });
  return { updatedAt: Date.now(), total: Object.keys(out).length, fails: 0, items: out, mock: true };
}

module.exports = { collect, get, latest, mock };

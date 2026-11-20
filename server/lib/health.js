/*
 * Verificador de canais (ZERO tokens de IA — é só código).
 * - HLS: confere se a playlist .m3u8 responde e é válida.
 * - YouTube: descobre o ID do canal oficial a partir do @handle e vê se está ao vivo.
 * - Links: confere se o site oficial abre.
 * Roda sozinho no servidor a cada 6 horas e também via `npm run checar-canais`.
 */
const UA = 'Mozilla/5.0 (Linux; Android 12; Smart TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function get(url, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms || 12000);
  const started = Date.now();
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9', Cookie: 'CONSENT=YES+1' } });
    const text = await r.text();
    return { status: r.status, text, ms: Date.now() - started, finalUrl: r.url };
  } finally { clearTimeout(t); }
}

// O YouTube costuma bloquear robôs em servidores de nuvem: isso NÃO quer dizer que o canal saiu do ar.
// Por isso só marcamos "fora do ar" quando o YouTube responde claramente que o canal não existe (404).
function realPage(t) { return /ytInitialData|"externalId"|og:title/.test(t || ''); }

// true = ao vivo, false = sem live, null = não deu para saber agora
async function liveStatus(channelId) {
  try {
    const lr = await get('https://www.youtube.com/channel/' + channelId + '/live', 15000);
    if (lr.status >= 400 || !realPage(lr.text)) return null;
    return /"isLiveNow":true|"isLive":true|hqdefault_live\.jpg/.test(lr.text);
  } catch (e) { return null; }
}

// Confere o canal pelo ID oficial no feed público do YouTube (leve e confiável)
async function channelExists(channelId) {
  try {
    const r = await get('https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId, 15000);
    if (r.status === 404) return false;
    if (r.status < 400 && /<feed\b/.test(r.text)) return true;
  } catch (e) { /* sem resposta */ }
  return null;
}

// Descobre o ID pelo @handle (ou usa o ID já conhecido) e vê se está ao vivo
async function resolveYoutube(handle, knownId) {
  const h = String(handle || '').trim();
  let id = null, error = null;
  if (/^@[\w.\-]{2,60}$/.test(h)) {
    try {
      const r = await get('https://www.youtube.com/' + h, 15000);
      if (r.status === 404) error = 'canal não existe (HTTP 404)';
      else if (r.status >= 400) error = 'HTTP ' + r.status;
      else {
        const m = r.text.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) ||
                  r.text.match(/"externalId":"(UC[\w-]{22})"/) || r.text.match(/"channelId":"(UC[\w-]{22})"/);
        if (m) id = m[1]; else error = 'ID não encontrado';
      }
    } catch (e) { error = e.name === 'AbortError' ? 'tempo esgotado' : String(e.message || e); }
  } else if (h) error = 'handle inválido';
  id = id || (/^UC[\w-]{22}$/.test(knownId || '') ? knownId : null);
  if (!id) return { channelId: null, live: false, liveKnown: false, error: error || 'sem ID' };
  const live = await liveStatus(id);
  return { channelId: id, live: live === true, liveKnown: live !== null };
}

function ytNote(exists, live) {
  return (exists === true ? 'canal OK' : 'canal não confirmado agora (YouTube não respondeu) — mantido no ar') +
    (live === true ? ' · AO VIVO agora' : live === false ? ' (sem live no momento)' : '');
}

async function checkItem(it) {
  try {
    if (it.type === 'hls') {
      const r = await get(it.url, 12000);
      const ok = r.status < 400 && r.text.indexOf('#EXTM3U') >= 0;
      return { ok, status: r.status, ms: r.ms, note: ok ? 'sinal OK' : 'playlist inválida/fora do ar' };
    }
    if (it.type === 'youtube' && it.channelId) {
      const exists = await channelExists(it.channelId);
      if (exists === false) return { ok: false, channelId: it.channelId, live: false, note: 'canal não encontrado no YouTube (o ID mudou?)' };
      const live = await liveStatus(it.channelId);
      return { ok: true, channelId: it.channelId, live: live === true, liveKnown: live !== null, note: ytNote(exists, live) };
    }
    if (it.type === 'youtube') {
      const y = await resolveYoutube(it.handle);
      if (y.channelId) return { ok: true, channelId: y.channelId, live: y.live, liveKnown: y.liveKnown, note: ytNote(true, y.liveKnown ? y.live : null) };
      const gone = /404|inválido/.test(y.error || '');
      return { ok: !gone, note: gone ? y.error : 'sem ID gravado e o YouTube não respondeu (' + y.error + ') — mantido no ar' };
    }
    const r = await get(it.url, 12000);
    const ok = r.status < 400;
    return { ok, status: r.status, ms: r.ms, note: ok ? 'site OK' : (r.status === 403 ? 'site bloqueia robôs (verificar manualmente)' : 'site com erro') };
  } catch (e) {
    return { ok: false, note: e.name === 'AbortError' ? 'tempo esgotado' : String(e.message || e) };
  }
}

async function checkAll(items, concurrency) {
  const out = {};
  const queue = items.slice();
  const workers = Array.from({ length: concurrency || 6 }, async () => {
    while (queue.length) {
      const it = queue.shift();
      out[it.id] = Object.assign({ at: Date.now(), type: it.type }, await checkItem(it));
    }
  });
  await Promise.all(workers);
  return out;
}

module.exports = { checkAll, checkItem, resolveYoutube, channelExists, liveStatus };

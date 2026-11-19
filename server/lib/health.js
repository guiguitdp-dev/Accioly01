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

async function resolveYoutube(handle) {
  const h = String(handle || '').trim();
  if (!/^@[\w.\-]{2,60}$/.test(h)) return { channelId: null, live: false, error: 'handle inválido' };
  const r = await get('https://www.youtube.com/' + h, 15000);
  if (r.status >= 400) return { channelId: null, live: false, error: 'HTTP ' + r.status };
  const m = r.text.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) ||
            r.text.match(/"externalId":"(UC[\w-]{22})"/) || r.text.match(/"channelId":"(UC[\w-]{22})"/);
  if (!m) return { channelId: null, live: false, error: 'ID não encontrado' };
  let live = false;
  try {
    const lr = await get('https://www.youtube.com/channel/' + m[1] + '/live', 15000);
    live = /"isLiveNow":true|"isLive":true|hqdefault_live\.jpg/.test(lr.text);
  } catch (e) { /* ignora */ }
  return { channelId: m[1], live };
}

async function checkItem(it) {
  try {
    if (it.type === 'hls') {
      const r = await get(it.url, 12000);
      const ok = r.status < 400 && r.text.indexOf('#EXTM3U') >= 0;
      return { ok, status: r.status, ms: r.ms, note: ok ? 'sinal OK' : 'playlist inválida/fora do ar' };
    }
    if (it.type === 'youtube' && !it.handle && it.channelId) {
      const lr = await get('https://www.youtube.com/channel/' + it.channelId + '/live', 15000);
      const live = /"isLiveNow":true|"isLive":true|hqdefault_live\.jpg/.test(lr.text);
      return { ok: lr.status < 400, channelId: it.channelId, live, note: lr.status < 400 ? (live ? 'AO VIVO agora' : 'canal OK (sem live no momento)') : 'canal não encontrado' };
    }
    if (it.type === 'youtube') {
      const y = await resolveYoutube(it.handle);
      return { ok: !!y.channelId, channelId: y.channelId, live: y.live, note: y.channelId ? (y.live ? 'AO VIVO agora' : 'canal OK (sem live no momento)') : (y.error || 'falhou') };
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

module.exports = { checkAll, checkItem, resolveYoutube };

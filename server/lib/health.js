/*
 * Verificador de canais (ZERO tokens de IA — é só código).
 * - HLS: confere se a playlist .m3u8 responde e é válida.
 * - YouTube: descobre o ID do canal oficial a partir do @handle e vê se está ao vivo.
 * - Links: confere se o site oficial abre.
 * Roda sozinho no servidor a cada 6 horas e também via `npm run checar-canais`.
 */
const UA = 'Mozilla/5.0 (Linux; Android 12; Smart TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// A página do @handle no YouTube só traz o ID do canal para navegador de computador
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

async function get(url, ms, ua) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms || 12000);
  const started = Date.now();
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': ua || UA, 'Accept-Language': 'pt-BR,pt;q=0.9', Cookie: 'CONSENT=YES+1; SOCS=CAI' } });
    const text = await r.text();
    return { status: r.status, text, ms: Date.now() - started, finalUrl: r.url };
  } finally { clearTimeout(t); }
}

async function resolveYoutube(handle) {
  const h = String(handle || '').trim();
  if (!/^@[\w.\-]{2,60}$/.test(h)) return { channelId: null, live: false, error: 'handle inválido' };
  const r = await get('https://www.youtube.com/' + h, 15000, UA_PC);
  if (r.status >= 400) return { channelId: null, live: false, error: 'HTTP ' + r.status };
  // Só o canonical/externalId: "channelId" solto pode ser de outro canal recomendado na página
  const m = r.text.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) ||
            r.text.match(/"externalId":"(UC[\w-]{22})"/);
  if (!m) return { channelId: null, live: false, error: 'ID não encontrado' };
  const lv = await liveVideo(m[1]);
  return { channelId: m[1], live: lv.live, videoId: lv.videoId };
}

/*
 * Vídeo AO VIVO de agora do canal oficial (página /live do YouTube).
 * O app toca esse vídeo pelo player oficial (embed/VIDEO_ID): o endereço
 * embed/live_stream?channel=... falha em vários canais ("vídeo indisponível").
 * Mesma regra usada no abridor do pendrive (scripts/pendrive/abrir.ps1) e no APK.
 */
function parseLive(html) {
  const v = html.match(/"videoDetails":\{"videoId":"([\w-]{11})"[^}]*?"isLive":true/);
  const ok = /"playabilityStatus":\{"status":"OK"/.test(html);
  return v && ok ? { live: true, videoId: v[1] } : { live: false, videoId: null };
}

async function liveVideo(channelId) {
  if (!/^UC[\w-]{22}$/.test(String(channelId || ''))) return { live: false, videoId: null };
  try { return parseLive((await get('https://www.youtube.com/channel/' + channelId + '/live', 15000)).text); }
  catch (e) { return { live: true, videoId: null, error: true }; } // falhou: o app tenta o live_stream
}

async function checkItem(it) {
  try {
    if (it.type === 'hls') {
      const r = await get(it.url, 12000);
      const ok = r.status < 400 && r.text.indexOf('#EXTM3U') >= 0;
      return { ok, status: r.status, ms: r.ms, note: ok ? 'sinal OK' : 'playlist inválida/fora do ar' };
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

module.exports = { checkAll, checkItem, resolveYoutube, liveVideo, parseLive };

/*
 * Notícias do dia a dia (Brasil e mundo) a partir dos feeds RSS OFICIAIS dos veículos.
 * Mostramos só título, um resumo curto, a foto do próprio feed e o nome da fonte,
 * com link para ler a matéria completa no site do veículo (como um agregador de notícias).
 * Sem dependências: leitor de RSS/Atom simples por expressões regulares.
 */
const UA = 'AcciolyPlay/1.0 (leitor de noticias RSS)';
const PER_SECTION = 25;
const PER_SOURCE = 8;

// [fonte, url]. Se um feed sair do ar, os outros da seção continuam funcionando.
const SECTIONS = [
  { id: 'brasil', title: '🇧🇷 Brasil', feeds: [
    ['Agência Brasil', 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml'],
    ['g1', 'https://g1.globo.com/rss/g1/'],
    ['Folha', 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml'],
    ['UOL', 'https://rss.uol.com.br/feed/noticias.xml'],
    ['CNN Brasil', 'https://www.cnnbrasil.com.br/feed/'],
    ['Poder360', 'https://www.poder360.com.br/feed/']
  ] },
  { id: 'mundo', title: '🌎 Mundo', feeds: [
    ['BBC News Brasil', 'https://feeds.bbci.co.uk/portuguese/rss.xml'],
    ['g1', 'https://g1.globo.com/rss/g1/mundo/'],
    ['Agência Brasil', 'https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml'],
    ['Folha', 'https://feeds.folha.uol.com.br/mundo/rss091.xml'],
    ['DW Brasil', 'https://rss.dw.com/rdf/rss-br-all'],
    ['ONU News', 'https://news.un.org/feed/subscribe/pt/news/all/rss.xml']
  ] },
  { id: 'economia', title: '💰 Economia e seu bolso', feeds: [
    ['g1', 'https://g1.globo.com/rss/g1/economia/'],
    ['Agência Brasil', 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml'],
    ['Folha', 'https://feeds.folha.uol.com.br/mercado/rss091.xml']
  ] },
  { id: 'esportes', title: '⚽ Esportes', feeds: [
    ['ge', 'https://ge.globo.com/rss/ge/'],
    ['Agência Brasil', 'https://agenciabrasil.ebc.com.br/rss/esportes/feed.xml'],
    ['Folha', 'https://feeds.folha.uol.com.br/esporte/rss091.xml']
  ] },
  { id: 'tecnologia', title: '🚀 Tecnologia e ciência', feeds: [
    ['g1', 'https://g1.globo.com/rss/g1/tecnologia/'],
    ['Folha', 'https://feeds.folha.uol.com.br/tec/rss091.xml'],
    ['Olhar Digital', 'https://olhardigital.com.br/feed/'],
    ['Canaltech', 'https://canaltech.com.br/rss/']
  ] },
  { id: 'saude', title: '🩺 Saúde e bem-estar', feeds: [
    ['g1', 'https://g1.globo.com/rss/g1/ciencia-e-saude/'],
    ['Agência Brasil', 'https://agenciabrasil.ebc.com.br/rss/saude/feed.xml'],
    ['Folha', 'https://feeds.folha.uol.com.br/equilibrioesaude/rss091.xml']
  ] },
  { id: 'cultura', title: '🎬 Famosos, TV e cultura', feeds: [
    ['g1', 'https://g1.globo.com/rss/g1/pop-arte/'],
    ['Folha', 'https://feeds.folha.uol.com.br/ilustrada/rss091.xml']
  ] }
];

// ---------------- leitura do XML ----------------
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', ordm: 'º', ordf: 'ª', deg: '°', ccedil: 'ç', Ccedil: 'Ç', ntilde: 'ñ', Ntilde: 'Ñ', euro: '€', middot: '·', bull: '•' };
// Vogais acentuadas: &aacute; &Atilde; &ecirc; ...
const MARKS = { acute: '\u0301', grave: '\u0300', circ: '\u0302', tilde: '\u0303', uml: '\u0308' };
function entity(name) {
  if (NAMED[name]) return NAMED[name];
  const m = /^([aeiouAEIOUyY])(acute|grave|circ|tilde|uml)$/.exec(name);
  return m ? (m[1] + MARKS[m[2]]).normalize('NFC') : null;
}
function decode(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    const v = entity(e);
    return v == null ? all : v;
  });
}
function cdata(s) { return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'); }
function stripTags(html) {
  return String(html || '')
    .replace(/<(script|style|figure|figcaption)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Só remove o que parece tag de verdade ("Selic < 10% e IPCA > 4%" continua inteiro)
    .replace(/<\/?[a-z][a-z0-9:-]*(\s[^<>]*)?\/?>/gi, ' ');
}
function clean(s) {
  // Alguns feeds mandam o HTML "escapado" (&lt;p&gt;): decodifica, tira as tags e decodifica de novo
  let t = decode(stripTags(decode(cdata(s))));
  t = stripTags(t).replace(/\s+/g, ' ').trim();
  return t;
}
function tag(xml, names) {
  for (const n of names) {
    const re = new RegExp('<' + n.replace(':', '\\:') + '\\b[^>]*>([\\s\\S]*?)<\\/' + n.replace(':', '\\:') + '>', 'i');
    const m = re.exec(xml);
    if (m && m[1].trim()) return m[1];
  }
  return '';
}
function attr(xml, tagName, attrName, filter) {
  const re = new RegExp('<' + tagName.replace(':', '\\:') + '\\b([^>]*)>', 'gi');
  let m;
  while ((m = re.exec(xml))) {
    const a = m[1];
    if (filter && !filter.test(a)) continue;
    const v = new RegExp(attrName + '\\s*=\\s*["\']([^"\']+)["\']', 'i').exec(a);
    if (v) return decode(v[1]);
  }
  return '';
}
function short(t, max) {
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return cut.slice(0, sp > max * 0.6 ? sp : max).replace(/[,;:.\s-]+$/, '') + '…';
}
// Datas em português ("Qui, 20 Nov 2026 10:00:00 BRT", "20 Out 2026") viram inglês para o Date.parse
const MESES = { jan: 'Jan', fev: 'Feb', mar: 'Mar', abr: 'Apr', mai: 'May', jun: 'Jun', jul: 'Jul', ago: 'Aug', set: 'Sep', out: 'Oct', nov: 'Nov', dez: 'Dec' };
function parseDate(t) {
  t = String(t || '').trim();
  if (!t) return NaN;
  let d = Date.parse(t);
  if (!isNaN(d)) return d;
  const en = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^(seg|ter|qua|qui|sex|sab|dom)[a-z]*\.?,?\s*/i, '')
    .replace(/\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?/gi, (m, k) => MESES[k.toLowerCase()])
    .replace(/\bBRST\b/, '-0200').replace(/\b(BRT|BRA)\b/, '-0300');
  d = Date.parse(en);
  return d;
}
function goodUrl(u) { return /^https?:\/\/[^\s"'<>]+$/i.test(u || '') ? u.replace(/^http:\/\//i, 'https://') : ''; }

function parseFeed(xml, source) {
  const out = [];
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks.slice(0, 40)) {
    const title = short(clean(tag(b, ['title'])), 180);
    let link = cdata(tag(b, ['link'])).trim();
    if (!/^https?:/i.test(link)) link = attr(b, 'link', 'href', /rel=["']?alternate|^(?![\s\S]*rel=)/i) || attr(b, 'link', 'href');
    if (!/^https?:/i.test(link)) link = cdata(tag(b, ['guid'])).trim();
    link = decode(link);
    if (!title || !/^https?:\/\//i.test(link)) continue;
    const rawDesc = tag(b, ['description', 'summary', 'content:encoded', 'content']);
    let summary = short(clean(rawDesc), 300);
    if (summary && summary.toLowerCase().indexOf(title.toLowerCase().slice(0, 40)) === 0 && summary.length < title.length + 15) summary = '';
    const when = parseDate(clean(tag(b, ['pubDate', 'dc:date', 'published', 'updated'])));
    let img = attr(b, 'media:content', 'url', /medium=["']image|type=["']image|url=["'][^"']+\.(jpe?g|png|webp)/i) ||
      attr(b, 'media:thumbnail', 'url') || attr(b, 'enclosure', 'url', /type=["']image/i);
    if (!img) { const m = /<img\b[^>]*src=["']([^"']+)["']/i.exec(decode(cdata(rawDesc + tag(b, ['content:encoded'])))); if (m) img = m[1]; }
    out.push({ t: title, s: summary, u: link, src: source, d: isNaN(when) ? 0 : when, img: goodUrl(decode(img)) });
  }
  return out;
}

// ---------------- download ----------------
async function fetchText(url, ms) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms || 15000);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    const head = buf.subarray(0, 300).toString('latin1');
    const cs = ((/encoding=["']([\w-]+)["']/i.exec(head) || [])[1] || (/charset=([\w-]+)/i.exec(r.headers.get('content-type') || '') || [])[1] || 'utf-8').toLowerCase();
    // windows-1252 é o "latin1" real dos sites (aspas curvas, travessão, €)
    if (/8859-1|latin|1252/.test(cs)) { try { return new TextDecoder('windows-1252').decode(buf); } catch (e) { return buf.toString('latin1'); } }
    return buf.toString('utf8');
  } finally { clearTimeout(timer); }
}

function key(t) { return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 70); }

// Busca todas as seções. Devolve { updatedAt, sections:[{id,title,items}], top:[...], sources:{fonte:n}, errors:{url:msg} }
async function collect(opts) {
  opts = opts || {};
  const fetcher = opts.fetchText || fetchText;
  const now = Date.now();
  const errors = {};
  const sources = {};
  const jobs = [];
  for (const sec of SECTIONS) for (const [src, url] of sec.feeds) {
    jobs.push(fetcher(url).then((xml) => ({ sec: sec.id, src, items: parseFeed(xml, src) }))
      .catch((e) => { errors[src + ' ' + url] = String(e && e.message || e).slice(0, 120); return { sec: sec.id, src, items: [] }; }));
  }
  const results = await Promise.all(jobs);
  const seen = new Set();
  const sections = [];
  for (const sec of SECTIONS) {
    let all = [];
    for (const r of results) if (r.sec === sec.id) {
      if (!r.items.length) errors[r.src + ' (' + sec.id + ')'] = errors[r.src + ' (' + sec.id + ')'] || 'sem itens';
      // Sem data confiável: descarta (não dá para saber se é de hoje); data no futuro vira "agora"
      r.items.forEach((it) => { if (!it.d) return; if (it.d > now) it.d = Math.min(it.d, now); all.push(it); });
    }
    all.sort((a, b) => b.d - a.d);
    const perSrc = {};
    const items = [];
    for (const it of all) {
      const k = key(it.t);
      if (seen.has(k) || seen.has(it.u)) continue;
      if ((perSrc[it.src] = (perSrc[it.src] || 0) + 1) > PER_SOURCE) continue;
      if (now - it.d > 3 * 86400e3) continue; // só notícias dos últimos 3 dias
      seen.add(k); seen.add(it.u);
      items.push(it);
      sources[it.src] = (sources[it.src] || 0) + 1;
      if (items.length >= PER_SECTION) break;
    }
    if (items.length) sections.push({ id: sec.id, title: sec.title, items });
  }
  // Destaques: as mais recentes de Brasil e Mundo, preferindo as que têm foto
  const pool = sections.filter((s) => s.id === 'brasil' || s.id === 'mundo').flatMap((s) => s.items.slice(0, 10));
  const top = pool.filter((i) => i.img).concat(pool.filter((i) => !i.img)).slice(0, 12).sort((a, b) => b.d - a.d);
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  return { updatedAt: now, total, top, sections, sources, errors };
}

// Notícias de exemplo para os testes automáticos (sem internet)
function mock() {
  const now = Date.now();
  const sections = SECTIONS.map((s, k) => ({ id: s.id, title: s.title, items: Array.from({ length: 6 }, (_, i) => ({
    t: 'Notícia de teste ' + (i + 1) + ' de ' + s.id, s: 'Resumo curto da notícia de teste número ' + (i + 1) + '.', u: 'https://example.com/' + s.id + '/' + i,
    src: s.feeds[i % s.feeds.length][0], d: now - (k * 6 + i) * 600e3, img: '' })) }));
  return { updatedAt: now, total: sections.length * 6, top: sections[0].items.slice(0, 4).concat(sections[1].items.slice(0, 4)), sections, sources: {}, errors: {}, mock: true };
}

let memo = null;
let memoAt = 0;
let pending = null;
// Cache de 15 minutos no servidor (todo mundo recebe a mesma lista; os sites não são sobrecarregados).
// Quando vence, responde na hora com a lista guardada e atualiza por trás (ninguém espera os sites).
function get(ttlMs) {
  const fresh = memo && Date.now() - memoAt < (ttlMs || 15 * 60e3);
  if (!fresh && !pending) {
    pending = collect().then((r) => { if (r.total >= 5 || !memo) memo = r; memoAt = Date.now(); return memo; })
      .catch((e) => { memoAt = Date.now(); if (!memo) throw e; return memo; })
      .finally(() => { pending = null; });
  }
  return memo ? Promise.resolve(memo) : pending;
}

module.exports = { SECTIONS, parseFeed, parseDate, collect, get, mock, clean };

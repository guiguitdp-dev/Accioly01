#!/usr/bin/env node
/*
 * Junta as notícias do dia (Brasil e mundo) dos feeds RSS oficiais.
 *   node scripts/news.js --out noticias.json            -> arquivo usado pelo app (GitHub Actions, de hora em hora)
 *   node scripts/news.js --snapshot app/js/noticias-snapshot.js  -> cópia embutida (pendrive/APK sem internet na 1ª abertura)
 * Se vierem poucas notícias (sites fora do ar), sai com erro e NÃO substitui a lista anterior.
 */
const fs = require('fs');
const path = require('path');
const news = require('../server/lib/news');

const RAW = 'https://raw.githubusercontent.com/guiguitdp-dev/Accioly01/noticias-dados/noticias.json';
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const out = opt('--out');
const snap = opt('--snapshot');
const min = Number(opt('--min') || 20);

function write(file, text) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, text);
  console.log('✔ ' + file);
}

async function fromGithub() {
  const r = await fetch(RAW, { headers: { 'User-Agent': 'AcciolyPlay' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

(async () => {
  let data = await news.collect();
  console.log('Notícias: ' + data.total + ' em ' + data.sections.length + ' seções');
  for (const [src, n] of Object.entries(data.sources).sort((a, b) => b[1] - a[1])) console.log('  ' + src + ': ' + n);
  const errs = Object.entries(data.errors).filter(([k, v]) => v !== 'sem itens');
  if (errs.length) { console.log('Feeds com problema (' + errs.length + '):'); errs.forEach(([k, v]) => console.log('  - ' + k + ' → ' + v)); }
  if (data.total < min && snap && !out) {
    // Montando o pendrive sem acesso aos sites: usa a última lista publicada pelo GitHub
    try { data = await fromGithub(); console.log('Usando a lista publicada no GitHub (' + data.total + ' notícias)'); } catch (e) { console.log('Sem acesso às notícias agora (' + e.message + ')'); }
  }
  if (!data.total || data.total < Math.min(min, 5)) { console.error('✖ Poucas notícias (' + (data.total || 0) + '). Nada foi alterado.'); process.exit(out ? 1 : 0); }
  if (out && data.total < min) { console.error('✖ Só ' + data.total + ' notícias (mínimo ' + min + '). Mantendo a lista anterior.'); process.exit(1); }
  const pub = { updatedAt: data.updatedAt, total: data.total, top: data.top, sections: data.sections };
  if (out) write(out, JSON.stringify(pub));
  if (snap) write(snap, '/* Notícias embutidas (gerado por scripts/news.js em ' + new Date(data.updatedAt).toISOString() + ') */\nwindow.NEWS_SNAPSHOT = ' + JSON.stringify(pub) + ';\n');
})().catch((e) => { console.error(e); process.exit(1); });

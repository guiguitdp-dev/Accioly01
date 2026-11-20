#!/usr/bin/env node
/*
 * Capas reais dos canais (vídeo mais recente de cada canal oficial do YouTube).
 *   node scripts/capas.js --out capas.json   (GitHub Actions, de hora em hora, junto com as notícias)
 */
const fs = require('fs');
const path = require('path');
const capas = require('../server/lib/capas');
const catalog = require('../app/js/catalog.js');

const args = process.argv.slice(2);
const i = args.indexOf('--out');
const out = i >= 0 ? args[i + 1] : 'capas.json';

capas.collect(catalog.items).then((r) => {
  console.log('Capas: ' + r.total + ' canais (falhas: ' + r.fails + ')');
  if (!r.total) { console.error('✖ Nenhuma capa. Nada foi alterado.'); process.exit(1); }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ updatedAt: r.updatedAt, items: r.items }));
  console.log('✔ ' + out);
}).catch((e) => { console.error(e); process.exit(1); });

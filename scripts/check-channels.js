#!/usr/bin/env node
/*
 * Verifica todos os canais do catálogo (ZERO tokens de IA).
 *
 *   npm run checar-canais                 -> usa app/js/catalog.js
 *   npm run checar-canais -- --json saida.json
 *   npm run checar-canais -- --strict     -> sai com erro se >30% falharem (para CI)
 *
 * Também escreve um resumo em Markdown no GitHub Actions (GITHUB_STEP_SUMMARY).
 */
const fs = require('fs');
const path = require('path');
const { checkAll } = require('../server/lib/health');
const catalog = require('../app/js/catalog.js');

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const strict = args.includes('--strict');

(async () => {
  const items = catalog.items.filter((i) => i.enabled !== false);
  console.log('Verificando ' + items.length + ' canais…');
  const results = await checkAll(items, 6);
  let bad = 0;
  const lines = ['| Canal | Tipo | Status | Detalhe |', '|---|---|---|---|'];
  for (const it of items) {
    const r = results[it.id];
    if (!r.ok) bad++;
    const icon = r.ok ? '✅' : '❌';
    console.log(icon + ' ' + it.name.padEnd(24) + ' ' + it.type.padEnd(8) + ' ' + (r.note || '') + (r.channelId ? ' [' + r.channelId + ']' : ''));
    lines.push('| ' + it.name + ' | ' + it.type + ' | ' + icon + ' | ' + (r.note || '') + (r.channelId ? ' `' + r.channelId + '`' : '') + ' |');
  }
  const summary = '\n' + (items.length - bad) + '/' + items.length + ' canais OK.';
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Saúde dos canais\n\n' + lines.join('\n') + '\n\n' + summary + '\n');
  if (jsonOut) fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
  if (strict && bad / items.length > 0.3) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });

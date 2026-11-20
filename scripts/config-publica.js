#!/usr/bin/env node
/*
 * Deixa um config.js no modo VITRINE (versões públicas: site do iPhone e APK).
 *   node scripts/config-publica.js caminho/do/config.js
 * Usa ACCIOLY_WHATSAPP e ACCIOLY_SITE (variáveis do GitHub Actions) no convite para assinar.
 */
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('Informe o caminho do config.js'); process.exit(1); }
const w = String(process.env.ACCIOLY_WHATSAPP || '').replace(/\D/g, '');
const site = /^https?:\/\/[^\s'"\\]+$/.test(process.env.ACCIOLY_SITE || '') ? process.env.ACCIOLY_SITE : '';
let s = fs.readFileSync(file, 'utf8');
s = s.replace("localMode: 'auto'", 'localMode: true').replace('demo: false', 'demo: true')
  .replace("buyWhatsapp: ''", "buyWhatsapp: '" + w + "'").replace("buySite: ''", "buySite: '" + site + "'");
if (!/demo: true/.test(s) || !/localMode: true/.test(s)) { console.error('config.js em formato inesperado'); process.exit(1); }
fs.writeFileSync(file, s);
console.log('Vitrine: ' + file + (w ? ' (WhatsApp ' + w + ')' : ' (sem WhatsApp)'));

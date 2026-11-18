#!/usr/bin/env node
/*
 * Monta a pasta para copiar no PENDRIVE.
 *
 *   npm run pendrive
 *       -> dist/pendrive/AcciolyPlay  (Modo Dono: tudo liberado, uso pessoal)
 *
 *   npm run pendrive -- --servidor https://seu-dominio.com.br
 *       -> versão para CLIENTES: abre do pendrive mas exige conta no seu servidor
 *
 * Se existir um APK em dist/apk/*.apk (gerado pelo GitHub Actions), ele também
 * é copiado para o pendrive, para instalar na Android TV / TV Box.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const server = args.includes('--servidor') ? String(args[args.indexOf('--servidor') + 1] || '').replace(/\/$/, '') : '';
const out = path.join(ROOT, 'dist', 'pendrive', 'AcciolyPlay');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

fs.rmSync(out, { recursive: true, force: true });
copyDir(path.join(ROOT, 'app'), path.join(out, 'app'));

const cfg = "window.APP_CONFIG = {\n  name: 'Accioly Play',\n  serverUrl: " + JSON.stringify(server) + ",\n  localMode: " + (server ? 'false' : 'true') + "\n};\n";
fs.writeFileSync(path.join(out, 'app', 'js', 'config.js'), cfg);

// Atalho na raiz do pendrive
fs.writeFileSync(path.join(out, 'ABRIR-ACCIOLY-PLAY.html'),
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=app/index.html"><title>Accioly Play</title><a href="app/index.html">Abrir Accioly Play</a>\n');

const apkDir = path.join(ROOT, 'dist', 'apk');
let apk = '';
if (fs.existsSync(apkDir)) {
  for (const f of fs.readdirSync(apkDir)) if (f.endsWith('.apk')) { fs.copyFileSync(path.join(apkDir, f), path.join(out, 'AcciolyPlay-AndroidTV.apk')); apk = f; }
}

fs.writeFileSync(path.join(out, 'LEIA-ME.txt'), [
  'ACCIOLY PLAY — PENDRIVE',
  '=======================',
  '',
  server ? 'Versão CLIENTE: precisa de internet e de conta em ' + server : 'Versão MODO DONO: tudo liberado, sem login (uso pessoal).',
  '',
  'NO COMPUTADOR (Windows, Mac ou Linux):',
  '  Dê dois cliques em ABRIR-ACCIOLY-PLAY.html (abre no navegador).',
  '  Aperte F11 para tela cheia. Use as setas + Enter, ou um controle de videogame.',
  '',
  'NA ANDROID TV / GOOGLE TV / TV BOX / FIRE TV:',
  apk ? '  1. Conecte o pendrive na TV.' : '  (Gere o APK pelo GitHub Actions — veja docs/INSTALAR-NA-TV.md — e rode este comando de novo.)',
  apk ? '  2. Abra um gerenciador de arquivos (ex.: "File Commander" ou "X-plore", grátis na Play Store).' : '',
  apk ? '  3. Toque em AcciolyPlay-AndroidTV.apk e confirme a instalação ("permitir fontes desconhecidas").' : '',
  apk ? '  4. O app aparece na tela inicial da TV.' : '',
  '',
  'NA SMART TV SAMSUNG / LG (sem Android):',
  '  Essas TVs não instalam apps pelo pendrive. Abra o navegador da TV e acesse',
  '  o endereço do seu servidor + /tv/  (ex.: http://192.168.0.10:3000/tv/ na mesma rede Wi-Fi).',
  '  Salve nos favoritos do navegador da TV.',
  ''
].filter((l) => l !== null).join('\r\n'));

console.log('Pronto! Copie a pasta abaixo para o pendrive:\n  ' + out);
console.log(server ? 'Modo: CLIENTE (servidor ' + server + ')' : 'Modo: DONO (tudo liberado)');
console.log(apk ? 'APK incluído: ' + apk : 'Sem APK (opcional). Veja docs/INSTALAR-NA-TV.md para gerar.');

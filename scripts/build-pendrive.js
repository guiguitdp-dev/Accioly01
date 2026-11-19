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
fs.rmSync(path.join(out, 'app', 'sw.js'), { force: true }); // cache de PWA não serve no pendrive

const cfg = "window.APP_CONFIG = {\n  name: 'Accioly Play',\n  serverUrl: " + JSON.stringify(server) + ",\n  localMode: " + (server ? 'false' : 'true') + "\n};\n";
fs.writeFileSync(path.join(out, 'app', 'js', 'config.js'), cfg);

// Atalhos na raiz do pendrive
// Mac/Linux (ou qualquer navegador): abre o app no navegador padrão.
fs.writeFileSync(path.join(out, 'ABRIR NO MAC OU LINUX.html'),
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=app/index.html"><title>Accioly Play</title><a href="app/index.html">Abrir Accioly Play</a>\n');
// Windows: dois cliques e o app abre em TELA CHEIA, como aplicativo (Edge ou Chrome),
// direto na tela de canais. O abrir-pendrive.ps1 serve a pasta app em http://127.0.0.1
// (só neste PC): em file:// o player oficial do YouTube não toca dentro do app.
// Usa só %~dp0 (caminho do próprio pendrive): funciona em qualquer letra de unidade.
// O .ps1 vai com BOM para o PowerShell 5.1 ler os acentos certo.
fs.writeFileSync(path.join(out, 'app', 'abrir-pendrive.ps1'),
  '﻿' + fs.readFileSync(path.join(__dirname, 'pendrive', 'abrir.ps1'), 'utf8').replace(/^﻿/, '').replace(/\r?\n/g, '\r\n'));
fs.writeFileSync(path.join(out, 'ABRIR ACCIOLY PLAY.bat'), [
  '@echo off',
  'rem Accioly Play - abre o app do pendrive em tela cheia. Para sair: Alt+F4.',
  'where powershell >nul 2>nul',
  'if errorlevel 1 (',
  '  start "" "%~dp0app\\index.html"',
  '  exit /b 0',
  ')',
  'start "" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0app\\abrir-pendrive.ps1" -Raiz "%~dp0."',
  ''
].join('\r\n'));

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
  'NO COMPUTADOR / NOTEBOOK COM WINDOWS:',
  '  Dê dois cliques em "ABRIR ACCIOLY PLAY" (abre em tela cheia, já nos canais).',
  '  Use as setas + Enter, ou um controle de videogame. Para sair: Alt+F4.',
  '  (O Windows não deixa nenhum pendrive abrir programas sozinho ao conectar,',
  '   por segurança. Por isso é preciso esse clique duplo.)',
  '',
  'NO MAC OU LINUX:',
  '  Dê dois cliques em "ABRIR NO MAC OU LINUX.html". Aperte F11 para tela cheia.',
  '',
  'NA ANDROID TV / GOOGLE TV / TV BOX / FIRE TV:',
  apk ? '  1. Conecte o pendrive na TV.' : '  (Gere o APK pelo GitHub Actions — veja docs/INSTALAR-NA-TV.md — e rode este comando de novo.)',
  apk ? '  2. Abra um gerenciador de arquivos (ex.: "File Commander" ou "X-plore", grátis na Play Store).' : '',
  apk ? '  3. Toque em AcciolyPlay-AndroidTV.apk e confirme a instalação ("permitir fontes desconhecidas").' : '',
  apk ? '  4. O app aparece na tela inicial da TV e abre direto nos canais (sem precisar do PC).' : '',
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

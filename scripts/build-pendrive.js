#!/usr/bin/env node
/*
 * Monta o conteúdo do PENDRIVE do Accioly Play.
 *
 *   npm run pendrive
 *       -> VITRINE (padrão): para mostrar a outras pessoas. Acesso total por 30 min,
 *          depois canais/notícias/jogos grátis continuam e aparece o convite para assinar.
 *          Opções: --whatsapp 5511999999999  --site https://seusite.com.br  --minutos 30
 *          (ou as variáveis ACCIOLY_WHATSAPP e ACCIOLY_SITE)
 *
 *          --com-video: avisa no COMO USAR.txt que o vídeo será copiado depois
 *
 *   npm run pendrive -- --dono
 *       -> MODO DONO: tudo liberado, sem login (uso pessoal).
 *
 *   npm run pendrive -- --servidor https://seu-dominio.com.br
 *       -> CLIENTES: abre do pendrive, mas exige conta no seu servidor.
 *
 * Saída: dist/pendrive/AcciolyPlay  ->  copie TUDO o que está dentro para a RAIZ do pendrive.
 * Inclui, se existirem: APK em dist/apk/ (o AcciolyPlay.apk publicado é a vitrine) e o vídeo
 * dist/video/VIDEO-DEMONSTRACAO.mp4 (para Smart TVs, que só tocam vídeo pelo USB).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? String(args[i + 1] || '') : ''; };
const server = opt('--servidor').replace(/\/$/, '');
const dono = args.includes('--dono');
const mode = server ? 'cliente' : (dono ? 'dono' : 'vitrine');
const whatsapp = (opt('--whatsapp') || process.env.ACCIOLY_WHATSAPP || '').replace(/\D/g, '');
const site = (opt('--site') || process.env.ACCIOLY_SITE || '').trim();
const minutes = Math.max(5, Math.min(240, Number(opt('--minutos')) || 30));
const out = path.resolve(opt('--saida') || path.join(ROOT, 'dist', 'pendrive', 'AcciolyPlay'));
if (site && !/^https?:\/\/[^\s'"\\]+$/.test(site)) { console.error('--site precisa começar com https://'); process.exit(1); }

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === 'sw.js') continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}
const crlf = (lines) => lines.join('\r\n') + '\r\n';

fs.rmSync(out, { recursive: true, force: true });
copyDir(path.join(ROOT, 'app'), path.join(out, 'app'));

// ---------- configuração do app ----------
// O código do dono (só o resumo) vem do config.js do projeto: na vitrine o dono libera tudo com ele
const donoHash = (/donoHash: '([0-9a-f]*)'/.exec(fs.readFileSync(path.join(ROOT, 'app', 'js', 'config.js'), 'utf8')) || [])[1] || '';
const cfg = {
  name: 'Accioly Play', serverUrl: server, localMode: !server,
  demo: mode === 'vitrine', demoMinutes: minutes, buyWhatsapp: whatsapp, buySite: site, donoHash
};
fs.writeFileSync(path.join(out, 'app', 'js', 'config.js'), '/* Gerado por scripts/build-pendrive.js (modo ' + mode + ') */\nwindow.APP_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n');

// ---------- notícias do dia embutidas (abre com notícias mesmo sem internet) ----------
if (!args.includes('--sem-noticias')) {
  spawnSync(process.execPath, [path.join(__dirname, 'news.js'), '--snapshot', path.join(out, 'app', 'js', 'noticias-snapshot.js'), '--min', '20'], { stdio: 'inherit' });
}

// ---------- nome e ícone do pendrive no Windows ----------
fs.writeFileSync(path.join(out, 'autorun.inf'), crlf(['[autorun]', 'label=Accioly Play', 'icon=app\\icon.ico']));

// ---------- arquivo para abrir (computador) ----------
fs.writeFileSync(path.join(out, 'ABRIR ACCIOLY PLAY.html'), `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="1; url=app/index.html"><title>Accioly Play</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#03040b;color:#e6f1ff;font:20px system-ui,sans-serif;text-align:center}
a{display:inline-block;margin-top:1.2rem;padding:1rem 2rem;border-radius:999px;background:linear-gradient(90deg,#00e5ff,#7c5cff);color:#03040b;font-weight:800;text-decoration:none}
b{color:#00e5ff}</style></head>
<body><div><div style="font-size:2.6rem;font-weight:900">Accioly <b>Play</b></div><p>Abrindo…</p><a href="app/index.html">▶ ABRIR ACCIOLY PLAY</a>
<p style="opacity:.6;font-size:.8rem">Dica: aperte F11 para tela cheia. Use as setas + Enter, um controle de videogame ou o mouse.</p></div>
<script>location.replace('app/index.html');</script></body></html>
`);

// Windows: abre em tela cheia, como um aplicativo (Edge ou Chrome); se não achar, usa o navegador padrão
fs.writeFileSync(path.join(out, 'ABRIR EM TELA CHEIA (Windows).bat'), crlf([
  '@echo off',
  'rem Accioly Play - abre o app do pendrive em tela cheia (sem barra de endereco).',
  'cd /d "%~dp0"',
  'set "APP=%~dp0app\\index.html"',
  'set "PERFIL=%TEMP%\\AcciolyPlay-pendrive"',
  'set "EDGE=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"',
  'if not exist "%EDGE%" set "EDGE=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"',
  'if exist "%EDGE%" ( start "" "%EDGE%" --app="file:///%APP%" --start-fullscreen --user-data-dir="%PERFIL%" --no-first-run & exit /b )',
  'set "CHROME=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"',
  'if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"',
  'if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe"',
  'if exist "%CHROME%" ( start "" "%CHROME%" --app="file:///%APP%" --start-fullscreen --user-data-dir="%PERFIL%" --no-first-run & exit /b )',
  'start "" "%APP%"'
]));

// ---------- APK (Android TV, TV Box, celular Android) ----------
const apkDir = path.join(ROOT, 'dist', 'apk');
let apk = '';
if (fs.existsSync(apkDir)) {
  // O APK publicado é a vitrine. Um APK "dono" (gradle -Pdono=true, tudo liberado) só vai no pendrive do dono.
  const apks = fs.readdirSync(apkDir).filter((f) => f.endsWith('.apk'));
  const own = apks.filter((f) => /dono/i.test(f));
  const pub = apks.filter((f) => !/dono/i.test(f));
  apk = mode === 'dono' ? (own[0] || pub[0]) : pub[0];
  if (apk) fs.copyFileSync(path.join(apkDir, apk), path.join(out, 'AcciolyPlay.apk'));
}

// ---------- vídeo de demonstração (Smart TV Samsung/LG tocam pelo USB) ----------
const video = path.join(ROOT, 'dist', 'video', 'VIDEO-DEMONSTRACAO.mp4');
if (fs.existsSync(video)) fs.copyFileSync(video, path.join(out, 'VIDEO-DEMONSTRACAO.mp4'));
// --com-video: o vídeo será gravado e colocado na pasta depois (GitHub Actions)
const hasVideo = fs.existsSync(video) || args.includes('--com-video');

// ---------- instruções ----------
const buy = [whatsapp ? '  WhatsApp: https://wa.me/' + whatsapp : '', site ? '  Site: ' + site : ''].filter(Boolean);
fs.writeFileSync(path.join(out, 'COMO USAR.txt'), crlf([
  'ACCIOLY PLAY — PENDRIVE',
  '=======================',
  'TV ao vivo de fontes oficiais, notícias do dia (Brasil e mundo), 17 jogos no controle,',
  'música e vídeos. ' + (mode === 'vitrine' ? 'Demonstração com tudo liberado por ' + minutes + ' minutos.' : mode === 'dono' ? 'Modo dono: tudo liberado.' : 'Versão cliente: precisa de internet e de conta em ' + server),
  '',
  'Importante: por segurança, nenhum aparelho abre programas sozinho ao conectar um pendrive',
  '(o Windows desligou isso em 2011 por causa de vírus). Siga o passo do seu aparelho:',
  '',
  'COMPUTADOR (Windows, Mac, Linux, Chromebook)',
  '  Dê dois cliques em "ABRIR ACCIOLY PLAY.html".',
  '  No Windows, "ABRIR EM TELA CHEIA (Windows).bat" abre como aplicativo, em tela cheia.',
  '  Use as setas + Enter, um controle de videogame ou o mouse. F11 = tela cheia.',
  '',
  'ANDROID TV / GOOGLE TV / TV BOX / FIRE TV / CELULAR ANDROID',
  apk ? '  1. Conecte o pendrive (no celular, com adaptador OTG).' : '  Instale o app pelo link: https://github.com/guiguitdp-dev/Accioly01/releases/download/app-latest/AcciolyPlay.apk',
  apk ? '  2. Abra um gerenciador de arquivos (ex.: "File Commander" ou "X-plore", grátis na Play Store).' : null,
  apk ? '  3. Toque em AcciolyPlay.apk e permita "instalar apps desconhecidos".' : null,
  apk ? '  4. O Accioly Play aparece na tela inicial. Funciona com o controle remoto.' : null,
  '',
  'SMART TV SAMSUNG / LG / OUTRAS (sem Android)',
  '  Essas TVs não instalam aplicativos pelo pendrive.',
  hasVideo ? '  Para MOSTRAR: abra o pendrive na TV (botão Fonte/Source ou Mídia) e toque VIDEO-DEMONSTRACAO.mp4.' : null,
  '  Para USAR: abra o navegador da TV e acesse o endereço do Accioly Play (pergunte a quem te passou).',
  '',
  'IPHONE / IPAD',
  '  O iPhone não abre apps pelo pendrive. Abra no Safari o endereço do Accioly Play',
  '  e toque em Compartilhar > Adicionar à Tela de Início.',
  '',
  buy.length ? 'QUERO ASSINAR' : null,
  ...buy
].filter((l) => l !== null)));

console.log('\nPronto! Copie TUDO o que está dentro desta pasta para a RAIZ do pendrive:\n  ' + out);
console.log('Modo: ' + (mode === 'vitrine' ? 'VITRINE (demonstração de ' + minutes + ' min' + (whatsapp ? ', WhatsApp ' + whatsapp : '') + (site ? ', site ' + site : '') + ')' : mode === 'dono' ? 'DONO (tudo liberado)' : 'CLIENTE (servidor ' + server + ')'));
if (mode === 'vitrine' && !whatsapp && !site) console.log('Dica: informe --whatsapp 55DDDNUMERO para aparecer o QR Code "Assinar pelo WhatsApp".');
console.log(apk ? 'APK incluído: ' + apk : 'Sem APK (opcional: coloque o AcciolyPlay.apk em dist/apk/).');
console.log(fs.existsSync(path.join(out, 'VIDEO-DEMONSTRACAO.mp4')) ? 'Vídeo de demonstração incluído.' : 'Sem vídeo de demonstração (gere com: node scripts/demo-video.js).');

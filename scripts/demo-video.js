#!/usr/bin/env node
/*
 * Grava o VÍDEO DE DEMONSTRAÇÃO do Accioly Play (para Smart TVs Samsung/LG, que só tocam
 * vídeo pelo USB, e para divulgar no WhatsApp/Instagram). Usa um navegador de verdade
 * passeando pelo app como se fosse o controle remoto.
 *
 *   node scripts/demo-video.js [pasta-do-pendrive] [saida.mp4]
 *     padrão: dist/pendrive/AcciolyPlay  ->  dist/video/VIDEO-DEMONSTRACAO.mp4
 *   Opções: --whatsapp 5511999999999 (QR Code no final)  --noticias-teste (sem internet)
 * Precisa: Playwright (npm i --no-save playwright) e ffmpeg.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? String(args[i + 1] || '') : ''; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--') && args[i - 1] !== '--noticias-teste'));
const dir = path.resolve(pos[0] || path.join(ROOT, 'dist', 'pendrive', 'AcciolyPlay'));
const outMp4 = path.resolve(pos[1] || path.join(ROOT, 'dist', 'video', 'VIDEO-DEMONSTRACAO.mp4'));
const whatsapp = (opt('--whatsapp') || process.env.ACCIOLY_WHATSAPP || '').replace(/\D/g, '');
const indexHtml = path.join(dir, 'app', 'index.html');
if (!fs.existsSync(indexHtml)) { console.error('Não achei ' + indexHtml + '. Rode antes: npm run pendrive'); process.exit(1); }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'accioly-video-'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } });
  if (args.includes('--noticias-teste')) {
    const mock = require('../server/lib/news').mock();
    await ctx.addInitScript((m) => { window.NEWS_SNAPSHOT = m; }, mock);
  }
  const page = await ctx.newPage();
  const key = async (k, n, gap) => { for (let i = 0; i < (n || 1); i++) { await page.keyboard.press(k); await wait(gap || 450); } };
  const step = async (name, fn) => { try { await fn(); } catch (e) { console.log('  (passo "' + name + '" pulado: ' + e.message.split('\n')[0] + ')'); } };

  // Legenda grande na parte de baixo da tela
  const cap = (text) => page.evaluate((t) => {
    let c = document.getElementById('__cap');
    if (!c) {
      c = document.createElement('div'); c.id = '__cap';
      c.style.cssText = 'position:fixed;left:50%;bottom:4vh;transform:translateX(-50%);z-index:99999;max-width:86vw;padding:.9rem 1.8rem;border-radius:999px;' +
        'background:rgba(3,4,11,.88);border:2px solid #00e5ff;box-shadow:0 0 30px rgba(0,229,255,.45);color:#fff;font:700 28px system-ui,sans-serif;text-align:center;transition:opacity .3s';
      document.body.appendChild(c);
    }
    c.textContent = t; c.style.opacity = t ? '1' : '0';
  }, text);
  // Tela cheia de abertura/encerramento
  const card = (html) => page.evaluate((h) => {
    let c = document.getElementById('__card');
    if (!h) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement('div'); c.id = '__card'; document.body.appendChild(c); }
    c.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.4rem;text-align:center;' +
      'background:radial-gradient(circle at 30% 20%,#14204a,#03040b 70%);color:#e6f1ff;font:600 30px system-ui,sans-serif';
    c.innerHTML = h;
  }, html);

  console.log('Gravando o vídeo de demonstração...');
  await page.goto('file://' + indexHtml);
  await page.waitForSelector('.topbar', { timeout: 20000 });
  await card('<div style="font:900 96px system-ui;letter-spacing:.02em">Accioly <span style="color:#00e5ff">Play</span></div>' +
    '<div>TV ao vivo · Notícias do dia · Jogos no controle · Música</div><div style="opacity:.7;font-size:24px">Na TV, no computador e no celular</div>');
  await wait(4000);
  await card('');

  await step('início', async () => {
    await cap('📺 Canais ao vivo de fontes oficiais e gratuitas');
    await wait(1500);
    await key('ArrowDown', 2, 700); await key('ArrowRight', 4, 500);
    await cap('📰 Últimas notícias do Brasil e do mundo, logo na tela inicial');
    await key('ArrowDown', 1, 900); await key('ArrowRight', 3, 600);
  });

  await step('notícias', async () => {
    await page.click('.tab[data-tab=noticias]');
    await cap('📰 Notícias do dia — atualizadas de hora em hora');
    await page.waitForSelector('#nrows .ntile', { timeout: 15000 });
    await wait(1500);
    await page.locator('[data-row=ntop] .ntile').first().focus();
    await key('ArrowRight', 3, 600);
    await key('Enter', 1, 600);
    await cap('🔊 Ouça a notícia ou leia no celular pelo QR Code');
    await wait(1800);
    await page.click('.modal [data-act=nqr]').catch(() => {});
    await wait(2500);
    await key('Escape', 1, 600);
    await key('ArrowDown', 2, 700); await key('ArrowRight', 2, 500);
  });

  await step('tv', async () => {
    await page.click('.tab[data-tab=tv]');
    await cap('📡 TV aberta, notícias 24h, esportes, infantil, fé e música');
    await wait(1200);
    await page.locator('.tile').first().focus();
    await key('ArrowRight', 3, 500); await key('ArrowDown', 2, 700); await key('ArrowRight', 2, 500);
  });

  const play = async (id, text, ms, keys) => {
    await cap(text);
    await page.evaluate((g) => GameHub.start(g, function () {}), id);
    await page.waitForSelector('.game-screen canvas', { timeout: 8000 });
    const end = Date.now() + ms;
    let i = 0;
    while (Date.now() < end) {
      const k = keys[i++ % keys.length];
      await page.keyboard.down(k); await wait(180 + (i % 3) * 120); await page.keyboard.up(k); await wait(60);
    }
    await page.evaluate(() => GameHub.stop());
  };
  await step('jogos', async () => {
    await page.click('.tab[data-tab=jogos]');
    await cap('🎮 17 jogos para jogar com o controle remoto');
    await wait(1200);
    await page.locator('.tile').first().focus();
    await key('ArrowRight', 3, 450); await key('ArrowDown', 1, 600);
  });
  await step('capivara', () => play('capivara', '🦫 Corre Capivara', 7000, ['Enter', 'ArrowUp', 'ArrowRight', 'Enter', 'ArrowDown']));
  await step('esquadrilha', () => play('esquadrilha', '✈️ Esquadrilha 2000 — nostalgia de fliperama', 7000, ['ArrowLeft', 'Enter', 'ArrowRight', 'Enter', 'ArrowUp']));
  await step('operacao3d', () => play('operacao3d', '🕹️ Operação 3D — tiro em primeira pessoa retrô', 6000, ['ArrowUp', 'ArrowUp', 'Enter', 'ArrowRight', 'ArrowUp', 'Enter']));
  await step('frutas', () => play('frutas', '🍓 Festa das Frutas e muito mais', 4500, ['ArrowRight', 'Enter', 'ArrowDown', 'Enter']));

  await step('kids', async () => {
    await page.click('.tab[data-tab=kids]');
    await cap('🧸 Cantinho Kids: desenhos e jogos para a criançada');
    await wait(1500);
    await page.locator('.tile').first().focus();
    await key('ArrowRight', 3, 500);
  });
  await step('música', async () => {
    await page.click('.tab[data-tab=midia]');
    await cap('🎵 Música e vídeos: busque o que quiser');
    await wait(3000);
  });

  await cap('');
  let qr = '';
  if (whatsapp) {
    await page.addScriptTag({ path: path.join(dir, 'app', 'vendor', 'qrcode.js') }).catch(() => {});
    qr = await page.evaluate((u) => { if (!window.qrcode) return ''; const q = qrcode(0, 'M'); q.addData(u); q.make(); return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); },
      'https://wa.me/' + whatsapp + '?text=' + encodeURIComponent('Olá! Vi o Accioly Play e quero assinar.'));
  }
  await card('<div style="font:900 72px system-ui">Accioly <span style="color:#00e5ff">Play</span></div>' +
    '<div style="font-size:34px">Teste grátis · Assinatura de fundador <b style="color:#ffb020">R$ 15,99/mês</b></div>' +
    '<div style="opacity:.8;font-size:24px">Para os 50 primeiros assinantes, enquanto houver vagas (depois R$ 24,90/mês)</div>' +
    (qr ? '<div style="display:flex;align-items:center;gap:1.4rem"><div style="background:#fff;padding:10px;border-radius:14px;width:220px;height:220px">' + qr.replace('<svg ', '<svg style="width:100%;height:100%" ') + '</div>' +
      '<div style="text-align:left;font-size:28px">Aponte a câmera<br>do celular e<br>assine pelo WhatsApp</div></div>' : '<div style="font-size:26px">Peça o seu para quem te mostrou o Accioly Play</div>') +
    '<div style="opacity:.6;font-size:20px">Somente canais e conteúdos oficiais e gratuitos</div>');
  await wait(7000);

  const video = page.video();
  await ctx.close();
  await browser.close();
  const webm = await video.path();
  fs.mkdirSync(path.dirname(outMp4), { recursive: true });
  // H.264 + AAC (som mudo) em 1080p: o formato que qualquer Smart TV toca pelo USB
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
    '-vf', 'scale=1920:1080:flags=lanczos,fps=30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '4.1', '-c:a', 'aac', '-b:a', '64k', '-shortest', '-movflags', '+faststart', outMp4], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  if (r.status !== 0) { console.error('ffmpeg falhou (instale o ffmpeg).'); process.exit(1); }
  console.log('✔ Vídeo pronto: ' + outMp4 + ' (' + (fs.statSync(outMp4).size / 1048576).toFixed(1) + ' MB)');
})().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/*
 * Tira uma foto REAL de cada jogo em ação (vira a capa do cartão no app).
 *   node scripts/capturar-jogos.js      -> app/img/jogos/<id>.jpg
 * Precisa de Playwright e ffmpeg. Rode de novo quando criar ou mudar um jogo.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'app', 'img', 'jogos');
// Teclas para cada jogo parecer "em ação" na foto
const PLAY = {
  default: ['ArrowRight', 'Enter', 'ArrowLeft', 'Enter', 'ArrowUp', 'ArrowDown'],
  cobrinha: ['ArrowRight', 'ArrowDown', 'ArrowRight'], quiz: [], velha: ['Enter', 'ArrowRight', 'Enter'], memoria: ['Enter', 'ArrowRight', 'Enter'],
  palavra: ['ArrowDown', 'Enter'], operacao3d: ['ArrowUp', 'ArrowUp', 'ArrowRight', 'ArrowUp', 'Enter'], blocos: ['Enter', 'ArrowRight', 'Enter']
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'accioly-jogos-'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.route(/^https?:\/\//, (r) => r.abort());
  await page.goto('file://' + path.join(ROOT, 'app', 'index.html'));
  await page.waitForSelector('.topbar');
  const ids = await page.evaluate(() => GameHub.list().map((g) => g.id));
  for (const id of ids) {
    await page.evaluate((g) => GameHub.start(g, function () {}), id);
    await page.waitForSelector('.game-screen canvas');
    const keys = PLAY[id] || PLAY.default;
    const end = Date.now() + 2600;
    let i = 0;
    while (Date.now() < end) {
      if (keys.length) { const k = keys[i++ % keys.length]; await page.keyboard.down(k); await page.waitForTimeout(140); await page.keyboard.up(k); }
      await page.waitForTimeout(110);
    }
    const png = path.join(tmp, id + '.png');
    await page.locator('.game-screen canvas').screenshot({ path: png });
    await page.evaluate(() => GameHub.stop());
    const jpg = path.join(OUT, id + '.jpg');
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', 'scale=480:270:force_original_aspect_ratio=increase,crop=480:270', '-q:v', '6', jpg]);
    console.log('✔ ' + id + ' (' + Math.round(fs.statSync(jpg).size / 1024) + ' KB)');
  }
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });

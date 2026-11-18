#!/usr/bin/env node
/*
 * Teste automático (usado pelo agente QA). Sobe o servidor num diretório
 * temporário e usa um navegador de verdade (Playwright) simulando o
 * CONTROLE REMOTO (setas, OK, VOLTAR).
 *
 *   npm run teste            (precisa do Playwright: npm i -D playwright && npx playwright install chromium)
 *   SHOTS=pasta npm run teste   (salva capturas de tela)
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'accioly-teste-'));
process.env.DATA_DIR = tmp;
process.env.NO_HEALTH = '1';
process.env.MEDIA_MOCK = '1'; // dados de exemplo para Música e Vídeos (sem internet)
const shots = process.env.SHOTS || '';
if (shots) fs.mkdirSync(shots, { recursive: true });

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.error('Playwright não encontrado. Instale com: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const { server, getSetupCode } = require('../server/server.js');
const results = [];
// Erros de scripts de terceiros (AdSense/YouTube com IDs de teste) não contam: só os do nosso código
const THIRD = /googlesyndication|doubleclick|googleads|google\.com|gstatic|googleapis|youtube|ytimg/;
function own(e) { return !THIRD.test(String((e && e.stack) || '')); }
function ok(name, cond, extra) { results.push({ name, pass: !!cond, extra }); console.log((cond ? '  ✔ ' : '  ✘ ') + name + (extra && !cond ? ' — ' + extra : '')); }

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = 'http://localhost:' + server.address().port;
  const browser = await chromium.launch();
  const errors = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    // Teste sem internet: bloqueia scripts externos (AdSense, YouTube) para o resultado ser sempre o mesmo
    await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());
    const page = await ctx.newPage();
    page.on('pageerror', (e) => { if (own(e)) errors.push(e.message); });
    const shot = async (n) => { if (shots) await page.screenshot({ path: path.join(shots, n + '.png') }); };

    console.log('App da TV (modo cliente):');
    await page.goto(base + '/tv/');
    await page.waitForSelector('[data-act=register]');
    ok('tela de boas-vindas aparece', await page.isVisible('text=Testar grátis'));
    await shot('01-boas-vindas');
    await page.keyboard.press('Enter'); // foco inicial = "Testar grátis"
    await page.waitForSelector('#authf');
    await page.fill('input[name=name]', 'Cliente Teste');
    await page.fill('input[name=phone]', '11912345678');
    await page.fill('input[name=email]', 'cliente@teste.com');
    await page.fill('input[name=password]', 'segredo1');
    await page.click('button[type=submit]');
    await page.waitForSelector('.topbar');
    ok('cadastro cria conta e abre a tela inicial', await page.isVisible('text=Teste grátis'));
    ok('fileiras de canais aparecem', (await page.locator('.tile').count()) > 20);
    await shot('02-inicio');

    const before = await page.evaluate(() => document.activeElement && document.activeElement.textContent);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    const after = await page.evaluate(() => document.activeElement && document.activeElement.textContent);
    ok('setas do controle movem o foco', before !== after, before + ' -> ' + after);

    await page.locator('.tile[data-id=cobrinha]').first().focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('.game-screen canvas');
    ok('OK abre o jogo', await page.isVisible('.game-screen canvas'));
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(600);
    await shot('03-jogo');
    await page.keyboard.press('Escape');
    await page.waitForSelector('text=Pausado');
    ok('VOLTAR pausa o jogo', true);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.game-screen', { state: 'detached' });
    ok('sair do jogo volta para o app', await page.isVisible('.topbar'));

    await page.locator('.tile[data-id=plutotv]').first().focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('.modal');
    ok('link oficial abre detalhe', await page.isVisible('text=Abrir Pluto TV'));
    await page.keyboard.press('Escape');
    await page.waitForSelector('.modal', { state: 'detached' });

    await page.locator('.tile[data-id=tvbrasil]').first().focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#player');
    ok('canal ao vivo abre o player', await page.isVisible('#player'));
    await shot('04-player');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#player', { state: 'detached' });
    ok('VOLTAR fecha o player', true);

    console.log('Música e Vídeos:');
    await page.click('.tab[data-tab=midia]');
    await page.waitForSelector('#mrows .tile');
    ok('aba Música e Vídeos mostra músicas em alta', (await page.locator('#mrows .tile').count()) >= 20);
    await page.fill('#mq', 'samba');
    await page.press('#mq', 'Enter');
    await page.waitForSelector('[data-row=mres] .tile');
    ok('busca mostra resultados do YouTube e de música livre', (await page.locator('[data-row=mfres] .tile').count()) > 0);
    await shot('07-musica');
    await page.locator('[data-row=mfree] .tile').first().focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#mediaplayer .audioview');
    ok('música livre abre o player de áudio', true);
    const antes = await page.textContent('#msub');
    await page.keyboard.press('ArrowDown');
    ok('▼ pula para a próxima música', antes !== await page.textContent('#msub'));
    await page.keyboard.press('Escape');
    await page.waitForSelector('#mediaplayer', { state: 'detached' });
    await page.locator('[data-row=mmusic] .tile').first().focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#mediaplayer');
    ok('vídeo do YouTube abre o player oficial', await page.isVisible('text=Player oficial do YouTube'));
    await page.keyboard.press('Escape');
    await page.waitForSelector('#mediaplayer', { state: 'detached' });

    await page.click('.tab[data-tab=conta]');
    ok('Minha Conta mostra código de indicação', await page.isVisible('text=Seu código'));

    console.log('Painel do Dono:');
    const adm = await ctx.newPage();
    adm.on('pageerror', (e) => { if (own(e)) errors.push('admin: ' + e.message); });
    await adm.goto(base + '/admin/');
    await adm.waitForSelector('input[name=code]');
    await adm.fill('input[name=code]', getSetupCode());
    await adm.fill('input[name=name]', 'Dono');
    await adm.fill('input[name=email]', 'dono@teste.com');
    await adm.fill('input[name=password]', 'senhamuitoforte');
    await adm.click('button[type=submit]');
    await adm.waitForSelector('text=Visão geral');
    ok('primeiro acesso do dono funciona', true);
    if (shots) await adm.screenshot({ path: path.join(shots, '05-painel.png'), fullPage: true });
    for (const t of ['acoes', 'clientes', 'pedidos', 'canais', 'config', 'equipe']) {
      await adm.click('nav button[data-t=' + t + ']');
      await adm.waitForFunction(() => !document.querySelector('main').textContent.includes('Carregando'));
      ok('aba ' + t + ' abre', !(await adm.isVisible('main .err')));
    }
    await adm.click('nav button[data-t=clientes]');
    await adm.waitForSelector('text=Cliente Teste');
    ok('cliente cadastrado aparece no painel', true);

    console.log('Anúncios (AdSense):');
    await adm.click('nav button[data-t=config]');
    await adm.waitForSelector('select[name=adsEnabled]');
    await adm.selectOption('select[name=adsEnabled]', 'true');
    await adm.fill('input[name=adsensePublisherId]', 'ca-pub-1234567890123456');
    await adm.fill('input[name=adsenseBannerSlot]', '1234567890');
    await adm.selectOption('select[name=adsAudience]', 'nao_assinantes');
    await adm.click('#cf button[type=submit]');
    await adm.waitForSelector('text=Configurações salvas');
    const adsTxt = await (await fetch(base + '/ads.txt')).text();
    ok('ads.txt gerado automaticamente', adsTxt.indexOf('pub-1234567890123456, DIRECT') > 0, adsTxt);
    ok('página de privacidade existe', (await fetch(base + '/privacidade')).status === 200);
    await page.reload();
    await page.waitForSelector('.topbar');
    ok('quem não assina vê o banner de anúncio', (await page.locator('.adbox').count()) === 1);
    await page.locator('.tile[data-id=cobrinha]').first().focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('.game-screen canvas', { timeout: 3000 });
    ok('sem AdSense carregado, o jogo abre na hora', true);
    await page.evaluate(() => GameHub.stop());

    console.log('Pagamento Pix ponta a ponta:');
    await adm.click('nav button[data-t=config]');
    await adm.waitForSelector('input[name=pixKey]');
    await adm.fill('input[name=pixKey]', '12345678909');
    await adm.fill('input[name=pixName]', 'Accioly Teste');
    await adm.fill('input[name=pixCity]', 'Sao Paulo');
    await adm.click('#cf button[type=submit]');
    await adm.waitForSelector('text=Configurações salvas');
    await page.reload();
    await page.waitForSelector('.topbar');
    await page.click('.tab[data-tab=conta]');
    await page.click('[data-act=paywall]');
    await page.waitForSelector('.modal [data-act=pix]');
    ok('tela de assinatura mostra preço de fundador', await page.isVisible('.modal >> text=R$ 15,99'));
    await page.click('.modal [data-act=pix]');
    await page.waitForSelector('.qr svg');
    const pix = await page.textContent('#pixcode');
    ok('QR Code e Pix copia-e-cola aparecem na TV', /^000201.*6304[0-9A-F]{4}$/.test(pix.trim()), pix);
    await shot('06-pix');
    await page.click('[data-act=paid]');
    await adm.click('nav button[data-t=acoes]');
    await adm.waitForSelector('[data-ap]');
    adm.once('dialog', (dg) => dg.accept());
    await adm.click('[data-ap]');
    await adm.waitForSelector('text=Nada pendente agora');
    await page.waitForSelector('.pill.active', { timeout: 15000 });
    ok('após aprovação, cliente vira assinante sem recarregar', await page.isVisible('text=Assinante até'));
    await page.click('.tab[data-tab=inicio]');
    ok('assinante não vê anúncios', (await page.locator('.adbox').count()) === 0);

    console.log('Pendrive (modo dono, file://):');
    const pd = await ctx.newPage();
    pd.on('pageerror', (e) => { if (own(e)) errors.push('pendrive: ' + e.message); });
    await pd.goto('file://' + path.resolve(__dirname, '..', 'app', 'index.html'));
    await pd.waitForSelector('.topbar');
    ok('abre direto do pendrive em Modo Dono', await pd.isVisible('text=Modo Dono'));
    ok('jogo premium liberado no Modo Dono', (await pd.locator('.tile[data-id=quiz] .lock').count()) === 0);

    console.log('Todos os jogos (controle remoto aleatório):');
    const ids = await pd.evaluate(() => GameHub.list().map((g) => g.id));
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];
    for (const id of ids) {
      const before = errors.length;
      await pd.evaluate((gid) => GameHub.start(gid, function () {}), id);
      await pd.waitForSelector('.game-screen canvas');
      for (let i = 0; i < 45; i++) { await pd.keyboard.press(keys[(i * 7 + id.length) % keys.length]); await pd.waitForTimeout(40); }
      await pd.waitForTimeout(400);
      if (shots) await pd.screenshot({ path: path.join(shots, 'jogo-' + id + '.png') });
      const alive = await pd.evaluate(() => GameHub.isOpen());
      await pd.evaluate(() => GameHub.stop());
      ok('jogo ' + id + ' roda sem erro', alive && errors.length === before, errors.slice(before).join(' | '));
    }

    ok('sem erros de JavaScript', errors.length === 0, errors.join(' | '));
  } finally {
    await browser.close();
    server.close();
  }
  const failed = results.filter((r) => !r.pass);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' testes passaram.');
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

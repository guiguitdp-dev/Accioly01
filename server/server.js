#!/usr/bin/env node
/*
 * Servidor do Accioly Play — sem dependências (só Node.js 18+).
 *
 *   node server/server.js            (ou: npm start)
 *
 * Endereços:
 *   /          página de vendas
 *   /tv/       o app da TV (o que o cliente usa)
 *   /admin/    Painel do Dono
 *
 * Variáveis de ambiente (opcionais):
 *   PORT=3000                porta
 *   DATA_DIR=server/data     onde fica o banco (db.json) e backups
 *   PUBLIC_URL=https://...   endereço público (para Mercado Pago e links de indicação)
 *   ADMIN_EMAIL / ADMIN_PASSWORD   cria o dono automaticamente no 1º start
 *   MP_ACCESS_TOKEN          token do Mercado Pago (também pode ser salvo no painel)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createDb } = require('./lib/db');
const { hashPassword, checkPassword, makeTokens, id, code } = require('./lib/auth');
const { buildPix } = require('./lib/pix');
const health = require('./lib/health');
const mercadopago = require('./lib/mercadopago');
const media = require('./lib/media');

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'app');
const ADMIN_DIR = path.join(__dirname, 'admin');
const SITE_DIR = path.join(ROOT, 'site');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const PORT = Number(process.env.PORT || 3000);
const DAY = 86400000;

function loadDefaultCatalog() {
  delete require.cache[require.resolve(path.join(APP_DIR, 'js', 'catalog.js'))];
  return JSON.parse(JSON.stringify(require(path.join(APP_DIR, 'js', 'catalog.js'))));
}

function seed() {
  return {
    settings: {
      productName: 'Accioly Play',
      trialDays: 3,
      promoPrice: 15.99,
      regularPrice: 24.9,
      promoSlots: 50,
      planDays: 30,
      freeChannels: true,
      referralBonusDays: 7,
      pixKey: '', pixKeyType: 'cpf', pixName: '', pixCity: '',
      mpAccessToken: '',
      supportWhatsapp: '',
      announcement: '',
      heroTitle: '', heroText: '',
      publicUrl: '',
      // Música e vídeos (YouTube Data API v3 — chave grátis do Google Cloud)
      youtubeApiKey: '',
      // Anúncios (Google AdSense — jogos HTML5 e banner). Só para quem NÃO assina.
      adsEnabled: false, adsensePublisherId: '', adsenseBannerSlot: '', adsTestMode: true, adFrequency: 120,
      adsAudience: 'expirados', adsInAndroid: false
    },
    users: [], orders: [], admins: [],
    catalog: loadDefaultCatalog(),
    games: {},
    stats: { counters: {}, daily: {} },
    health: { checkedAt: 0, results: {} },
    yt: {},
    audit: []
  };
}

const db = createDb(DATA_DIR, seed);
const D = db.data;

// Segredo dos tokens (gerado uma vez e guardado junto do banco)
const secretFile = path.join(DATA_DIR, 'secret.key');
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
const tokens = makeTokens(fs.readFileSync(secretFile, 'utf8').trim());

// Código de primeiro acesso do Painel do Dono
let SETUP_CODE = null;
if (!D.admins.length) {
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    D.admins.push({ id: id('a_'), name: 'Dono', email: process.env.ADMIN_EMAIL.toLowerCase(), passHash: hashPassword(process.env.ADMIN_PASSWORD), role: 'dono', createdAt: Date.now() });
    db.saveNow();
  } else {
    SETUP_CODE = code(8);
  }
}

// ---------------- regras de negócio ----------------
function settings() { return D.settings; }
function ytKey() { return process.env.YOUTUBE_API_KEY || D.settings.youtubeApiKey || ''; }
const MEDIA_MOCK = !!process.env.MEDIA_MOCK;
function mpToken() { return process.env.MP_ACCESS_TOKEN || D.settings.mpAccessToken || ''; }
function founders() { return D.users.filter((u) => u.founder).length; }
function promoRemaining() { return Math.max(0, Number(D.settings.promoSlots) - founders()); }

function userStatus(u, now) {
  now = now || Date.now();
  if (u.blocked) return 'blocked';
  if (u.paidUntil && u.paidUntil > now) return 'active';
  if (u.trialEndsAt > now) return 'trial';
  return 'expired';
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, status: userStatus(u), trialEndsAt: u.trialEndsAt, paidUntil: u.paidUntil || 0, founder: !!u.founder, referralCode: u.referralCode, createdAt: u.createdAt };
}

function priceFor(u) {
  const s = D.settings;
  if (u.founder) return { amount: Number(s.promoPrice), promo: true };
  if (promoRemaining() > 0) return { amount: Number(s.promoPrice), promo: true };
  return { amount: Number(s.regularPrice), promo: false };
}

function publicSettings() {
  const s = D.settings;
  return {
    productName: s.productName, trialDays: s.trialDays, promoPrice: s.promoPrice, regularPrice: s.regularPrice, promoSlots: s.promoSlots,
    promoRemaining: promoRemaining(), planDays: s.planDays, freeChannels: s.freeChannels, referralBonusDays: s.referralBonusDays,
    pixEnabled: !!s.pixKey, mpEnabled: !!mpToken(), supportWhatsapp: s.supportWhatsapp, announcement: s.announcement,
    heroTitle: s.heroTitle, heroText: s.heroText,
    youtubeEnabled: !!ytKey() || MEDIA_MOCK,
    ads: {
      enabled: !!(s.adsEnabled && /^ca-pub-\d{10,20}$/.test(s.adsensePublisherId || '')), client: s.adsensePublisherId, slot: s.adsenseBannerSlot,
      test: !!s.adsTestMode, frequency: Number(s.adFrequency) || 120, audience: s.adsAudience, android: !!s.adsInAndroid
    }
  };
}

function publicCatalog() {
  const hr = (D.health && D.health.results) || {};
  return {
    categories: D.catalog.categories,
    items: D.catalog.items.filter((i) => i.enabled !== false).map((i) => {
      const out = Object.assign({}, i);
      if (i.type === 'youtube' && !i.channelId && D.yt[i.handle] && D.yt[i.handle].channelId) out.channelId = D.yt[i.handle].channelId;
      if (i.type === 'youtube' && D.yt[i.handle]) out.live = !!D.yt[i.handle].live;
      // Sinal fora do ar na última verificação (só para o que toca dentro do app)
      const h = hr[i.id];
      if (h && !h.ok && i.type !== 'link' && Date.now() - (h.at || 0) < DAY) out.status = 'off';
      return out;
    })
  };
}

// O que mais estão assistindo/jogando (só contagens, sem dados pessoais)
function trending() {
  return Object.entries(D.stats.counters)
    .filter(([k]) => k.startsWith('play:') || k.startsWith('game:'))
    .sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([k, n]) => ({ id: k.slice(k.indexOf(':') + 1), n }));
}

function bump(key, n) {
  const day = new Date().toISOString().slice(0, 10);
  const c = D.stats.counters;
  if (c[key] === undefined && Object.keys(c).length > 2000) return;
  c[key] = (c[key] || 0) + (n || 1);
  const d = D.stats.daily[day] || (D.stats.daily[day] = {});
  const k = key.split(':')[0];
  d[k] = (d[k] || 0) + (n || 1);
  const days = Object.keys(D.stats.daily).sort();
  while (days.length > 120) delete D.stats.daily[days.shift()];
}

function audit(who, what) {
  D.audit.unshift({ at: Date.now(), who, what });
  if (D.audit.length > 500) D.audit.length = 500;
}

function approveOrder(order, by) {
  if (order.status === 'pago') return false;
  const u = D.users.find((x) => x.id === order.userId);
  if (!u) return false;
  order.status = 'pago'; order.paidAt = Date.now(); order.approvedBy = by;
  const base = Math.max(Date.now(), u.paidUntil || 0);
  u.paidUntil = base + Number(D.settings.planDays) * DAY;
  if (order.promo && !u.founder) u.founder = true;
  // Bônus de indicação: na 1ª compra do indicado, quem indicou ganha dias
  const firstPaid = D.orders.filter((o) => o.userId === u.id && o.status === 'pago').length === 1;
  if (firstPaid && u.referredBy) {
    const ref = D.users.find((x) => x.id === u.referredBy);
    if (ref) {
      ref.paidUntil = Math.max(Date.now(), ref.paidUntil || 0, ref.trialEndsAt || 0) + Number(D.settings.referralBonusDays) * DAY;
      ref.referralCount = (ref.referralCount || 0) + 1;
    }
  }
  bump('venda', 1);
  audit(by, 'pedido ' + order.id + ' aprovado (' + order.amount + ')');
  db.save();
  return true;
}

// ---------------- HTTP helpers ----------------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.apk': 'application/vnd.android.package-archive' };

function send(res, status, obj, extra) {
  const body = typeof obj === 'string' ? obj : JSON.stringify(obj);
  res.writeHead(status, Object.assign({ 'Content-Type': typeof obj === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {}));
  res.end(body);
}
function fail(res, status, msg) { send(res, status, { error: msg }); }

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 1e6) { reject(new Error('Corpo muito grande')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function serveStatic(res, dir, rel) {
  const safe = path.normalize(decodeURIComponent(rel)).replace(/^(\.\.[/\\])+/, '');
  let file = path.join(dir, safe);
  if (!file.startsWith(dir)) return fail(res, 403, 'Proibido');
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) return fail(res, 404, 'Não encontrado');
  const ext = path.extname(file).toLowerCase();
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' };
  headers['Cache-Control'] = ext === '.html' || file.endsWith('sw.js') ? 'no-cache' : 'public, max-age=3600';
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}

function clientIp(req) { return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || ''; }

const hits = new Map();
function limited(req, bucket, max, windowMs) {
  const key = bucket + ':' + clientIp(req);
  const now = Date.now();
  const h = hits.get(key) || { n: 0, reset: now + windowMs };
  if (now > h.reset) { h.n = 0; h.reset = now + windowMs; }
  h.n++; hits.set(key, h);
  if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
  return h.n > max;
}

function auth(req, kind) {
  const h = req.headers.authorization || '';
  const p = tokens.verify(h.startsWith('Bearer ') ? h.slice(7) : '');
  if (!p || p.typ !== kind) return null;
  if (kind === 'user') { const u = D.users.find((x) => x.id === p.sub); if (u) u.lastSeenAt = Date.now(); return u || null; }
  return D.admins.find((x) => x.id === p.sub) || null;
}

function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  if (D.settings.publicUrl) return D.settings.publicUrl.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return proto + '://' + req.headers.host;
}

const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || '');

// ---------------- rotas da API ----------------
const routes = [];
function route(method, pattern, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, handler });
}

route('GET', '/api/public/config', (req, res) => {
  send(res, 200, { settings: publicSettings(), catalog: publicCatalog(), games: D.games, trending: trending() });
});

route('POST', '/api/auth/register', async (req, res, body) => {
  if (limited(req, 'reg', 10, 3600e3)) return fail(res, 429, 'Muitas tentativas. Tente mais tarde.');
  const name = String(body.name || '').trim().slice(0, 80);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
  const phone = String(body.phone || '').replace(/[^\d+]/g, '').slice(0, 20);
  const password = String(body.password || '');
  if (name.length < 2) return fail(res, 400, 'Digite seu nome.');
  if (!emailOk(email)) return fail(res, 400, 'E-mail inválido.');
  if (phone.replace(/\D/g, '').length < 10) return fail(res, 400, 'Digite seu WhatsApp com DDD.');
  if (password.length < 6) return fail(res, 400, 'A senha precisa ter pelo menos 6 caracteres.');
  if (D.users.some((u) => u.email === email)) return fail(res, 409, 'Este e-mail já tem conta. Use "Já tenho conta".');
  const phoneDigits = phone.replace(/\D/g, '');
  const sameTrial = D.users.some((u) => u.phone && u.phone.replace(/\D/g, '') === phoneDigits);
  let referredBy = null;
  if (body.ref) { const r = D.users.find((u) => u.referralCode === String(body.ref).trim().toUpperCase()); if (r) referredBy = r.id; }
  let rc; do { rc = code(6); } while (D.users.some((u) => u.referralCode === rc));
  const now = Date.now();
  const u = {
    id: id('u_'), name, email, phone, passHash: hashPassword(password), createdAt: now,
    // Mesmo WhatsApp já usado: não ganha novo teste (evita abuso)
    trialEndsAt: sameTrial ? now : now + Number(D.settings.trialDays) * DAY,
    paidUntil: 0, founder: false, blocked: false, referralCode: rc, referredBy, notes: '', lastSeenAt: now
  };
  D.users.push(u);
  bump('cadastro', 1);
  db.save();
  send(res, 201, { token: tokens.sign({ sub: u.id, typ: 'user' }, 60 * 86400), user: publicUser(u) });
});

route('POST', '/api/auth/login', async (req, res, body) => {
  if (limited(req, 'login', 15, 600e3)) return fail(res, 429, 'Muitas tentativas. Aguarde 10 minutos.');
  const email = String(body.email || '').trim().toLowerCase();
  const u = D.users.find((x) => x.email === email);
  if (!u || !checkPassword(body.password || '', u.passHash)) return fail(res, 401, 'E-mail ou senha incorretos.');
  if (u.blocked) return fail(res, 403, 'Conta bloqueada. Fale com o suporte.');
  send(res, 200, { token: tokens.sign({ sub: u.id, typ: 'user' }, 60 * 86400), user: publicUser(u) });
});

route('GET', '/api/me', (req, res) => {
  const u = auth(req, 'user');
  if (!u) return fail(res, 401, 'Faça login novamente.');
  send(res, 200, { user: publicUser(u), settings: publicSettings() });
});

route('POST', '/api/checkout', async (req, res, body) => {
  const u = auth(req, 'user');
  if (!u) return fail(res, 401, 'Faça login novamente.');
  if (u.blocked) return fail(res, 403, 'Conta bloqueada.');
  const method = body.method === 'mp' ? 'mp' : 'pix';
  const s = D.settings;
  const { amount, promo } = priceFor(u);
  // Reaproveita pedido Pix pendente recente do mesmo valor (evita duplicados)
  let order = D.orders.find((o) => o.userId === u.id && o.method === method && (o.status === 'pendente' || o.status === 'aguardando_confirmacao') && o.amount === amount && Date.now() - o.createdAt < DAY);
  if (!order) {
    order = { id: 'P' + code(10), userId: u.id, amount, promo, method, status: 'pendente', createdAt: Date.now() };
    D.orders.push(order);
    db.save();
  }
  const title = s.productName + ' — ' + s.planDays + ' dias';
  if (method === 'pix') {
    if (!s.pixKey) return fail(res, 400, 'Pix ainda não configurado pelo dono.');
    const pixCode = buildPix({ key: s.pixKey, keyType: s.pixKeyType, name: s.pixName || s.productName, city: s.pixCity || 'BRASIL', amount, txid: order.id });
    return send(res, 200, { order, pixCode, receiver: s.pixName || s.productName });
  }
  const token = mpToken();
  if (!token) return fail(res, 400, 'Mercado Pago não configurado.');
  try {
    if (!order.initPoint) {
      const pref = await mercadopago.createPreference(token, { order, user: u, title, publicUrl: baseUrl(req) });
      order.mpPreferenceId = pref.id; order.initPoint = pref.initPoint; db.save();
    }
    send(res, 200, { order, initPoint: order.initPoint });
  } catch (e) { fail(res, 502, e.message); }
});

route('GET', '/api/orders/:id', async (req, res, body, params) => {
  const u = auth(req, 'user');
  if (!u) return fail(res, 401, 'Faça login novamente.');
  const o = D.orders.find((x) => x.id === params.id && x.userId === u.id);
  if (!o) return fail(res, 404, 'Pedido não encontrado.');
  // Sem webhook (ex.: servidor no PC de casa): consulta o Mercado Pago de tempos em tempos
  if (o.method === 'mp' && o.status !== 'pago' && mpToken() && (!o.lastMpCheck || Date.now() - o.lastMpCheck > 15000)) {
    o.lastMpCheck = Date.now();
    try {
      const p = await mercadopago.findApprovedByReference(mpToken(), o.id);
      if (p && Number(p.transaction_amount) + 0.01 >= o.amount) { o.mpPaymentId = p.id; approveOrder(o, 'mercadopago'); }
    } catch (e) { /* tenta de novo depois */ }
  }
  send(res, 200, { order: { id: o.id, status: o.status, amount: o.amount, method: o.method } });
});

route('POST', '/api/orders/:id/notify', (req, res, body, params) => {
  const u = auth(req, 'user');
  if (!u) return fail(res, 401, 'Faça login novamente.');
  const o = D.orders.find((x) => x.id === params.id && x.userId === u.id);
  if (!o) return fail(res, 404, 'Pedido não encontrado.');
  if (o.status === 'pendente') { o.status = 'aguardando_confirmacao'; o.notifiedAt = Date.now(); db.save(); }
  send(res, 200, { ok: true });
});

route('POST', '/api/webhooks/mercadopago', async (req, res, body, params, query) => {
  send(res, 200, { ok: true }); // responde rápido; processa em seguida
  const token = mpToken();
  const paymentId = (body && body.data && body.data.id) || query.get('data.id') || (query.get('topic') === 'payment' ? query.get('id') : null);
  if (!token || !paymentId) return;
  try {
    const p = await mercadopago.getPayment(token, paymentId);
    const o = D.orders.find((x) => x.id === p.external_reference);
    if (o && p.status === 'approved' && Number(p.transaction_amount) + 0.01 >= o.amount) { o.mpPaymentId = p.id; approveOrder(o, 'mercadopago'); }
  } catch (e) { console.error('[webhook MP]', e.message); }
});

route('POST', '/api/events', (req, res, body) => {
  if (limited(req, 'ev', 300, 600e3)) return send(res, 200, { ok: true });
  const type = String(body.type || '').slice(0, 12).replace(/[^a-z]/g, '');
  const itemId = String(body.id || '').slice(0, 80).replace(/[^\w\-.:/@]/g, '');
  if (['play', 'game', 'open', 'score', 'ad', 'yt', 'music'].includes(type) && itemId) {
    if (type !== 'score') { bump(type + ':' + itemId, 1); db.save(); }
  }
  send(res, 200, { ok: true });
});

// Descobre o ID do canal oficial e se está AO VIVO agora (ID guardado 7 dias; "ao vivo" 10 minutos)
route('GET', '/api/yt/resolve', async (req, res, body, params, query) => {
  const handle = String(query.get('handle') || '');
  const cached = D.yt[handle];
  if (cached && Date.now() - cached.at < 7 * DAY && Date.now() - (cached.liveAt || cached.at) < 600e3) return send(res, 200, { channelId: cached.channelId, live: cached.live });
  if (limited(req, 'yt', 120, 600e3)) return send(res, 200, { channelId: cached ? cached.channelId : null, live: cached ? cached.live : false });
  try {
    const r = await health.resolveYoutube(handle);
    if (r.channelId) { D.yt[handle] = { channelId: r.channelId, live: r.live, at: Date.now(), liveAt: Date.now() }; db.save(); }
    send(res, 200, { channelId: r.channelId || (cached && cached.channelId) || null, live: r.live });
  } catch (e) { send(res, 200, { channelId: cached ? cached.channelId : null, live: cached ? cached.live : false }); }
});

// ---------------- Música e vídeos ----------------
route('GET', '/api/media/home', async (req, res) => {
  const out = { youtube: !!ytKey() || MEDIA_MOCK, music: [], videos: [], free: [], errors: {} };
  if (MEDIA_MOCK) { out.music = media.mock('m', 8); out.videos = media.mock('v', 8); out.free = media.mock('a', 8); return send(res, 200, out); }
  const key = ytKey();
  await Promise.all([
    key ? media.ytChart(key, 'music').then((r) => { out.music = r; }).catch((e) => { out.errors.music = e.message; }) : null,
    key ? media.ytChart(key, 'videos').then((r) => { out.videos = r; }).catch((e) => { out.errors.videos = e.message; }) : null,
    media.audiusTrending().then((r) => { out.free = r; }).catch((e) => { out.errors.free = e.message; })
  ]);
  send(res, 200, out);
});

route('GET', '/api/media/search', async (req, res, body, params, query) => {
  if (!auth(req, 'user')) return fail(res, 401, 'Entre na sua conta para buscar.');
  if (limited(req, 'msearch', 40, 600e3)) return fail(res, 429, 'Muitas buscas seguidas. Aguarde alguns minutos.');
  const q = String(query.get('q') || '').trim().slice(0, 80);
  const kind = query.get('tipo') === 'videos' ? 'videos' : 'music';
  const out = { youtube: [], free: [], errors: {} };
  if (q.length < 2) return send(res, 200, out);
  if (MEDIA_MOCK) { out.youtube = media.mock('s', 6); out.free = media.mock('f', 4); return send(res, 200, out); }
  bump('busca', 1); db.save();
  const key = ytKey();
  await Promise.all([
    key ? media.ytSearch(key, q, kind).then((r) => { out.youtube = r; }).catch((e) => { out.errors.youtube = e.message; }) : null,
    media.audiusSearch(q).then((r) => { out.free = r; }).catch((e) => { out.errors.free = e.message; })
  ]);
  send(res, 200, out);
});

// ---------------- Painel do Dono ----------------
function admin(req, res, role) {
  const a = auth(req, 'admin');
  if (!a) { fail(res, 401, 'Entre no painel novamente.'); return null; }
  if (role === 'dono' && a.role !== 'dono') { fail(res, 403, 'Só o dono pode fazer isso.'); return null; }
  return a;
}

route('GET', '/api/admin/setup', (req, res) => send(res, 200, { needsSetup: !D.admins.length }));

route('POST', '/api/admin/setup', (req, res, body) => {
  if (D.admins.length) return fail(res, 400, 'O dono já foi cadastrado.');
  if (limited(req, 'setup', 10, 600e3)) return fail(res, 429, 'Muitas tentativas.');
  if (String(body.code || '').trim().toUpperCase() !== SETUP_CODE) return fail(res, 403, 'Código de primeiro acesso incorreto (veja a janela do servidor).');
  if (!emailOk(body.email) || String(body.password || '').length < 8) return fail(res, 400, 'Informe e-mail válido e senha com 8+ caracteres.');
  const a = { id: id('a_'), name: String(body.name || 'Dono').slice(0, 60), email: body.email.toLowerCase(), passHash: hashPassword(body.password), role: 'dono', createdAt: Date.now() };
  D.admins.push(a); SETUP_CODE = null; audit(a.email, 'dono cadastrado'); db.saveNow();
  send(res, 201, { token: tokens.sign({ sub: a.id, typ: 'admin' }, 12 * 3600), admin: { name: a.name, email: a.email, role: a.role } });
});

route('POST', '/api/admin/login', (req, res, body) => {
  if (limited(req, 'alogin', 10, 600e3)) return fail(res, 429, 'Muitas tentativas. Aguarde 10 minutos.');
  const a = D.admins.find((x) => x.email === String(body.email || '').trim().toLowerCase());
  if (!a || !checkPassword(body.password || '', a.passHash)) return fail(res, 401, 'E-mail ou senha incorretos.');
  audit(a.email, 'login no painel');
  send(res, 200, { token: tokens.sign({ sub: a.id, typ: 'admin' }, 12 * 3600), admin: { name: a.name, email: a.email, role: a.role } });
});

route('GET', '/api/admin/stats', (req, res) => {
  if (!admin(req, res)) return;
  const now = Date.now();
  const st = { trial: 0, active: 0, expired: 0, blocked: 0 };
  D.users.forEach((u) => { st[userStatus(u, now)]++; });
  const paid = D.orders.filter((o) => o.status === 'pago');
  const month = new Date().toISOString().slice(0, 7);
  const revenue = paid.reduce((s, o) => s + o.amount, 0);
  const revenueMonth = paid.filter((o) => new Date(o.paidAt).toISOString().slice(0, 7) === month).reduce((s, o) => s + o.amount, 0);
  const buyers = new Set(paid.map((o) => o.userId)).size;
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * DAY).toISOString().slice(0, 10);
    const dd = D.stats.daily[d] || {};
    days.push({ day: d, cadastros: dd.cadastro || 0, vendas: dd.venda || 0, plays: (dd.play || 0) + (dd.game || 0) });
  }
  const top = (prefix) => Object.entries(D.stats.counters).filter(([k]) => k.startsWith(prefix + ':')).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ id: k.slice(prefix.length + 1), n: v }));
  const mrr = D.users.filter((u) => userStatus(u, now) === 'active').reduce((s, u) => s + (u.founder ? Number(D.settings.promoPrice) : Number(D.settings.regularPrice)), 0);
  send(res, 200, {
    users: D.users.length, status: st, founders: founders(), promoSlots: D.settings.promoSlots, promoRemaining: promoRemaining(),
    revenue, revenueMonth, mrr, buyers, conversion: D.users.length ? buyers / D.users.length : 0,
    pendingOrders: D.orders.filter((o) => o.status === 'aguardando_confirmacao').length,
    ads7d: Object.entries(D.stats.daily).filter(([d]) => now - Date.parse(d) < 7 * DAY).reduce((n, [, v]) => n + (v.ad || 0), 0),
    adsOn: publicSettings().ads.enabled,
    days, topChannels: top('play'), topGames: top('game'), health: { checkedAt: D.health.checkedAt, broken: Object.values(D.health.results).filter((r) => !r.ok).length, total: Object.keys(D.health.results).length }
  });
});

function waLink(phone, text) {
  let p = String(phone || '').replace(/\D/g, '');
  if (p.length <= 11) p = '55' + p;
  return 'https://wa.me/' + p + '?text=' + encodeURIComponent(text);
}

route('GET', '/api/admin/actions', (req, res) => {
  if (!admin(req, res)) return;
  const now = Date.now(), s = D.settings, link = baseUrl(req) + '/tv/';
  const first = (n) => String(n || '').split(' ')[0];
  const price = (u) => (u.founder || promoRemaining() > 0 ? s.promoPrice : s.regularPrice).toFixed(2).replace('.', ',');
  const out = [];
  D.users.forEach((u) => {
    const st = userStatus(u, now);
    if (st === 'trial' && u.trialEndsAt - now < 2 * DAY) {
      out.push({ kind: 'teste_acabando', priority: 1, user: publicUser(u), text: 'Teste termina em ' + Math.max(1, Math.ceil((u.trialEndsAt - now) / 3600e3)) + 'h',
        wa: waLink(u.phone, 'Oi ' + first(u.name) + '! Seu teste grátis do ' + s.productName + ' termina em breve. ' + (promoRemaining() > 0 ? 'Ainda dá tempo de garantir o preço de fundador de R$ ' + price(u) + '/mês (restam ' + promoRemaining() + ' vagas) — ' : 'Assine por R$ ' + price(u) + '/mês — ') + 'é só abrir ' + link + ' e tocar em Assinar. Qualquer dúvida me chama aqui!') });
    } else if (st === 'expired' && !u.paidUntil && now - u.trialEndsAt < 7 * DAY) {
      out.push({ kind: 'teste_expirou', priority: 2, user: publicUser(u), text: 'Teste expirou há ' + Math.ceil((now - u.trialEndsAt) / DAY) + ' dia(s), não assinou',
        wa: waLink(u.phone, 'Oi ' + first(u.name) + ', tudo bem? Vi que seu teste do ' + s.productName + ' acabou. O que achou? Se quiser, libero mais 1 dia pra você testar com calma os canais e os jogos 😉') });
    } else if (st === 'active' && u.paidUntil - now < 3 * DAY) {
      out.push({ kind: 'renovacao', priority: 1, user: publicUser(u), text: 'Assinatura vence em ' + Math.ceil((u.paidUntil - now) / DAY) + ' dia(s)',
        wa: waLink(u.phone, 'Oi ' + first(u.name) + '! Sua assinatura do ' + s.productName + ' vence em breve. Pra renovar' + (u.founder ? ' com seu preço de fundador' : '') + ' (R$ ' + price(u) + ') é só abrir ' + link + ' > Minha Conta > Renovar. Obrigado por estar com a gente! 🙌') });
    } else if (st === 'active' && u.paidUntil && !u.askedReferral && D.orders.some((o) => o.userId === u.id && o.status === 'pago' && now - o.paidAt > 5 * DAY)) {
      out.push({ kind: 'pedir_indicacao', priority: 3, user: publicUser(u), text: 'Cliente satisfeito há 5+ dias — peça indicação',
        wa: waLink(u.phone, 'Oi ' + first(u.name) + '! Tá curtindo o ' + s.productName + '? Cada amigo que assinar com seu código ' + u.referralCode + ' te dá +' + s.referralBonusDays + ' dias grátis. Link: ' + baseUrl(req) + '/?ref=' + u.referralCode) });
    }
  });
  D.orders.filter((o) => o.status === 'aguardando_confirmacao').forEach((o) => {
    const u = D.users.find((x) => x.id === o.userId);
    out.push({ kind: 'pix_confirmar', priority: 0, order: o, user: u ? publicUser(u) : null, text: 'Cliente avisou que pagou Pix de R$ ' + o.amount.toFixed(2) + ' — confira no banco e aprove' });
  });
  out.sort((a, b) => a.priority - b.priority);
  send(res, 200, { actions: out });
});

route('POST', '/api/admin/actions/referral-asked', (req, res, body) => {
  if (!admin(req, res)) return;
  const u = D.users.find((x) => x.id === body.userId);
  if (u) { u.askedReferral = true; db.save(); }
  send(res, 200, { ok: true });
});

route('GET', '/api/admin/users', (req, res, body, params, query) => {
  if (!admin(req, res)) return;
  const q = String(query.get('q') || '').toLowerCase();
  const status = query.get('status') || '';
  const list = D.users.filter((u) => (!q || (u.name + ' ' + u.email + ' ' + u.phone).toLowerCase().includes(q)) && (!status || userStatus(u) === status))
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, 500)
    .map((u) => Object.assign(publicUser(u), { notes: u.notes, lastSeenAt: u.lastSeenAt, referralCount: u.referralCount || 0, paidTotal: D.orders.filter((o) => o.userId === u.id && o.status === 'pago').reduce((s, o) => s + o.amount, 0) }));
  send(res, 200, { users: list, total: D.users.length });
});

route('POST', '/api/admin/users/:id', (req, res, body, params) => {
  const a = admin(req, res); if (!a) return;
  const u = D.users.find((x) => x.id === params.id);
  if (!u) return fail(res, 404, 'Cliente não encontrado.');
  const days = Math.max(1, Math.min(3650, Number(body.days) || 1));
  switch (body.action) {
    case 'extend_trial': u.trialEndsAt = Math.max(Date.now(), u.trialEndsAt) + days * DAY; break;
    case 'activate': u.paidUntil = Math.max(Date.now(), u.paidUntil || 0) + days * DAY; break;
    case 'founder': if (a.role !== 'dono') return fail(res, 403, 'Só o dono.'); u.founder = !u.founder; break;
    case 'block': u.blocked = true; break;
    case 'unblock': u.blocked = false; break;
    case 'note': u.notes = String(body.notes || '').slice(0, 500); break;
    case 'reset_password': {
      if (String(body.password || '').length < 6) return fail(res, 400, 'Senha com 6+ caracteres.');
      u.passHash = hashPassword(body.password); break;
    }
    case 'delete': if (a.role !== 'dono') return fail(res, 403, 'Só o dono.'); D.users.splice(D.users.indexOf(u), 1); break;
    default: return fail(res, 400, 'Ação inválida.');
  }
  audit(a.email, body.action + ' ' + u.email + (body.days ? ' (' + days + 'd)' : ''));
  db.save();
  send(res, 200, { ok: true });
});

route('GET', '/api/admin/orders', (req, res) => {
  if (!admin(req, res)) return;
  const list = D.orders.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 500).map((o) => {
    const u = D.users.find((x) => x.id === o.userId);
    return Object.assign({}, o, { userName: u ? u.name : '(removido)', userEmail: u ? u.email : '', userPhone: u ? u.phone : '' });
  });
  send(res, 200, { orders: list });
});

route('POST', '/api/admin/orders/:id', (req, res, body, params) => {
  const a = admin(req, res); if (!a) return;
  const o = D.orders.find((x) => x.id === params.id);
  if (!o) return fail(res, 404, 'Pedido não encontrado.');
  if (body.action === 'approve') approveOrder(o, a.email);
  else if (body.action === 'reject') { o.status = 'recusado'; audit(a.email, 'pedido ' + o.id + ' recusado'); db.save(); }
  else return fail(res, 400, 'Ação inválida.');
  send(res, 200, { ok: true });
});

const SETTING_TYPES = {
  productName: 'str', trialDays: 'num', promoPrice: 'num', regularPrice: 'num', promoSlots: 'num', planDays: 'num', freeChannels: 'bool', referralBonusDays: 'num',
  pixKey: 'str', pixKeyType: 'str', pixName: 'str', pixCity: 'str', mpAccessToken: 'secret', supportWhatsapp: 'str', announcement: 'str', heroTitle: 'str', heroText: 'str', publicUrl: 'str',
  youtubeApiKey: 'secret', adsEnabled: 'bool', adsensePublisherId: 'str', adsenseBannerSlot: 'str', adsTestMode: 'bool', adFrequency: 'num', adsAudience: 'str', adsInAndroid: 'bool'
};

route('GET', '/api/admin/settings', (req, res) => {
  if (!admin(req, res)) return;
  const s = Object.assign({}, D.settings);
  s.mpAccessToken = s.mpAccessToken ? '••••' + s.mpAccessToken.slice(-4) : '';
  s.mpFromEnv = !!process.env.MP_ACCESS_TOKEN;
  s.youtubeApiKey = s.youtubeApiKey ? '••••' + s.youtubeApiKey.slice(-4) : '';
  s.ytFromEnv = !!process.env.YOUTUBE_API_KEY;
  send(res, 200, { settings: s });
});

route('PUT', '/api/admin/settings', (req, res, body) => {
  const a = admin(req, res, 'dono'); if (!a) return;
  const changed = [];
  for (const [k, t] of Object.entries(SETTING_TYPES)) {
    if (body[k] === undefined) continue;
    let v = body[k];
    if (t === 'num') { v = Number(v); if (!isFinite(v) || v < 0) continue; }
    else if (t === 'bool') v = v === true || v === 'true';
    else if (t === 'secret') { v = String(v).trim(); if (v.startsWith('••••')) continue; }
    else v = String(v).trim().slice(0, 600);
    D.settings[k] = v; changed.push(k);
  }
  audit(a.email, 'configurações: ' + changed.join(', '));
  db.save();
  send(res, 200, { ok: true });
});

route('GET', '/api/admin/catalog', (req, res) => {
  if (!admin(req, res)) return;
  send(res, 200, { catalog: D.catalog, health: D.health, yt: D.yt, games: D.games });
});

route('PUT', '/api/admin/catalog', (req, res, body) => {
  const a = admin(req, res, 'dono'); if (!a) return;
  if (body.reset) { D.catalog = loadDefaultCatalog(); audit(a.email, 'catálogo restaurado ao padrão'); db.save(); return send(res, 200, { ok: true }); }
  const items = Array.isArray(body.items) ? body.items : null;
  if (!items) return fail(res, 400, 'Lista inválida.');
  const cats = new Set(D.catalog.categories.map((c) => c.id));
  const clean = [];
  for (const it of items) {
    const x = {
      id: String(it.id || '').replace(/[^\w-]/g, '').slice(0, 40), name: String(it.name || '').slice(0, 60), cat: String(it.cat || ''),
      type: ['hls', 'youtube', 'link'].includes(it.type) ? it.type : 'link', color: /^#[0-9a-f]{3,8}$/i.test(it.color || '') ? it.color : '#334155',
      desc: String(it.desc || '').slice(0, 200), enabled: it.enabled !== false
    };
    if (!x.id || !x.name || !cats.has(x.cat)) return fail(res, 400, 'Item inválido: ' + (it.name || it.id || '?'));
    if (x.type === 'youtube') { x.handle = String(it.handle || '').trim(); if (!/^@[\w.\-]{2,60}$/.test(x.handle)) return fail(res, 400, 'Handle do YouTube inválido em ' + x.name + ' (ex.: @CanalOficial)'); }
    else { x.url = String(it.url || '').trim(); if (!/^https?:\/\//.test(x.url)) return fail(res, 400, 'URL inválida em ' + x.name); }
    if (it.fallback) x.fallback = String(it.fallback).slice(0, 300);
    if (it.android && /^[\w.]{3,100}$/.test(it.android)) x.android = it.android;
    if (it.channelId && /^UC[\w-]{22}$/.test(it.channelId)) x.channelId = it.channelId;
    clean.push(x);
  }
  D.catalog.items = clean;
  if (body.games && typeof body.games === 'object') {
    D.games = {};
    for (const [gid, g] of Object.entries(body.games)) D.games[String(gid).slice(0, 40)] = { enabled: g.enabled !== false, premium: !!g.premium };
  }
  audit(a.email, 'catálogo salvo (' + clean.length + ' canais)');
  db.save();
  send(res, 200, { ok: true });
});

route('POST', '/api/admin/health/run', (req, res) => {
  if (!admin(req, res)) return;
  runHealth().catch(() => {});
  send(res, 202, { ok: true, message: 'Verificação iniciada. Atualize em ~1 minuto.' });
});

route('GET', '/api/admin/admins', (req, res) => {
  if (!admin(req, res)) return;
  send(res, 200, { admins: D.admins.map((a) => ({ id: a.id, name: a.name, email: a.email, role: a.role, createdAt: a.createdAt })), audit: D.audit.slice(0, 80) });
});

route('POST', '/api/admin/admins', (req, res, body) => {
  const a = admin(req, res, 'dono'); if (!a) return;
  const email = String(body.email || '').trim().toLowerCase();
  if (!emailOk(email) || String(body.password || '').length < 8) return fail(res, 400, 'E-mail válido e senha com 8+ caracteres.');
  if (D.admins.some((x) => x.email === email)) return fail(res, 409, 'Já existe.');
  const role = body.role === 'dono' ? 'dono' : 'suporte';
  D.admins.push({ id: id('a_'), name: String(body.name || email).slice(0, 60), email, passHash: hashPassword(body.password), role, createdAt: Date.now() });
  audit(a.email, 'adicionou ' + role + ' ' + email);
  db.save();
  send(res, 201, { ok: true });
});

route('DELETE', '/api/admin/admins/:id', (req, res, body, params) => {
  const a = admin(req, res, 'dono'); if (!a) return;
  const t = D.admins.find((x) => x.id === params.id);
  if (!t) return fail(res, 404, 'Não encontrado.');
  if (t.id === a.id) return fail(res, 400, 'Você não pode remover a si mesmo.');
  D.admins.splice(D.admins.indexOf(t), 1);
  audit(a.email, 'removeu ' + t.email);
  db.save();
  send(res, 200, { ok: true });
});

route('POST', '/api/admin/password', (req, res, body) => {
  const a = admin(req, res); if (!a) return;
  if (!checkPassword(body.current || '', a.passHash)) return fail(res, 403, 'Senha atual incorreta.');
  if (String(body.password || '').length < 8) return fail(res, 400, 'Nova senha com 8+ caracteres.');
  a.passHash = hashPassword(body.password); audit(a.email, 'trocou a senha'); db.save();
  send(res, 200, { ok: true });
});

route('GET', '/api/admin/export.csv', (req, res) => {
  if (!admin(req, res)) return;
  const rows = [['nome', 'email', 'whatsapp', 'status', 'criado_em', 'teste_ate', 'assinante_ate', 'fundador', 'total_pago']];
  D.users.forEach((u) => rows.push([u.name, u.email, u.phone, userStatus(u), new Date(u.createdAt).toISOString(), new Date(u.trialEndsAt).toISOString(), u.paidUntil ? new Date(u.paidUntil).toISOString() : '', u.founder ? 'sim' : 'nao',
    D.orders.filter((o) => o.userId === u.id && o.status === 'pago').reduce((s, o) => s + o.amount, 0).toFixed(2)]));
  const csv = '﻿' + rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="clientes.csv"' });
  res.end(csv);
});

// Relatório resumido (sem dados pessoais) para os agentes de IA analisarem gastando poucos tokens
route('GET', '/api/admin/report', (req, res) => {
  if (!admin(req, res)) return;
  const now = Date.now();
  const st = { trial: 0, active: 0, expired: 0, blocked: 0 };
  D.users.forEach((u) => { st[userStatus(u, now)]++; });
  const last7 = Object.entries(D.stats.daily).filter(([d]) => now - Date.parse(d) < 7 * DAY);
  const sum = (k) => last7.reduce((s, [, v]) => s + (v[k] || 0), 0);
  const broken = Object.entries(D.health.results).filter(([, r]) => !r.ok).map(([k, r]) => k + ' (' + r.note + ')');
  send(res, 200, {
    geradoEm: new Date().toISOString(), clientes: D.users.length, status: st, fundadores: founders() + '/' + D.settings.promoSlots,
    ultimos7dias: { cadastros: sum('cadastro'), vendas: sum('venda'), canaisAbertos: sum('play'), jogosAbertos: sum('game'), buscasMusica: sum('busca'), anuncios: sum('ad') },
    conversao: D.users.length ? (new Set(D.orders.filter((o) => o.status === 'pago').map((o) => o.userId)).size / D.users.length).toFixed(3) : '0',
    canaisComProblema: broken,
    topCanais: Object.entries(D.stats.counters).filter(([k]) => k.startsWith('play:')).sort((a, b) => b[1] - a[1]).slice(0, 5),
    topJogos: Object.entries(D.stats.counters).filter(([k]) => k.startsWith('game:')).sort((a, b) => b[1] - a[1]).slice(0, 5)
  });
});

// ---------------- verificação automática de canais ----------------
let healthRunning = false;
async function runHealth() {
  if (healthRunning) return;
  healthRunning = true;
  try {
    const results = await health.checkAll(D.catalog.items.filter((i) => i.enabled !== false), 6);
    D.health = { checkedAt: Date.now(), results };
    for (const it of D.catalog.items) {
      const r = results[it.id];
      if (it.type === 'youtube' && r && r.channelId) D.yt[it.handle] = { channelId: r.channelId, live: !!r.live, at: Date.now(), liveAt: Date.now() };
    }
    db.save();
    const bad = Object.values(results).filter((r) => !r.ok).length;
    console.log('[canais] verificados: ' + Object.keys(results).length + ', com problema: ' + bad);
  } finally { healthRunning = false; }
}

// ---------------- servidor ----------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (p.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = p.match(r.re);
      if (!m) continue;
      const params = {}; r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      try {
        const body = req.method === 'GET' ? {} : await readBody(req);
        await r.handler(req, res, body, params, url.searchParams);
      } catch (e) {
        console.error('[erro]', req.method, p, e);
        if (!res.headersSent) fail(res, 500, 'Erro interno.');
      }
      return;
    }
    return fail(res, 404, 'Rota não encontrada.');
  }
  if (p === '/tv' || p === '/admin') { res.writeHead(301, { Location: p + '/' + url.search }); return res.end(); }
  if (p.startsWith('/tv/')) return serveStatic(res, APP_DIR, p.slice(4) || 'index.html');
  if (p.startsWith('/admin/')) return serveStatic(res, ADMIN_DIR, p.slice(7) || 'index.html');
  if (p === '/health') return send(res, 200, { ok: true });
  // ads.txt exigido pelo Google AdSense (gerado a partir do Painel do Dono)
  if (p === '/ads.txt') {
    const m = /^ca-pub-(\d+)$/.exec(D.settings.adsensePublisherId || '');
    return send(res, m ? 200 : 404, m ? 'google.com, pub-' + m[1] + ', DIRECT, f08c47fec0942fa0\n' : '');
  }
  if (p === '/privacidade' || p === '/privacidade/') return serveStatic(res, SITE_DIR, 'privacidade.html');
  return serveStatic(res, SITE_DIR, p === '/' ? 'index.html' : p.slice(1));
});

if (require.main === module) {
  server.listen(PORT, () => {
    const line = '─'.repeat(58);
    console.log('\n' + line);
    console.log('  ' + D.settings.productName + ' rodando!');
    console.log('  Página de vendas:  http://localhost:' + PORT + '/');
    console.log('  App da TV:         http://localhost:' + PORT + '/tv/');
    console.log('  Painel do Dono:    http://localhost:' + PORT + '/admin/');
    for (const ip of lanIps()) console.log('  Na TV (mesma rede Wi-Fi): http://' + ip + ':' + PORT + '/tv/');
    if (SETUP_CODE) console.log('\n  >>> CÓDIGO DE PRIMEIRO ACESSO DO PAINEL: ' + SETUP_CODE + ' <<<');
    console.log(line + '\n');
  });
  // Verificação de canais: 20s após iniciar e depois a cada 6 horas (zero tokens de IA)
  if (!process.env.NO_HEALTH) {
    setTimeout(() => runHealth().catch((e) => console.error('[canais]', e.message)), 20000);
    setInterval(() => runHealth().catch((e) => console.error('[canais]', e.message)), 6 * 3600e3);
  }
  const shutdown = () => { try { db.saveNow(); } catch (e) {} process.exit(0); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}

function lanIps() {
  const out = [];
  for (const list of Object.values(require('os').networkInterfaces())) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) out.push(n.address);
  return out;
}

module.exports = { server, db, D, approveOrder, userStatus, getSetupCode: () => SETUP_CODE };

/*
 * Accioly Play — aplicativo principal (telas, contas, assinatura).
 */
(function () {
  var CFG = window.APP_CONFIG || {};
  var isFile = location.protocol === 'file:';
  var API = (CFG.serverUrl || '').replace(/\/$/, '');
  var LOCAL = CFG.localMode === true || (CFG.localMode === 'auto' && isFile && !API);
  // Vitrine (pendrive/APK de demonstração): acesso total por alguns minutos, depois convite para assinar
  // Nas versões públicas o dono libera tudo NO SEU aparelho com o código secreto (js/dono.js)
  var DONO_OK = (function () {
    try { var c = JSON.parse(localStorage.getItem('ap_dono_code') || 'null'); return !!(c && CFG.donoHash && window.Dono && Dono.hash(c) === CFG.donoHash); } catch (e) { return false; }
  })();
  var DEMO = LOCAL && CFG.demo === true && !DONO_OK;
  var root = document.getElementById('root');
  var overlay = document.getElementById('overlay');

  var DEFAULT_SETTINGS = {
    productName: CFG.name || 'Accioly Play', trialDays: 3, promoPrice: 15.99, regularPrice: 24.9, promoSlots: 50,
    promoRemaining: 50, planDays: 30, freeChannels: true, pixEnabled: false, mpEnabled: false, supportWhatsapp: '',
    announcement: '', heroTitle: '', heroText: ''
  };

  var S = {
    settings: DEFAULT_SETTINGS, catalog: window.CATALOG || { categories: [], items: [] }, gameOverrides: {},
    user: null, token: null, online: true, tab: 'inicio', lastFocus: null, modalOpen: false, poll: null
  };

  // ---------------- utilidades ----------------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function money(v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); }
  function fmtDate(ts) { var d = new Date(ts); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function daysLeft(ts) { return Math.max(0, Math.ceil((ts - Date.now()) / 86400000)); }

  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  function api(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    if (S.token) headers.Authorization = 'Bearer ' + S.token;
    return fetch(API + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var e = new Error(j.error || ('Erro ' + r.status)); e.status = r.status; throw e; }
          return j;
        });
      });
  }

  function track(type, id, value) {
    if (LOCAL || !S.online) return;
    try {
      fetch(API + '/api/events', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: S.token ? 'Bearer ' + S.token : '' },
        body: JSON.stringify({ type: type, id: id, value: value }) }).catch(function () {});
    } catch (e) {}
  }

  // ---------------- acesso ----------------
  // Minutos de acesso total que ainda restam na vitrine (o teste recomeça 7 dias depois)
  function demoLeft() {
    if (!DEMO) return 0;
    var st = lsGet('ap_demo', 0), now = Date.now(), total = (Number(CFG.demoMinutes) || 30) * 60000;
    if (!st || now - st > 7 * 86400000) { st = now; lsSet('ap_demo', st); }
    // Relógio do aparelho voltou no tempo (TV Box sem bateria): não vira demonstração infinita
    if (st > now + 60000) return 0;
    return Math.min(total, Math.max(0, st + total - now));
  }
  function access() {
    if (DEMO) return { tv: true, premium: demoLeft() > 0 };
    if (LOCAL) return { tv: true, premium: true };
    if (!S.online) return { tv: true, premium: false };
    var u = S.user;
    if (!u) return { tv: false, premium: false };
    var paid = u.status === 'trial' || u.status === 'active';
    return { tv: paid || !!S.settings.freeChannels, premium: paid };
  }

  function games() {
    return GameHub.list().map(function (g) {
      var o = S.gameOverrides[g.id] || {};
      return { id: g.id, name: g.name, emoji: g.emoji, color: g.color, desc: g.desc, help: g.help, trending: !!g.trending, shooter: !!g.shooter,
        premium: o.premium != null ? o.premium : !!g.premium, enabled: o.enabled !== false, kind: 'game' };
    }).filter(function (g) { return g.enabled && (!isKids() || KIDS_GAMES.indexOf(g.id) >= 0); });
  }

  // ---------------- Perfis (cada pessoa da casa com seus favoritos; perfil Kids protegido por PIN) ----------------
  var AVATARES = ['😀', '😎', '👩', '👨', '👵', '👴', '🧒', '👧', '🦸', '🐱', '🐶', '⚽'];
  function perfis() { var p = lsGet('ap_perfis', null); return p && p.length ? p : [{ id: 'p1', nome: 'Principal', av: '😀', kids: false }]; }
  function perfil() { var id = lsGet('ap_perfil', 'p1'), ps = perfis(); return ps.filter(function (p) { return p.id === id; })[0] || ps[0]; }
  function pk(k) { var p = perfil(); return p.id === 'p1' ? k : k + '_' + p.id; }
  function isKids() { return !!perfil().kids; }
  function homeTab() { return isKids() ? 'kids' : 'inicio'; }

  function favs() { return lsGet(pk('ap_favs'), []); }
  function isFav(id) { return favs().indexOf(id) >= 0; }
  function toggleFav(id) {
    var f = favs(), i = f.indexOf(id);
    if (i >= 0) { f.splice(i, 1); toast('Removido dos favoritos'); } else { f.unshift(id); toast('★ Adicionado aos favoritos'); }
    lsSet(pk('ap_favs'), f.slice(0, 40));
  }
  function pushRecent(id) { var r = lsGet(pk('ap_recent'), []).filter(function (x) { return x !== id; }); r.unshift(id); lsSet(pk('ap_recent'), r.slice(0, 12)); }

  function itemById(id) {
    var it = S.catalog.items.filter(function (x) { return x.id === id; })[0];
    if (it) return it;
    return games().filter(function (g) { return g.id === id; })[0];
  }

  // ---------------- telas ----------------
  function topbar() {
    var u = S.user, pill = '';
    if (DEMO) pill = '<span class="pill trial" id="demopill">' + demoPill() + '</span><button class="tab buy focusable" data-act="buy">⭐ Assinar</button>';
    else if (LOCAL) pill = '<span class="pill active">Modo Dono</span>';
    else if (!S.online) pill = '<span class="pill expired">Offline</span>';
    else if (u && u.status === 'trial') pill = '<span class="pill trial">Teste grátis: ' + daysLeft(u.trialEndsAt) + ' dia(s)</span>';
    else if (u && u.status === 'active') pill = '<span class="pill active">Assinante até ' + fmtDate(u.paidUntil) + '</span>';
    else if (u) pill = '<span class="pill expired">Teste encerrado</span>';
    var tabs = isKids() ? [['kids', 'Início 🧸'], ['jogos', 'Jogos'], ['conta', 'Conta']]
      : [['inicio', 'Início'], ['tv', 'TV ao Vivo'], ['noticias', '📰 Notícias'], ['filmes', 'Filmes'], ['midia', '🎵 Música'], ['jogos', 'Jogos'], ['kids', 'Kids 🧸'], ['conta', 'Conta']];
    return '<header class="topbar"><div class="brand">' + brandHtml() + '</div><nav class="tabs" data-row="tabs">' +
      tabs.map(function (t) { return '<button class="tab focusable' + (S.tab === t[0] ? ' active' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') +
      '</nav><div class="spacer"></div><span class="clock" id="clock">' + clockText() + '</span>' + pill +
      '<button class="tab gear search focusable" data-tab="busca" aria-label="Buscar">🔎</button>' +
      '<button class="tab gear avatar focusable" data-act="perfis" aria-label="Trocar de perfil" title="' + esc(perfil().nome) + '">' + perfil().av + '</button>' +
      '<button class="tab gear focusable" data-act="ajustes" aria-label="Ajustes">⚙️</button></header>';
  }

  function demoPill() {
    var m = Math.ceil(demoLeft() / 60000);
    return m > 0 ? 'Demo · ' + m + ' min' : 'Demonstração';
  }
  // Atualiza o contador e, quando o tempo acaba, mostra o convite (sem interromper vídeo ou jogo)
  if (DEMO) setInterval(function () {
    var p = document.getElementById('demopill');
    if (p) p.textContent = demoPill();
    if (demoLeft() > 0 || S.demoShown) return;
    if (Player.isOpen() || GameHub.isOpen() || MediaPlayer.isOpen() || OptionsSheet.isOpen() || S.modalOpen || !root.querySelector('.topbar')) return;
    S.demoShown = true;
    renderHome();
    openBuy('Acabou o tempo com tudo liberado. Os canais, as notícias e os jogos grátis continuam funcionando.');
  }, 20000);

  function brandHtml() {
    var n = S.settings.productName || 'Accioly Play';
    var parts = n.split(' ');
    if (parts.length < 2) return esc(n);
    return esc(parts.slice(0, -1).join(' ')) + ' <b>' + esc(parts[parts.length - 1]) + '</b>';
  }

  function clockText() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  setInterval(function () { var c = document.getElementById('clock'); if (c) c.textContent = clockText(); }, 15000);

  function tile(it, rowId) {
    var badge, lock = false, acc = access(), sub = '', off = it.status === 'off';
    if (it.kind === 'game') {
      badge = it.premium ? '<span class="badge premium">PREMIUM</span>' : '<span class="badge free">GRÁTIS</span>';
      lock = it.premium && !acc.premium;
      var best = GameHub.best(it.id);
      sub = best ? '🏆 Recorde ' + best : (it.trending ? '🔥 Em alta' : '');
    } else {
      if (off) badge = '<span class="badge off">FORA DO AR</span>';
      else if (it.type === 'link') badge = '<span class="badge app">APP OFICIAL</span>';
      else if (it.type === 'youtube' && it.live === false) badge = '<span class="badge app">▶ VÍDEOS</span>';
      else badge = '<span class="badge live">● AO VIVO</span>';
      lock = !acc.tv;
    }
    var isNew = it.trending || it.novo;
    var cov = coverUrl(it), capa = S.capas && S.capas[it.id];
    if (!sub && capa && capa.t) sub = '▶ ' + capa.t;
    return '<button class="tile focusable' + (off ? ' off' : '') + (cov ? ' has-cover' : '') + '" style="--c:' + esc(it.color || '#334') + '" data-id="' + esc(it.id) + '" data-rowid="' + esc(rowId) + '">' +
      (cov ? coverImg(cov) : '') + badge + (isFav(it.id) ? '<span class="fav">★</span>' : (isNew ? '<span class="ribbon">NOVO</span>' : '')) +
      (it.emoji ? '<span class="emoji">' + it.emoji + '</span>' : '<span class="mono' + ((it.mono || '').length > 3 ? ' sm' : '') + '">' + esc(it.mono || initials(it.name)) + '</span>') +
      '<span class="name">' + esc(it.name) + '</span>' + (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') +
      (it.kind !== 'game' && it.type !== 'link' && channelNumber(it.id) ? '<span class="chnum">' + channelNumber(it.id) + '</span>' : '') +
      (lock ? '<span class="lock">🔒</span>' : '') + '</button>';
  }

  function initials(n) {
    var w = String(n || '').replace(/[^\wÀ-ú!+ ]/g, '').split(/\s+/).filter(Boolean);
    return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase();
  }

  var rowsIndex = {}; // rowId -> lista de itens (para trocar de canal com ▲▼)
  function row(id, title, items) {
    if (!items.length) return '';
    rowsIndex[id] = items;
    return '<section class="row"><h2>' + esc(title) + ' <small>' + items.length + '</small></h2><div class="track" data-row="' + esc(id) + '">' +
      items.map(function (it) { return tile(it, id); }).join('') + '</div></section>';
  }

  // Canais fora do ar vão para o fim da fileira
  function catItems(cat) {
    return S.catalog.items.filter(function (i) { return i.cat === cat && i.enabled !== false; })
      .map(function (it, k) { return { it: it, k: k }; })
      .sort(function (a, b) { return ((a.it.status === 'off') - (b.it.status === 'off')) || (a.k - b.k); })
      .map(function (x) { return x.it; });
  }

  // ---------------- Canais numerados (como na TV a cabo) ----------------
  function allChannels() { return S.catalog.items.filter(function (i) { return i.enabled !== false && i.type !== 'link' && (!isKids() || i.cat === 'infantil' || i.cat === 'educacao'); }); }
  function channelNumber(id) { var l = allChannels(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return i + 1; return 0; }
  function capaTitle(id) { var c = S.capas && S.capas[id]; return c && c.t ? c.t : ''; }

  // ---------------- Seções da tela inicial ----------------
  function playableOn(it) { return it && it.enabled !== false && it.status !== 'off' && it.type !== 'link'; }
  // Transmissões contínuas: sinais oficiais .m3u8 e canais 24h do YouTube
  function liveNowItems() {
    return S.catalog.items.filter(function (i) { return playableOn(i) && (i.type === 'hls' || i.live === true); }).slice(0, 16);
  }
  // Top 10: o que mais estão vendo/jogando no servidor, completado por uma seleção da casa
  var TOP_CASA = ['sbt', 'capivara', 'cnnbrasil', 'globo', 'penaltis', 'cazetv', 'esquadrilha', 'galinha', 'record', 'frutas', 'sbtnews', 'operacao3d'];
  function topItems() {
    var out = [], seen = {};
    function add(it) { if (it && !seen[it.id] && (it.kind === 'game' || playableOn(it))) { seen[it.id] = 1; out.push(it); } }
    (S.trending || []).forEach(function (t) { add(itemById(t.id)); });
    TOP_CASA.forEach(function (id) { add(itemById(id)); });
    return out.slice(0, 10);
  }
  function topRow() {
    var items = topItems();
    if (!items.length) return '';
    rowsIndex.top10 = items;
    return '<section class="row top10row"><h2>⭐ Top 10 hoje no Accioly</h2><div class="track" data-row="top10">' +
      items.map(function (it, i) { return '<div class="rankwrap"><span class="rank" aria-hidden="true">' + (i + 1) + '</span>' + tile(it, 'top10') + '</div>'; }).join('') + '</div></section>';
  }
  // "Porque você assistiu/jogou..." (como nos grandes streamings)
  function becauseRow(base) {
    if (!base) return '';
    var list;
    if (base.kind === 'game') list = games().filter(function (g) { return g.id !== base.id && (g.shooter === base.shooter || g.trending === base.trending); });
    else list = S.catalog.items.filter(function (i) { return i.id !== base.id && i.cat === base.cat && playableOn(i); });
    return row('porque', '💡 Porque você ' + (base.kind === 'game' ? 'jogou ' : 'assistiu ') + base.name, list.slice(0, 12));
  }
  function familyItems() {
    var kidsCh = catItems('infantil').filter(playableOn).slice(0, 6);
    var g = games().filter(function (x) { return KIDS_GAMES.indexOf(x.id) >= 0; }).slice(0, 6);
    var out = [];
    for (var i = 0; i < Math.max(kidsCh.length, g.length); i++) { if (kidsCh[i]) out.push(kidsCh[i]); if (g[i]) out.push(g[i]); }
    return out;
  }

  // ---------------- Capas reais ----------------
  // Jogos: foto real do jogo (img/jogos). Canais do YouTube: miniatura oficial do vídeo mais recente.
  var CAPAS_RAW = CFG.capasUrl || 'https://raw.githubusercontent.com/guiguitdp-dev/Accioly01/noticias-dados/capas.json';
  function coverUrl(it) {
    if (it.kind === 'game') return 'img/jogos/' + it.id + '.jpg';
    var c = S.capas && S.capas[it.id];
    return c && /^[\w-]{11}$/.test(c.v) ? 'https://i.ytimg.com/vi/' + c.v + '/mqdefault.jpg' : '';
  }
  function coverImg(url) { return '<img class="cover" src="' + esc(url) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove(\'has-cover\');this.remove()">'; }
  function loadCapas() {
    var memo = lsGet('ap_capas', null);
    if (memo && memo.items) S.capas = memo.items;
    if (memo && Date.now() - (memo.at || 0) < 2 * 3600e3) return;
    var url = (LOCAL || !S.online) ? CAPAS_RAW : API + '/api/capas';
    fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (d) {
      if (!d || !d.items) return;
      S.capas = d.items;
      lsSet('ap_capas', { at: Date.now(), items: d.items });
      applyCovers(root);
    }).catch(function () {});
  }
  // Capas que chegaram depois da tela pronta: entram sem redesenhar (o foco não pula)
  function applyCovers(scope) {
    (scope || root).querySelectorAll('.tile[data-id]:not(.has-cover)').forEach(function (b) {
      var it = itemById(b.getAttribute('data-id'));
      var u = it && coverUrl(it);
      if (!u) return;
      b.classList.add('has-cover');
      b.insertAdjacentHTML('afterbegin', coverImg(u));
      var c = S.capas && S.capas[it.id];
      if (c && c.t && !b.querySelector('.sub')) b.insertAdjacentHTML('beforeend', '<span class="sub">▶ ' + esc(c.t) + '</span>');
    });
  }

  var KIDS_GAMES = ['capivara', 'blocos', 'memoria', 'cobrinha', 'frutas', 'velha', 'quebrablocos', 'meteoros', 'corrida', 'pingpong', 'penaltis'];

  // "Em alta": o que mais estão assistindo/jogando no servidor + jogos novos em alta
  function trendingItems() {
    var out = [], seen = {};
    function add(it) { if (it && !seen[it.id] && it.status !== 'off') { seen[it.id] = 1; out.push(it); } }
    (S.trending || []).forEach(function (t) { add(itemById(t.id)); });
    games().filter(function (g) { return g.trending; }).forEach(add);
    return out.slice(0, 14);
  }

  // Destaques que giram sozinhos no topo (param enquanto o foco estiver neles)
  function heroSlides() {
    var st = S.settings;
    return [
      { kicker: 'AO VIVO', title: st.heroTitle || 'Sua TV mais divertida: canais ao vivo, notícias e jogos.', text: st.heroText || 'TV aberta, notícias 24h, esportes e desenhos de fontes oficiais e gratuitas. É só escolher e apertar OK.', c1: '#7c5cff', c2: '#ff7a45' },
      { kicker: 'NOVIDADE', title: '📰 Notícias do dia, de hora em hora', text: 'O que acontece no Brasil e no mundo, sempre atualizado. Ouça o resumo em voz alta ou leia a matéria no celular.', c1: '#0ea5e9', c2: '#6366f1', tab: 'noticias', btn: '📰 Ver as notícias' },
      { kicker: 'LANÇAMENTO', title: '🎵 Música e Vídeos', text: 'Busque músicas e clipes, veja o que está em alta no Brasil e ouça um atrás do outro. Tem até música livre sem anúncios.', c1: '#22c55e', c2: '#0ea5e9', tab: 'midia', btn: '🎵 Ouvir agora' },
      { kicker: 'JOGOS EM ALTA', title: '🦫 Corre Capivara, ⚽ Pênaltis e mais 15 jogos', text: 'Jogue com o controle da TV, sozinho ou em família. Tem tiro retrô, quiz, pênaltis e recordes para bater.', c1: '#f59e0b', c2: '#ef4444', tab: 'jogos', btn: '🎮 Jogar agora' },
      { kicker: 'KIDS', title: '🧸 Cantinho Kids', text: 'Desenhos oficiais e jogos fáceis para a criançada. Tudo num lugar só, sem complicação.', c1: '#ec4899', c2: '#8b5cf6', tab: 'kids', btn: '🧸 Abrir o Kids' }
    ];
  }
  // Imagem real de fundo para cada destaque (capa do canal ao vivo, foto da notícia, tela do jogo)
  function heroCover(i) {
    if (i === 0) { var live = liveNowItems().concat(topItems()).filter(function (x) { return x.kind !== 'game' && coverUrl(x); })[0]; return live ? coverUrl(live).replace('mqdefault', 'hqdefault') : ''; }
    if (i === 1) { var n = S.news && (S.news.top || []).filter(function (x) { return x.img; })[0]; return n ? n.img : ''; }
    if (i === 2) { var m = itemById('musicamultishow') || itemById('kondzilla'); return m && coverUrl(m) ? coverUrl(m).replace('mqdefault', 'hqdefault') : ''; }
    if (i === 3) return 'img/jogos/capivara.jpg';
    if (i === 4) { var k = itemById('galinha') || itemById('luna'); return k && coverUrl(k) ? coverUrl(k).replace('mqdefault', 'hqdefault') : 'img/jogos/frutas.jpg'; }
    return '';
  }
  function heroHtml() {
    var st = S.settings, acc = access(), s = heroSlides()[S.heroIdx || 0], bg = heroCover(S.heroIdx || 0);
    var cta = '';
    if (DEMO) cta = '<button class="btn hot focusable" data-act="buy">⭐ Quero assinar</button>';
    if (!LOCAL && S.online && S.user && !acc.premium) cta = '<button class="btn hot focusable" data-act="paywall">Assinar por ' + money(st.promoRemaining > 0 ? st.promoPrice : st.regularPrice) + '/mês</button>';
    return '<section class="hero' + (bg ? ' has-bg' : '') + '" id="hero" style="--h1:' + s.c1 + ';--h2:' + s.c2 + '">' +
      (bg ? '<img class="hero-bg" src="' + esc(bg) + '" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove(\'has-bg\');this.remove()">' : '') + '<span class="kicker">' + esc(s.kicker) + '</span><h1>' + esc(s.title) + '</h1><p>' + esc(s.text) + '</p><div class="actions" data-row="hero">' +
      '<button class="btn primary focusable" data-act="watch">▶ Assistir agora</button>' +
      (s.tab ? '<button class="btn ghost focusable" data-tab="' + s.tab + '">' + esc(s.btn) + '</button>' : '<button class="btn ghost focusable" data-tab="jogos">🎮 Jogar</button>') + cta + '</div>' +
      '<div class="dots">' + heroSlides().map(function (x, i) { return '<i' + (i === (S.heroIdx || 0) ? ' class="on"' : '') + '></i>'; }).join('') + '</div></section>';
  }
  setInterval(function () {
    var h = document.getElementById('hero');
    if (!h || h.contains(document.activeElement) || S.modalOpen || S.tab !== 'inicio') return;
    S.heroIdx = ((S.heroIdx || 0) + 1) % heroSlides().length;
    var tmp = document.createElement('div'); tmp.innerHTML = heroHtml();
    h.replaceWith(tmp.firstChild);
    bindRoot(document.getElementById('hero'));
  }, 8000);

  // Atalhos para tudo o que o app tem (para ninguém deixar de achar)
  function quickRow() {
    var q = [['data-tab="noticias"', '📰', 'Notícias do dia', 'de hora em hora', '#0ea5e9'],
      News.canSpeak() ? ['data-act="nbrief"', '🔊', 'Ouvir o resumo', 'notícias em voz alta', '#6366f1'] : null,
      ['data-tab="tv"', '📡', 'TV ao vivo', 'oficial e grátis', '#e11d48'],
      ['data-act="multi"', '🖥️', 'Multitela', 'até 4 canais juntos', '#0f766e'],
      ['data-act="surpresa"', '🎲', 'Surpreenda-me', 'um canal ao acaso', '#a855f7'],
      ['data-tab="busca"', '🔎', 'Buscar', 'canal, jogo, notícia', '#334155'],
      ['data-tab="midia"', '🎵', 'Música e vídeos', 'clipes e sucessos', '#22c55e'],
      ['data-tab="jogos"', '🎮', '17 jogos', 'no controle remoto', '#f59e0b'],
      ['data-tab="kids"', '🧸', 'Kids', 'desenhos e joguinhos', '#ec4899'],
      ['data-act="ajustes"', '⚙️', 'Ajustes', 'letra maior, som', '#64748b']].filter(Boolean);
    return '<section class="row"><h2>⚡ Atalhos rápidos</h2><div class="track" data-row="atalhos">' + q.map(function (x) {
      return '<button class="tile qk focusable" style="--c:' + x[4] + '" ' + x[0] + '><span class="emoji">' + x[1] + '</span><span class="name">' + x[2] + '</span><span class="sub">' + x[3] + '</span></button>';
    }).join('') + '</div></section>';
  }

  function renderHome() {
    rowsIndex = {};
    if (isKids() && ['kids', 'jogos', 'conta', 'busca'].indexOf(S.tab) < 0) S.tab = 'kids';
    if (S.briefing && S.tab !== 'noticias') { News.stop(); S.briefing = false; }
    var html = topbar();
    var st = S.settings;
    if (!S.online && !LOCAL) html += '<div class="banner">Sem conexão com o servidor agora. Os canais e os jogos grátis continuam funcionando.</div>';
    if (st.announcement) html += '<div class="banner">' + esc(st.announcement) + '</div>';
    if (DEMO && S.tab === 'inicio') html += '<div class="banner demo" data-act="buy">' + (demoLeft() > 0
      ? '🎁 <b>Tudo liberado</b> por mais ' + Math.ceil(demoLeft() / 60000) + ' minutos: jogos premium, música, vídeos e notícias. Gostou? Toque aqui e assine.'
      : '⭐ <b>Gostou?</b> Assine e libere de novo os jogos premium, a música e os vídeos. Canais, notícias e jogos grátis seguem liberados. Toque aqui.') + '</div>';
    if (S.tab === 'inicio' && /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.navigator.standalone && !lsGet('ap_ios_ok', false))
      html += '<div class="banner" data-act="iosok">📲 Coloque na tela do iPhone: toque em <b>Compartilhar</b> (quadrado com seta ⬆️) e depois em <b>Adicionar à Tela de Início</b>. Abre em tela cheia, como um app. (toque aqui para fechar)</div>';
    var cats = S.catalog.categories;
    var catName = function (id) { var c = cats.filter(function (x) { return x.id === id; })[0]; return c ? c.name : id; };

    if (S.tab === 'inicio') {
      html += heroHtml();
      var r = lsGet(pk('ap_recent'), []).map(itemById).filter(Boolean);
      html += row('recent', '▶ Continuar de onde parou', r);
      html += becauseRow(r[0]);
      html += row('aovivo', '🔴 Ao vivo agora', liveNowItems());
      html += topRow();
      html += '<div id="homenews"></div>';
      html += quickRow();
      var f = favs().map(itemById).filter(Boolean);
      html += row('favs', '★ Meus Favoritos', f);
      html += row('jalta', '🔥 Jogos em alta — é só pegar o controle', games().filter(function (g) { return g.trending && !g.shooter; }));
      html += row('tiro', '🔫 Tiro retrô — o clima do fliperama na sua TV', games().filter(function (g) { return g.shooter; }));
      html += Ads.banner();
      html += row('familia', '👨‍👩‍👧 Para curtir em família', familyItems());
      html += row('abertos', catName('abertos'), catItems('abertos'));
      html += row('jogos', '🎮 Todos os jogos no controle remoto', games());
      cats.forEach(function (c) { if (c.id !== 'abertos') html += row(c.id, c.name, catItems(c.id)); });
    } else if (S.tab === 'kids') {
      html += '<section class="hero" style="padding:1.6rem 2.2rem"><h1 style="font-size:2rem">Cantinho Kids 🧸</h1><p style="margin:0">Desenhos oficiais e jogos fáceis para a criançada. Tudo num lugar só.</p></section>';
      html += row('infantil', '📺 Desenhos e canais infantis', catItems('infantil'));
      html += row('kidsgames', '🎮 Jogos para os pequenos', games().filter(function (g) { return KIDS_GAMES.indexOf(g.id) >= 0; }));
      html += row('educacao', '📚 Aprender brincando', catItems('educacao'));
    } else if (S.tab === 'tv') {
      cats.forEach(function (c) { if (c.id !== 'filmes') html += row(c.id, c.name, catItems(c.id)); });
    } else if (S.tab === 'midia') {
      html += mediaTabHtml();
    } else if (S.tab === 'busca') {
      html += '<form class="searchbar" id="bsf" data-row="busca" autocomplete="off">' +
        '<input class="focusable" id="bq" name="q" type="search" placeholder="Buscar canal, jogo ou notícia…" value="' + esc(S.buscaQ || '') + '">' +
        '<button class="btn primary focusable" type="submit">Buscar</button></form><div id="brows"></div>';
    } else if (S.tab === 'noticias') {
      html += '<div id="nrows"><div class="spinner"></div></div>';
    } else if (S.tab === 'filmes') {
      html += row('filmes', catName('filmes'), catItems('filmes'));
      html += '<p class="note" style="margin:0 var(--safe)">Serviços gratuitos e legais. Ao escolher um, abrimos o app ou o site oficial dele.</p>';
    } else if (S.tab === 'jogos') {
      var all = games(), grid = function (id, title, list) {
        if (!list.length) return '';
        rowsIndex[id] = list;
        return '<section class="row"><h2>' + esc(title) + ' <small>' + list.length + '</small></h2><div class="grid">' + list.map(function (g) { return tile(g, id); }).join('') + '</div></section>';
      };
      html += '<p class="note" style="margin:0 var(--safe) .6rem">🎮 Jogue com o controle remoto da TV, com um controle de videogame ou, no celular, pelo controle na tela.</p>';
      html += grid('jtiro', '🔫 Tiro e Ação retrô', all.filter(function (g) { return g.shooter; }));
      html += grid('jnovos', '🔥 Lançamentos', all.filter(function (g) { return g.trending && !g.shooter; }));
      html += grid('jclassicos', '🕹️ Clássicos de sempre', all.filter(function (g) { return !g.trending && !g.shooter; }));
    } else if (S.tab === 'conta') {
      html += '<div class="inline" style="margin:0 var(--safe) 1rem" data-row="aj"><button class="btn primary focusable" data-act="ajustes">⚙️ Ajustes: letra maior, visual, som e legendas</button></div>';
      html += accountHtml();
    }
    root.innerHTML = html;
    root.scrollTop = 0;
    bindRoot();
    Ads.fillBanners(root);
    if (S.tab === 'midia') loadMedia();
    if (S.tab === 'noticias') loadNews();
    if (S.tab === 'inicio') loadHomeNews();
    if (S.tab === 'busca') initBusca();
    var kf = root.querySelector('#keyf');
    if (kf) kf.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = String(kf.querySelector('[name=ytkey]').value || '').trim();
      if (!v || v.indexOf('•') >= 0) return toast('Cole a chave do YouTube (começa com AIza)');
      LocalMedia.setKey(v); S.mediaHome = null; toast('Chave salva neste aparelho ✅');
    });
    var first = root.querySelector('.tab.active');
    var target = (S.lastFocusSel && root.querySelector(S.lastFocusSel)) || root.querySelector('.hero .btn') || root.querySelector('.tile') || first;
    S.lastFocusSel = null;
    Input.focus(target);
  }

  // ---------------- Música e Vídeos ----------------
  function mediaTile(it, rowId) {
    return '<button class="tile media focusable" style="--c:#1f2937;' + (it.thumb ? 'background-image:url(' + esc(it.thumb) + ')' : '') + '" data-id="' + esc(it.id) + '" data-rowid="' + esc(rowId) + '">' +
      (it.kind === 'yt' ? (it.live ? '<span class="badge live">● AO VIVO</span>' : '<span class="badge app">▶ YOUTUBE</span>') : '<span class="badge free">SEM ANÚNCIOS</span>') +
      '<span class="name">' + esc(it.title) + '</span><span class="sub">' + esc(it.channel || '') + (it.duration && it.duration !== 'AO VIVO' ? ' · ' + esc(it.duration) : '') + '</span></button>';
  }
  function mediaRow(id, title, items, kind) {
    if (!items || !items.length) return '';
    items.forEach(function (x) { x.kind = kind; });
    rowsIndex[id] = items;
    return '<section class="row"><h2>' + esc(title) + '</h2><div class="track" data-row="' + esc(id) + '">' + items.map(function (it) { return mediaTile(it, id); }).join('') + '</div></section>';
  }
  function mediaTabHtml() {
    var tipo = S.mediaTipo || 'music';
    return '<form class="searchbar" id="msf" data-row="busca" autocomplete="off">' +
      '<input class="focusable" id="mq" name="q" type="search" placeholder="Buscar música, artista ou vídeo…" value="' + esc(S.mediaQuery || '') + '">' +
      '<button class="btn ghost focusable" type="button" data-act="mtipo">' + (tipo === 'music' ? '🎵 Músicas' : '🎬 Vídeos') + '</button>' +
      '<button class="btn primary focusable" type="submit">Buscar</button></form>' +
      '<div id="mrows"><div class="spinner"></div></div>';
  }
  function loadMedia() {
    var box = root.querySelector('#mrows');
    var f = root.querySelector('#msf');
    if (f) f.addEventListener('submit', function (e) { e.preventDefault(); searchMedia(root.querySelector('#mq').value); });
    var offline = LOCAL || !S.online;
    var fresh = S.mediaHome && Date.now() - S.mediaHome.at < 600000;
    (fresh ? Promise.resolve(S.mediaHome.data) : (offline ? LocalMedia.home() : api('GET', '/api/media/home'))).then(function (d) {
      if (!fresh) S.mediaHome = { at: Date.now(), data: d };
      if (S.tab !== 'midia' || !root.querySelector('#mrows')) return;
      drawMedia(d);
      if (S.pendingMedia) { var pq = S.pendingMedia; S.pendingMedia = null; var mi = root.querySelector('#mq'); if (mi) mi.value = pq; searchMedia(pq); }
    }).catch(function () { box.innerHTML = '<p class="note" style="margin:0 var(--safe)">Não foi possível carregar agora. Tente de novo em instantes.</p>'; });
  }
  function drawMedia(home) {
    var box = root.querySelector('#mrows'), r = S.mediaResults, html = '';
    if (r) {
      html += mediaRow('mres', '🔎 "' + S.mediaQuery + '" no YouTube', r.youtube, 'yt');
      html += mediaRow('mfres', '🎧 "' + S.mediaQuery + '" — Música livre (sem anúncios)', r.free, 'audio');
      if (!r.youtube.length && !r.free.length) html += '<p class="note" style="margin:0 var(--safe) 1.4rem">Nada encontrado para "' + esc(S.mediaQuery) + '".</p>';
    }
    if (!home.youtube) html += '<div class="banner">' + (home.local ? 'Para buscar e ver o que está em alta no YouTube, cole sua chave grátis da YouTube Data API em <b>Conta → Chave do YouTube</b>.' : 'A busca do YouTube ainda não foi ativada pelo dono (Painel do Dono → Configurações → YouTube).') + '</div>';
    html += mediaRow('mmusic', '🎵 Músicas em alta no Brasil', home.music, 'yt');
    html += mediaRow('mvideos', '🔥 Vídeos em alta no Brasil', home.videos, 'yt');
    html += mediaRow('mfree', '🎧 Música livre em alta — sem anúncios', home.free, 'audio');
    html += '<p class="note" style="margin:0 var(--safe) 2rem">Vídeos tocam no player oficial do YouTube. "Música livre" são faixas liberadas pelos próprios artistas (Audius), sem anúncios.</p>';
    box.innerHTML = html;
    box.querySelectorAll('.tile').forEach(function (b) { b.addEventListener('click', function () { openItem(b.getAttribute('data-id'), b.getAttribute('data-rowid')); }); });
  }
  function searchMedia(q) {
    q = String(q || '').trim();
    if (q.length < 2) return toast('Digite pelo menos 2 letras para buscar');
    S.mediaQuery = q;
    var box = root.querySelector('#mrows');
    box.innerHTML = '<div class="spinner"></div>';
    var tipo = S.mediaTipo === 'videos' ? 'videos' : 'music';
    ((LOCAL || !S.online) ? LocalMedia.search(q, tipo) : api('GET', '/api/media/search?q=' + encodeURIComponent(q) + '&tipo=' + tipo)).then(function (r) {
      S.mediaResults = r;
      drawMedia((S.mediaHome && S.mediaHome.data) || { youtube: true, music: [], videos: [], free: [] });
      var first = root.querySelector('#mrows .tile');
      if (first) Input.focus(first);
    }).catch(function (e) { box.innerHTML = '<p class="err" style="margin:0 var(--safe)">' + esc(e.message) + '</p>'; });
  }


  // ---------------- Notícias do dia a dia ----------------
  function newsBase() { return (LOCAL || !S.online) ? null : API; }
  function newsTile(n, rowId, i) {
    return '<button class="tile ntile focusable" style="--c:#13203d" data-nrow="' + esc(rowId) + '" data-i="' + i + '">' +
      (n.img ? '<img class="nimg" src="' + esc(n.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '') +
      '<span class="badge news">' + esc(n.src) + '</span><span class="name">' + esc(n.t) + '</span><span class="sub">' + esc(News.ago(n.d)) + '</span></button>';
  }
  function newsRow(id, title, items) {
    if (!items || !items.length) return '';
    S.newsRows = S.newsRows || {};
    S.newsRows[id] = items;
    return '<section class="row"><h2>' + esc(title) + ' <small>' + items.length + '</small></h2><div class="track" data-row="' + esc(id) + '">' +
      items.map(function (n, i) { return newsTile(n, id, i); }).join('') + '</div></section>';
  }
  function loadHomeNews() {
    News.load(newsBase()).then(function (d) {
      S.news = d;
      var el = root.querySelector('#homenews');
      if (!el || S.tab !== 'inicio') return;
      el.innerHTML = newsRow('hnews', '📰 Últimas notícias — Brasil e mundo', (d.top || []).slice(0, 12));
      bindRoot(el);
    }).catch(function () {});
  }
  function loadNews(force) {
    News.load(newsBase(), force).then(function (d) {
      S.news = d;
      if (S.tab === 'noticias' && root.querySelector('#nrows')) drawNews(d);
    }).catch(function () {
      var box = root.querySelector('#nrows');
      if (box) box.innerHTML = '<p class="note" style="margin:0 var(--safe)">Não deu para carregar as notícias agora. Confira a internet e tente de novo. Enquanto isso, veja os canais de notícias ao vivo:</p>' +
        '<div class="inline" style="margin:1rem var(--safe)" data-row="nerr"><button class="btn primary focusable" data-act="nrefresh">🔄 Tentar de novo</button></div>' + row('nlive', '📺 Notícias ao vivo agora', catItems('noticias'));
      if (box) bindRoot(box);
    });
  }
  function drawNews(d) {
    var box = root.querySelector('#nrows');
    var srcs = {};
    d.sections.forEach(function (s) { s.items.forEach(function (n) { srcs[n.src] = 1; }); });
    var html = '<div class="newshead"><div><h1>📰 Notícias do dia</h1><p class="note">Brasil e mundo, de hora em hora · atualizado ' + esc(News.ago(d.updatedAt)) + ' · ' + d.total + ' notícias de ' + esc(Object.keys(srcs).slice(0, 8).join(', ')) + '</p></div>' +
      '<div class="inline" data-row="nhead">' + (News.canSpeak() ? '<button class="btn primary focusable" data-act="nbrief">' + (S.briefing ? '⏹ Parar resumo' : '🔊 Ouvir o resumo do dia') + '</button>' : '') +
      '<button class="btn ghost focusable" data-act="nrefresh">🔄 Atualizar</button></div></div>';
    html += row('nlive', '📺 Notícias ao vivo agora', catItems('noticias'));
    html += newsRow('ntop', '⚡ Destaques de agora', d.top);
    d.sections.forEach(function (s) { html += newsRow('n_' + s.id, s.title, s.items); });
    html += '<p class="note" style="margin:0 var(--safe) 2rem">Títulos e resumos vêm dos próprios jornais e portais (feeds oficiais). Para ler a matéria completa, abra no site ou aponte o celular para o QR Code.</p>';
    box.innerHTML = html;
    bindRoot(box);
  }
  function curNews() { var c = S.newsCur; return c && (S.newsRows[c.row] || [])[c.i]; }
  function openNews(rowId, i) {
    var list = (S.newsRows || {})[rowId] || [], n = list[i];
    if (!n) return;
    var keep = S.modalOpen ? S.lastFocus : null;
    News.stop(); S.briefing = false;
    openModal((n.img ? '<img class="nhero" src="' + esc(n.img) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : '') +
      '<p class="nmeta"><span class="badge news">' + esc(n.src) + '</span> ' + esc(News.ago(n.d)) + '</p>' +
      '<h2>' + esc(n.t) + '</h2>' + (n.s ? '<p class="nsum">' + esc(n.s) + '</p>' : '') + '<div id="nqrbox"></div>' +
      '<div class="inline" data-row="nd">' + (News.canSpeak() ? '<button class="btn primary focusable" data-act="nspeak">🔊 Ouvir</button>' : '') +
      '<button class="btn ghost focusable" data-act="nqr">📱 Ler no celular</button>' +
      '<button class="btn ghost focusable" data-act="nopen">↗ Abrir no site</button>' +
      (i < list.length - 1 ? '<button class="btn ghost focusable" data-act="nnext">Próxima ▶</button>' : '') +
      '<button class="btn ghost focusable" data-act="close">Voltar</button></div>' +
      '<p class="note">Fonte: ' + esc(n.src) + '. Resumo publicado pelo próprio veículo. Para ler tudo, use "Ler no celular".</p>', function () { News.stop(); });
    if (keep) S.lastFocus = keep;
    S.newsCur = { row: rowId, i: i };
    track('news', rowId.replace(/^n_/, ''));
  }
  // A leitura terminou sozinha: o botão volta a "Ouvir"
  function briefingDone() {
    S.briefing = false;
    var b = root.querySelector('#nrows [data-act=nbrief]');
    if (b) b.textContent = '🔊 Ouvir o resumo do dia';
  }
  function newsAct(act, el) {
    var n = curNews();
    if (act === 'nbrief' && el.classList.contains('qk')) {
      toast('🔊 Preparando o resumo do dia…');
      return News.load(newsBase()).then(function (d) {
        S.news = d;
        // Se a pessoa já foi assistir/jogar enquanto carregava, não fala por cima
        if (S.tab !== 'inicio' || Player.isOpen() || GameHub.isOpen() || MediaPlayer.isOpen() || S.modalOpen) return;
        if (!News.speak(News.briefing(d), briefingDone)) return toast('Este aparelho não lê em voz alta, mas você pode ler na tela.');
        S.briefing = true; toast('🔊 Lendo as principais notícias do dia… Para parar, vá na aba Notícias.');
      }).catch(function () { toast('Não deu para carregar as notícias. Confira a internet e tente de novo.'); });
    }
    if (act === 'nbrief') {
      if (S.briefing) { News.stop(); S.briefing = false; el.textContent = '🔊 Ouvir o resumo do dia'; return; }
      if (!S.news || !News.speak(News.briefing(S.news), briefingDone)) return toast('Este aparelho não lê em voz alta, mas você pode ler na tela.');
      S.briefing = true; el.textContent = '⏹ Parar resumo'; return toast('🔊 Lendo as principais notícias do dia…');
    }
    if (act === 'nrefresh') { var b = root.querySelector('#nrows'); if (b) b.innerHTML = '<div class="spinner"></div>'; return loadNews(true); }
    if (!n) return;
    if (act === 'nspeak') { if (!News.speak(n.t + '. ' + (n.s || '') + ' Fonte: ' + n.src + '.')) toast('Este aparelho não lê em voz alta, mas você pode ler na tela.'); return; }
    if (act === 'nopen') return openExternal(n.u);
    if (act === 'nnext') {
      openNews(S.newsCur.row, S.newsCur.i + 1);
      // Continua no "Próxima" para passar várias notícias seguidas com o controle
      var nb = overlay.querySelector('[data-act=nnext]') || overlay.querySelector('[data-act=close]');
      if (nb) Input.focus(nb);
      return;
    }
    if (act === 'nqr') {
      var box = overlay.querySelector('#nqrbox');
      return loadQr().then(function () {
        box.innerHTML = '<div class="nqr"><div class="qr">' + qrSvg(n.u) + '</div><p class="note">Aponte a câmera do celular para ler a matéria completa.</p></div>';
      }).catch(function () { toast('Não deu para mostrar o QR Code agora. Tente "Abrir no site".'); });
    }
  }

  // ---------------- Busca única (canais, jogos e notícias) ----------------
  function norm(t) { return String(t || '').normalize ? String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : String(t || '').toLowerCase(); }
  function initBusca() {
    var f = root.querySelector('#bsf'), q = root.querySelector('#bq'), t = null;
    if (!f) return;
    if (!S.news) News.load(newsBase()).then(function (d) { S.news = d; }).catch(function () {});
    q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { drawBusca(q.value); }, 250); });
    f.addEventListener('submit', function (e) { e.preventDefault(); drawBusca(q.value); var first = root.querySelector('#brows .focusable'); if (first) Input.focus(first); });
    drawBusca(S.buscaQ || '');
    Input.focus(q);
  }
  function drawBusca(qs) {
    var box = root.querySelector('#brows');
    if (!box) return;
    S.buscaQ = qs = String(qs || '').trim();
    var html = '';
    if (qs.length < 2) {
      html += '<p class="note" style="margin:0 var(--safe) 1rem">Digite o nome de um canal, de um jogo ou um assunto (ex.: "futebol", "Peppa", "eleição").</p>';
      html += row('baovivo', '🔴 Ao vivo agora', liveNowItems());
      html += row('btop', '⭐ Top 10', topItems());
    } else {
      var w = norm(qs).split(/\s+/);
      var hit = function (txt) { var n = norm(txt); return w.every(function (x) { return n.indexOf(x) >= 0; }); };
      var cats = {}; S.catalog.categories.forEach(function (c) { cats[c.id] = c.name; });
      var ch = S.catalog.items.filter(function (i) { return i.enabled !== false && (!isKids() || i.cat === 'infantil' || i.cat === 'educacao') && hit(i.name + ' ' + (i.desc || '') + ' ' + (cats[i.cat] || '') + ' ' + capaTitle(i.id)); });
      var gs = games().filter(function (g) { return hit(g.name + ' ' + (g.desc || '')); });
      var ns = [];
      if (!isKids() && S.news) S.news.sections.forEach(function (sec) { sec.items.forEach(function (n) { if (ns.length < 20 && hit(n.t + ' ' + (n.s || '')) && ns.indexOf(n) < 0) ns.push(n); }); });
      html += row('bcanais', '📺 Canais', ch) + row('bjogos', '🎮 Jogos', gs) + newsRow('bnews', '📰 Notícias', ns);
      if (!ch.length && !gs.length && !ns.length) html += '<p class="note" style="margin:0 var(--safe) 1rem">Nada encontrado para "' + esc(qs) + '".</p>';
      if (!isKids()) html += '<div class="inline" style="margin:0 var(--safe) 2rem" data-row="bmais"><button class="btn ghost focusable" data-act="buscamidia">🎵 Procurar "' + esc(qs) + '" em Música e Vídeos</button></div>';
    }
    box.innerHTML = html;
    bindRoot(box);
    applyCovers(box);
  }

  // ---------------- Perfis: telas ----------------
  function openPerfis(titulo) {
    var ps = perfis(), cur = perfil();
    openModal('<h2>' + esc(titulo || 'Quem está assistindo?') + '</h2>' +
      '<div class="perfis" data-row="perfis">' + ps.map(function (p) {
        return '<button class="perfil focusable' + (p.id === cur.id ? ' atual' : '') + '" data-act="perfil" data-id="' + esc(p.id) + '"><span class="av">' + p.av + '</span><span class="pn">' + esc(p.nome) + '</span>' + (p.kids ? '<span class="pk">KIDS</span>' : '') + '</button>';
      }).join('') + (ps.length < 6 ? '<button class="perfil novo focusable" data-act="perfilnovo"><span class="av">＋</span><span class="pn">Novo perfil</span></button>' : '') + '</div>' +
      '<div class="inline" data-row="perfis2">' + (ps.length > 1 ? '<button class="btn ghost focusable small" data-act="perfisdel">🗑 Apagar um perfil</button>' : '') +
      '<button class="btn ghost focusable" data-act="close">Voltar</button></div>' +
      '<p class="note">Cada perfil tem seus favoritos e o "Continuar". O perfil Kids mostra só desenhos e jogos infantis, e para sair dele é preciso o PIN.</p>');
    var at = overlay.querySelector('.perfil.atual'); if (at) Input.focus(at);
  }
  // Pede o PIN do controle dos pais (se houver) antes de uma ação protegida
  function askPin(onOk, titulo) {
    var pin = lsGet('ap_pin', '');
    // PIN já confirmado há pouco (ex.: abriu os perfis e agora escolhe um): não pergunta de novo
    if (!pin || (S.pinOkAt && Date.now() - S.pinOkAt < 120000)) return onOk();
    openModal('<form id="pinf" autocomplete="off"><h2>🔒 ' + esc(titulo || 'Digite o PIN') + '</h2><p>PIN do controle dos pais (4 números).</p>' +
      '<label class="field"><span>PIN</span><input class="focusable" name="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label>' +
      '<div class="inline" data-row="pin"><button type="submit" class="btn primary focusable">OK</button><button type="button" class="btn ghost focusable" data-act="close">Voltar</button></div></form>');
    var f = overlay.querySelector('#pinf');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (String(f.querySelector('[name=pin]').value) === String(pin)) { S.pinOkAt = Date.now(); closeModal(); onOk(); }
      else { toast('PIN incorreto'); f.querySelector('[name=pin]').value = ''; }
    });
  }
  function choosePerfil(id) {
    var alvo = perfis().filter(function (p) { return p.id === id; })[0];
    if (!alvo) return;
    var go = function () {
      lsSet('ap_perfil', id); S.perfilOk = true; closeModal();
      S.tab = homeTab(); renderHome(); toast('Olá, ' + alvo.nome + '! ' + alvo.av);
    };
    if (alvo.id === perfil().id) { S.perfilOk = true; return closeModal(); }
    if (isKids() && !alvo.kids) return askPin(go, 'Sair do perfil Kids');
    go();
  }
  function novoPerfil() {
    var av = 0, kids = false;
    openModal('<form id="pnf" autocomplete="off"><h2>Novo perfil</h2>' +
      '<label class="field"><span>Nome</span><input class="focusable" name="nome" type="text" maxlength="16" placeholder="Ex.: Vovó, Pedro, Kids"></label>' +
      '<div class="inline" data-row="pn1"><button type="button" class="btn ghost focusable" id="pnav">Avatar: ' + AVATARES[0] + '</button>' +
      '<button type="button" class="btn ghost focusable" id="pnk">Tipo: Adulto</button></div>' +
      '<label class="field" id="pnpin" style="display:none"><span>Crie um PIN de 4 números (para sair do perfil Kids)</span><input class="focusable" name="pin" type="password" inputmode="numeric" maxlength="4"></label>' +
      '<div class="inline" data-row="pn2"><button type="submit" class="btn primary focusable">Criar perfil</button><button type="button" class="btn ghost focusable" data-act="close">Voltar</button></div></form>');
    var f = overlay.querySelector('#pnf');
    f.querySelector('#pnav').addEventListener('click', function () { av = (av + 1) % AVATARES.length; this.textContent = 'Avatar: ' + AVATARES[av]; });
    f.querySelector('#pnk').addEventListener('click', function () {
      kids = !kids; this.textContent = 'Tipo: ' + (kids ? 'Kids 🧸' : 'Adulto');
      f.querySelector('#pnpin').style.display = kids && !lsGet('ap_pin', '') ? '' : 'none';
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = String(f.querySelector('[name=nome]').value || '').trim().slice(0, 16);
      if (nome.length < 2) return toast('Digite um nome');
      if (kids && !lsGet('ap_pin', '')) {
        var pin = String(f.querySelector('[name=pin]').value || '');
        if (!/^\d{4}$/.test(pin)) return toast('Crie um PIN com 4 números');
        lsSet('ap_pin', pin);
      }
      var ps = perfis(), id = 'p' + Date.now().toString(36);
      ps.push({ id: id, nome: nome, av: AVATARES[av], kids: kids });
      lsSet('ap_perfis', ps);
      toast('Perfil "' + nome + '" criado');
      choosePerfil(id);
    });
  }
  function apagarPerfil() {
    var ps = perfis().filter(function (p) { return p.id !== 'p1'; });
    openModal('<h2>🗑 Apagar perfil</h2><p>Escolha o perfil que vai sair deste aparelho (o Principal não pode ser apagado).</p><div class="perfis" data-row="pdel">' +
      ps.map(function (p) { return '<button class="perfil focusable" data-act="perfilapagar" data-id="' + esc(p.id) + '"><span class="av">' + p.av + '</span><span class="pn">' + esc(p.nome) + '</span></button>'; }).join('') +
      '</div><div class="inline"><button class="btn ghost focusable" data-act="close">Voltar</button></div>');
  }

  // ---------------- Surpreenda-me e Multitela ----------------
  function surpresa() {
    var l = liveNowItems().concat(topItems().filter(function (x) { return x.kind !== 'game'; }));
    if (!l.length) return;
    var it = l[Math.floor(Math.random() * l.length)];
    toast('🎲 Que tal: ' + it.name + '?');
    rowsIndex.surpresa = l;
    openItem(it.id, 'surpresa');
  }
  function abrirMulti() {
    if (!access().tv) return openPaywall('Seu teste terminou. Assine para continuar assistindo.');
    var pref = favs().map(itemById).filter(function (i) { return i && i.kind !== 'game' && playableOn(i); });
    var l = [], seen = {};
    var cand = pref.concat(liveNowItems());
    // Pendrive (file://): o YouTube não toca fora de um site/app, então começa pelos sinais oficiais diretos
    if (location.protocol === 'file:') cand = cand.filter(function (i) { return i.type === 'hls'; }).concat(allChannels().filter(function (i) { return i.type === 'hls'; }));
    cand.forEach(function (i) { if (!seen[i.id] && l.length < 4) { seen[i.id] = 1; l.push(i); } });
    if (!window.Multi) return;
    Multi.open(l, allChannels().filter(function (i) { return i.type !== 'link'; }));
  }

  // Desbloqueio de jogo premium por anúncio recompensado (30 min)
  function unlocked(id) { var u = lsGet('ap_unlocks', {}); return u[id] && u[id] > Date.now(); }
  function unlock(id) { var u = lsGet('ap_unlocks', {}); u[id] = Date.now() + 30 * 60000; lsSet('ap_unlocks', u); }

  // Ajustes do app (guardados neste aparelho)
  function openAjustes(from) {
    var perf = ['auto', 'alto', 'leve'], ui = ['normal', 'grande', 'pequeno'], tam = ['ajustar', 'preencher', 'esticar', 'zoom'];
    OptionsSheet.open(document.body, 'Ajustes', [
      { label: 'Visual', values: ['Automático', 'Futuro completo (efeitos e animações)', 'Leve (TV/TV Box mais simples)'], index: Math.max(0, perf.indexOf(Prefs.get('perf'))),
        note: 'Automático deixa leve sozinho quando o aparelho é mais fraco', onChange: function (i) { Prefs.set('perf', perf[i]); if (i) Prefs.set('autoLeve', false); } },
      { label: 'Tamanho da tela', values: ['Normal', 'Grande (letras maiores)', 'Pequeno (mais itens)'], index: Math.max(0, ui.indexOf(Prefs.get('ui'))), onChange: function (i) { Prefs.set('ui', ui[i]); } },
      { label: 'Legendas nos vídeos', values: ['Desligadas', 'Ligadas (quando houver)'], index: Prefs.get('legenda') === 'pt' ? 1 : 0, onChange: function (i) { Prefs.set('legenda', i ? 'pt' : 'off'); } },
      { label: 'Enquadramento do vídeo', values: ['Ajustar', 'Preencher a tela', 'Esticar', 'Zoom'], index: Math.max(0, tam.indexOf(Prefs.get('tamanho'))), onChange: function (i) { Prefs.set('tamanho', tam[i]); } },
      { label: 'Som dos jogos', values: ['Ligado', 'Desligado'], index: Prefs.get('som') ? 0 : 1, onChange: function (i) { Prefs.set('som', i === 0); } },
      { label: 'Vibração do controle', values: ['Ligada', 'Desligada'], index: Prefs.get('vibra') ? 0 : 1, onChange: function (i) { Prefs.set('vibra', i === 0); } }
    ], function () { if (from && document.body.contains(from)) Input.focus(from); else restoreFocus(); });
  }

  function accountHtml() {
    var u = S.user, st = S.settings;
    if (DEMO) return '<div class="center" style="min-height:auto"><div class="panel"><h1>Demonstração grátis</h1>' +
      '<p>' + (demoLeft() > 0 ? 'Você ainda tem <b>' + Math.ceil(demoLeft() / 60000) + ' minutos</b> com tudo liberado. Aproveite!' : 'O tempo com tudo liberado terminou. Canais, notícias e jogos grátis continuam funcionando. Gostou? Assine e libere tudo.') + '</p>' +
      '<div class="inline" data-row="acc"><button class="btn hot focusable" data-act="buy">⭐ Quero assinar</button>' +
      '<button class="btn ghost focusable" data-act="dono">🔑 Sou o dono</button>' + androidBtn() + '</div></div></div>';
    if (LOCAL) return '<div class="center" style="min-height:auto"><form class="panel" id="keyf"><h1>Modo Dono</h1>' +
      '<p>' + (window.AndroidTV ? 'App funcionando direto neste aparelho, sem servidor.' : 'Versão do pendrive.') + ' Tudo liberado, sem login. Para vender para clientes, use o servidor (veja o LEIA-ME).</p>' +
      '<label class="field"><span>Chave do YouTube (opcional — libera busca e "em alta" na aba Música)</span><input class="focusable" name="ytkey" type="text" autocomplete="off" placeholder="AIza..." value="' + esc(LocalMedia.hasKey() ? '••••••••' : '') + '"></label>' +
      '<div class="inline" data-row="acc"><button type="submit" class="btn primary focusable">Salvar chave</button>' + androidBtn() +
      (CFG.demo === true ? '<button type="button" class="btn ghost focusable" data-act="donosair">🔒 Sair do modo dono</button>' : '') + '</div>' +
      '<p class="note">Como pegar a chave grátis: console.cloud.google.com → ativar "YouTube Data API v3" → Credenciais → Criar chave de API.</p></form></div>';
    if (!u) return '<div class="center" style="min-height:auto"><div class="panel"><h1>Minha Conta</h1><p>Entre para ver sua assinatura e seu código de indicação.</p><div class="inline" data-row="acc"><button class="btn primary focusable" data-act="login">Entrar</button></div></div></div>';
    var status = { trial: 'Teste grátis', active: 'Assinante', expired: 'Teste encerrado', blocked: 'Bloqueado' }[u.status] || u.status;
    var refLink = location.origin + '/?ref=' + encodeURIComponent(u.referralCode || '');
    return '<div class="center" style="min-height:auto"><div class="panel"><h1>Olá, ' + esc(u.name.split(' ')[0]) + '!</h1>' +
      '<dl class="kv"><dt>Status</dt><dd>' + esc(status) + '</dd>' +
      (u.status === 'trial' ? '<dt>Teste termina</dt><dd>' + fmtDate(u.trialEndsAt) + ' (' + daysLeft(u.trialEndsAt) + ' dia(s))</dd>' : '') +
      (u.paidUntil ? '<dt>Assinatura até</dt><dd>' + fmtDate(u.paidUntil) + '</dd>' : '') +
      (u.founder ? '<dt>Plano</dt><dd>Fundador — ' + money(st.promoPrice) + '/mês travado enquanto renovar</dd>' : '') +
      '<dt>E-mail</dt><dd>' + esc(u.email) + '</dd>' +
      '<dt>Indique e ganhe</dt><dd>Cada amigo que assinar com seu código vale +' + esc(st.referralBonusDays || 7) + ' dias grátis para você.<br>Seu código: <b>' + esc(u.referralCode) + '</b><br><span class="note">' + esc(refLink) + '</span></dd></dl>' +
      '<div class="inline" data-row="acc">' +
        '<button class="btn hot focusable" data-act="paywall">' + (u.status === 'active' ? 'Renovar assinatura' : 'Assinar agora') + '</button>' +
        (st.supportWhatsapp ? '<button class="btn ghost focusable" data-act="support">💬 Suporte no WhatsApp</button>' : '') +
        androidBtn() +
        '<button class="btn ghost focusable" data-act="logout">Sair</button>' +
      '</div></div></div>';
  }

  // No app Android: permite trocar o endereço do servidor
  function androidBtn() {
    if (!(window.AndroidTV && AndroidTV.resetServer)) return '';
    return '<button class="btn ghost focusable" data-act="server">📡 ' + (LOCAL ? 'Conectar ao meu servidor' : 'Trocar servidor') + '</button>' +
      (!LOCAL && AndroidTV.useLocal ? '<button class="btn ghost focusable" data-act="local">📱 Usar sem servidor</button>' : '');
  }

  function promoHtml() {
    var st = S.settings;
    if (!(st.promoRemaining > 0)) return '';
    var used = st.promoSlots - st.promoRemaining;
    return '<div style="margin:1rem 0 1.2rem"><b>🔥 Preço de fundador: ' + money(st.promoPrice) + '/mês</b> <span class="strike">' + money(st.regularPrice) + '</span>' +
      '<div class="meter"><i style="width:' + Math.round(used / st.promoSlots * 100) + '%"></i></div>' +
      '<span class="note">Restam ' + st.promoRemaining + ' de ' + st.promoSlots + ' vagas com esse preço, travado enquanto você renovar. Depois fica ' + money(st.regularPrice) + '/mês.</span></div>';
  }

  function renderWelcome() {
    var st = S.settings;
    root.innerHTML = '<div class="center"><div class="panel">' +
      '<div class="brand" style="margin-bottom:1rem">' + brandHtml() + '</div>' +
      '<h1>Sua TV mais divertida: canais ao vivo, notícias e 17 jogos.</h1>' +
      '<p>Tudo no controle remoto, na Smart TV, TV Box, computador e celular. Experimente <b>' + st.trialDays + ' dias grátis</b>, sem cartão.</p>' +
      promoHtml() +
      '<div class="stack" data-row="w">' +
        '<button class="btn primary focusable" data-act="register">Testar grátis por ' + st.trialDays + ' dias</button>' +
        '<button class="btn ghost focusable" data-act="login">Já tenho conta</button>' + androidBtn() +
      '</div><p class="note" style="margin-top:1.2rem">✅ 100% legal: só fontes oficiais e gratuitas. Canais pagos continuam só nos apps oficiais de cada um.</p></div></div>';
    bindRoot();
    Input.focus(root.querySelector('.focusable'));
  }

  function renderAuth(mode) {
    var ref = (new URLSearchParams(location.search)).get('ref') || lsGet('ap_ref', '') || '';
    if (ref) lsSet('ap_ref', ref);
    var reg = mode === 'register';
    root.innerHTML = '<div class="center"><form class="panel" id="authf" autocomplete="on">' +
      '<h1>' + (reg ? 'Criar conta grátis' : 'Entrar') + '</h1>' +
      (reg ? '<p>' + S.settings.trialDays + ' dias grátis com tudo liberado.</p>' : '<p>Use o e-mail e a senha que você cadastrou.</p>') +
      (reg ? field('name', 'Seu nome', 'text', 'name') + field('phone', 'WhatsApp (com DDD)', 'tel', 'tel') : '') +
      field('email', 'E-mail', 'email', 'email') + field('password', 'Senha (mínimo 6 caracteres)', 'password', reg ? 'new-password' : 'current-password') +
      (reg ? field('ref', 'Código de indicação (opcional)', 'text', 'off', ref) : '') +
      '<div class="err" id="aerr"></div>' +
      '<div class="inline" data-row="af"><button type="submit" class="btn primary focusable">' + (reg ? 'Começar teste grátis' : 'Entrar') + '</button>' +
      '<button type="button" class="btn ghost focusable" data-act="' + (reg ? 'login' : 'register') + '">' + (reg ? 'Já tenho conta' : 'Criar conta') + '</button>' +
      '<button type="button" class="btn ghost focusable" data-act="welcome">Voltar</button></div></form></div>';
    var f = root.querySelector('#authf');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {}; new FormData(f).forEach(function (v, k) { data[k] = String(v).trim(); });
      var err = root.querySelector('#aerr'); err.textContent = '';
      api('POST', reg ? '/api/auth/register' : '/api/auth/login', data).then(function (r) {
        S.token = r.token; lsSet('ap_token', r.token); S.user = r.user;
        toast(reg ? '🎉 Conta criada! Seu teste grátis já começou. Bom divertimento!' : 'Que bom ter você de volta! 😊');
        S.tab = 'inicio'; renderHome();
      }).catch(function (e2) { err.textContent = e2.message; });
    });
    bindRoot();
    Input.focus(root.querySelector('input'));
  }

  function field(name, label, type, ac, value) {
    return '<label class="field"><span>' + esc(label) + '</span><input class="focusable" name="' + name + '" type="' + type + '" autocomplete="' + ac + '" value="' + esc(value || '') + '"></label>';
  }

  // ---------------- modal ----------------
  function openModal(html, onClose) {
    S.lastFocus = document.activeElement;
    S.modalOpen = true;
    S.modalClose = onClose || null;
    overlay.innerHTML = '<div class="modal-bg"><div class="modal">' + html + '</div></div>';
    overlay.querySelectorAll('[data-act]').forEach(bindAct);
    Input.focus(overlay.querySelector('.focusable'));
  }
  function closeModal() {
    if (!S.modalOpen) return;
    S.modalOpen = false;
    clearInterval(S.poll);
    overlay.innerHTML = '';
    if (S.modalClose) S.modalClose();
    restoreFocus();
  }
  function restoreFocus() {
    var el = S.lastFocus;
    if (el && document.body.contains(el)) Input.focus(el);
    else Input.focus(root.querySelector('.focusable'));
  }

  function openDetail(it) {
    openModal('<h2>' + esc(it.name) + '</h2><p>' + esc(it.desc || '') + '</p>' +
      '<p class="note">Vamos abrir o app ou o site oficial, grátis e legal. Se pedir cadastro, ele é gratuito.</p>' +
      '<div class="inline" style="margin-top:1rem" data-row="d">' +
      '<button class="btn primary focusable" data-act="openlink" data-url="' + esc(it.url) + '" data-pkg="' + esc(it.android || '') + '">↗ Abrir ' + esc(it.name) + '</button>' +
      '<button class="btn ghost focusable" data-act="fav" data-id="' + esc(it.id) + '">' + (isFav(it.id) ? '★ Favorito' : '☆ Favoritar') + '</button>' +
      '<button class="btn ghost focusable" data-act="close">Voltar</button></div>');
  }

  function openExternal(url, pkg) {
    if (!url) return;
    track('open', url);
    if (window.AndroidTV && pkg && AndroidTV.openApp) { AndroidTV.openApp(pkg, url); return; }
    if (window.AndroidTV && AndroidTV.openUrl) { AndroidTV.openUrl(url); return; }
    toast('Abrindo o app oficial…');
    var w = null;
    try { w = window.open(url, '_blank', 'noopener'); } catch (e) {}
    if (!w) location.href = url;
  }

  // ---------------- assinatura ----------------
  function buyLinks() {
    var w = String(CFG.buyWhatsapp || '').replace(/\D/g, ''), out = [];
    if (w) out.push({ label: '💬 WhatsApp', note: 'Assinar pelo WhatsApp', url: 'https://wa.me/' + w + '?text=' + encodeURIComponent('Olá! Vi o Accioly Play e quero assinar.') });
    if (/^https?:\/\//.test(CFG.buySite || '')) out.push({ label: '🌐 Site', note: 'Assinar pelo site', url: CFG.buySite });
    return out;
  }
  // Convite para assinar na vitrine (sem servidor: o pagamento é pelo WhatsApp ou pelo site do dono)
  function openBuy(reason) {
    var st = S.settings, links = buyLinks();
    openModal('<h2>Gostou do ' + esc(st.productName) + '? ⭐</h2>' +
      (reason ? '<p>' + esc(reason) + '</p>' : '') +
      '<p>Assine e tenha tudo liberado: canais ao vivo de fontes oficiais, notícias do dia, 17 jogos no controle remoto, música e vídeos. Na TV, no computador e no celular.</p>' +
      '<div class="price">' + money(st.promoPrice) + ' <small>/ mês</small></div>' +
      '<p class="note">Preço de fundador para os ' + st.promoSlots + ' primeiros assinantes, enquanto houver vagas (confirme as vagas ao assinar). Depois, ' + money(st.regularPrice) + '/mês. Sem fidelidade.</p>' +
      (links.length ? '<div class="buyqrs" id="buyqrs">' + links.map(function (l, i) { return '<div class="buyqr"><div class="qr" id="bq' + i + '"></div><span>' + esc(l.note) + '</span></div>'; }).join('') + '</div>'
        : '<p class="note">Para assinar, é só falar com quem te mostrou o Accioly Play. 😊</p>') +
      '<div class="inline" data-row="buy">' + links.map(function (l) { return '<button class="btn primary focusable" data-act="openlink" data-url="' + esc(l.url) + '">' + l.label + '</button>'; }).join('') +
      '<button class="btn ghost focusable" data-act="close">Continuar vendo</button></div>' +
      '<div class="inline" style="margin-top:.4rem" data-row="buy2"><button class="btn ghost focusable small" data-act="dono">🔑 Sou o dono</button></div>');
    if (links.length) loadQr().then(function () {
      links.forEach(function (l, i) { var b = overlay.querySelector('#bq' + i); if (b) b.innerHTML = qrSvg(l.url); });
    }).catch(function () {});
  }

  // Dono digita o código secreto e libera tudo neste aparelho (versões públicas)
  function openDono() {
    openModal('<form id="donof" autocomplete="off"><h2>🔑 Sou o dono</h2><p>Digite o código do dono para liberar tudo neste aparelho.</p>' +
      '<label class="field"><span>Código do dono</span><input class="focusable" name="codigo" type="text" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX"></label>' +
      '<div class="inline" data-row="dono"><button type="submit" class="btn primary focusable">Liberar</button><button type="button" class="btn ghost focusable" data-act="close">Voltar</button></div></form>');
    var f = overlay.querySelector('#donof');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if ((S.donoFails || 0) >= 5 && Date.now() - S.donoFailAt < 60000) return toast('Muitas tentativas. Espere 1 minuto.');
      var c = Dono.normalize(f.querySelector('[name=codigo]').value);
      if (CFG.donoHash && Dono.hash(c) === CFG.donoHash) {
        lsSet('ap_dono_code', c);
        toast('✅ Modo Dono liberado neste aparelho');
        setTimeout(function () { location.reload(); }, 800);
        return;
      }
      S.donoFails = (S.donoFails || 0) + 1; S.donoFailAt = Date.now();
      toast(CFG.donoHash ? 'Código incorreto. Confira e tente de novo.' : 'Esta versão não tem código do dono.');
    });
  }

  function openPaywall(reason, game) {
    if (DEMO) return openBuy(reason);
    if (LOCAL) return;
    S.rewardGame = game || null;
    if (!S.user) { renderAuth('register'); return; }
    var st = S.settings, promo = st.promoRemaining > 0 || S.user.founder;
    var price = promo ? st.promoPrice : st.regularPrice;
    openModal('<h2>Assine o ' + esc(st.productName) + ' ⭐</h2>' +
      '<p>' + esc(reason || 'Continue com tudo depois do teste: canais, notícias, música, vídeos e todos os jogos premium.') + '</p>' +
      '<div class="price">' + money(price) + ' <small>/ ' + st.planDays + ' dias</small></div>' +
      (S.user.founder ? '<p class="note">Você é fundador: seu preço especial fica travado enquanto renovar. 💛</p>' : promoHtml()) +
      '<div id="paybox"><div class="inline" data-row="pay">' +
        (st.pixEnabled ? '<button class="btn primary focusable" data-act="pix">Pagar com Pix</button>' : '') +
        (st.mpEnabled ? '<button class="btn ghost focusable" data-act="mp">Cartão ou Pix (Mercado Pago)</button>' : '') +
        (game && Ads.rewardedAvailable() ? '<button class="btn hot focusable" data-act="reward">🎬 Ver 1 anúncio e jogar 30 min</button>' : '') +
        (st.supportWhatsapp ? '<button class="btn ghost focusable" data-act="support">💬 Falar no WhatsApp</button>' : '') +
        '<button class="btn ghost focusable" data-act="close">Agora não</button></div>' +
        '<p class="note">Assinante tem todos os jogos liberados e <b>nenhum anúncio</b>. Sem fidelidade: para cancelar, é só não renovar.</p>' +
        (!st.pixEnabled && !st.mpEnabled ? '<p class="note">O pagamento ainda não foi configurado. Fale com o suporte.</p>' : '') +
      '</div>');
  }

  function loadQr() {
    if (window.qrcode) return Promise.resolve();
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'vendor/qrcode.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  function qrSvg(text) {
    var q = window.qrcode(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }

  function checkout(method) {
    var box = overlay.querySelector('#paybox');
    box.innerHTML = '<div class="spinner"></div>';
    Promise.all([api('POST', '/api/checkout', { method: method }), loadQr()]).then(function (res) {
      var r = res[0], o = r.order;
      var code = method === 'pix' ? r.pixCode : r.initPoint;
      box.innerHTML = '<div class="inline" style="align-items:flex-start;gap:1.4rem">' +
        '<div class="qr">' + qrSvg(code) + '</div>' +
        '<div style="flex:1;min-width:14rem"><p><b>' + (method === 'pix' ? 'Escaneie com o app do seu banco' : 'Escaneie com o celular para pagar') + '</b><br>Valor: <b>' + money(o.amount) + '</b></p>' +
        (method === 'pix' ? '<div class="code" id="pixcode">' + esc(code) + '</div><p class="note">Pix copia e cola. Recebedor: ' + esc(r.receiver || '') + '</p>' : '') +
        '<div class="inline" data-row="pd" style="margin-top:.8rem">' +
          (method === 'pix' ? '<button class="btn primary focusable" data-act="paid" data-id="' + o.id + '">✅ Já paguei</button><button class="btn ghost focusable" data-act="copy">Copiar código</button>'
                            : '<button class="btn primary focusable" data-act="openlink" data-url="' + esc(code) + '">Abrir pagamento</button>') +
          '<button class="btn ghost focusable" data-act="close">Fechar</button></div>' +
        '<p class="note" id="paystatus">Aguardando pagamento…</p></div></div>';
      box.querySelectorAll('[data-act]').forEach(bindAct);
      Input.focus(box.querySelector('.focusable'));
      pollOrder(o.id);
    }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p><div class="inline"><button class="btn ghost focusable" data-act="close">Fechar</button></div>'; box.querySelectorAll('[data-act]').forEach(bindAct); Input.focus(box.querySelector('.focusable')); });
  }

  function pollOrder(id) {
    clearInterval(S.poll);
    S.poll = setInterval(function () {
      api('GET', '/api/orders/' + id).then(function (r) {
        var st = overlay.querySelector('#paystatus');
        if (r.order.status === 'pago') {
          clearInterval(S.poll);
          refreshMe().then(function () { closeModal(); toast('🎉 Pagamento confirmado! Sua assinatura está ativa. Obrigado!'); renderHome(); });
        } else if (st && r.order.status === 'aguardando_confirmacao') st.textContent = 'Recebemos seu aviso! Confirmando o pagamento…';
        else if (st && r.order.status === 'recusado') st.textContent = 'Pagamento não identificado. Fale com o suporte.';
      }).catch(function () {});
    }, 5000);
  }

  function refreshMe() {
    return api('GET', '/api/me').then(function (r) { S.user = r.user; S.settings = Object.assign({}, S.settings, r.settings || {}); setupAds(); });
  }
  function setupAds() { Ads.setup(S.settings.ads, S.user, LOCAL); }

  // ---------------- ações ----------------
  function bindAct(el) {
    el.addEventListener('click', function () { doAct(el.getAttribute('data-act'), el); });
  }
  function bindRoot(scope) {
    scope = scope || root;
    scope.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { S.tab = b.getAttribute('data-tab'); S.lastFocusSel = '.tab[data-tab="' + S.tab + '"]'; renderHome(); });
    });
    scope.querySelectorAll('.tile:not(.ntile):not(.qk)').forEach(function (b) {
      b.addEventListener('click', function () { openItem(b.getAttribute('data-id'), b.getAttribute('data-rowid')); });
    });
    scope.querySelectorAll('.ntile').forEach(function (b) {
      b.addEventListener('click', function () { openNews(b.getAttribute('data-nrow'), +b.getAttribute('data-i')); });
    });
    scope.querySelectorAll('[data-act]').forEach(bindAct);
  }

  function doAct(act, el) {
    if (act === 'register') return renderAuth('register');
    if (act === 'login') return renderAuth('login');
    if (act === 'welcome') return renderWelcome();
    if (act === 'server') { if (window.AndroidTV && AndroidTV.resetServer) AndroidTV.resetServer(); return; }
    if (act === 'ajustes') return openAjustes(el);
    if (act === 'iosok') { lsSet('ap_ios_ok', true); el.remove(); return; }
    if (act === 'local') { if (window.AndroidTV && AndroidTV.useLocal) AndroidTV.useLocal(); return; }
    if (act === 'close') return closeModal();
    if (/^n(brief|refresh|speak|open|next|qr)$/.test(act)) return newsAct(act, el);
    if (act === 'paywall') return openPaywall();
    if (act === 'buy') return openBuy();
    if (act === 'perfis') return isKids() ? askPin(function () { openPerfis(); }, 'Trocar de perfil') : openPerfis();
    if (act === 'perfil') return choosePerfil(el.getAttribute('data-id'));
    if (act === 'perfilnovo') return isKids() ? askPin(novoPerfil, 'Criar perfil') : novoPerfil();
    if (act === 'perfisdel') return askPin(apagarPerfil, 'Apagar perfil');
    if (act === 'perfilapagar') {
      var pid = el.getAttribute('data-id');
      lsSet('ap_perfis', perfis().filter(function (p) { return p.id !== pid; }));
      if (lsGet('ap_perfil', 'p1') === pid) lsSet('ap_perfil', 'p1');
      closeModal(); S.tab = homeTab(); renderHome(); return toast('Perfil apagado');
    }
    if (act === 'surpresa') return surpresa();
    if (act === 'multi') return abrirMulti();
    if (act === 'buscamidia') { S.pendingMedia = S.buscaQ; S.mediaResults = null; S.tab = 'midia'; return renderHome(); }
    if (act === 'dono') return openDono();
    if (act === 'donosair') { try { localStorage.removeItem('ap_dono_code'); } catch (e) {} toast('Modo dono desligado neste aparelho'); setTimeout(function () { location.reload(); }, 700); return; }
    if (act === 'pix') return checkout('pix');
    if (act === 'mtipo') { S.mediaTipo = S.mediaTipo === 'videos' ? 'music' : 'videos'; el.textContent = S.mediaTipo === 'videos' ? '🎬 Vídeos' : '🎵 Músicas'; return; }
    if (act === 'reward') {
      var g = S.rewardGame;
      return Ads.rewarded('premium-' + (g && g.id), function () {
        unlock(g.id); closeModal(); toast('🎉 Liberado por 30 minutos. Divirta-se!');
        if (g.kind === 'game') startGame(g, 'jogos');
      }, function () { toast('Nenhum anúncio disponível agora. Tente daqui a pouco ou assine para jogar à vontade.'); });
    }
    if (act === 'mp') return checkout('mp');
    if (act === 'openlink') return openExternal(el.getAttribute('data-url'), el.getAttribute('data-pkg'));
    if (act === 'support') return openExternal('https://wa.me/' + String(S.settings.supportWhatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent('Olá! Preciso de ajuda com o ' + S.settings.productName + '.'));
    if (act === 'fav') { toggleFav(el.getAttribute('data-id')); el.textContent = isFav(el.getAttribute('data-id')) ? '★ Favorito' : '☆ Favoritar'; return; }
    if (act === 'copy') {
      var txt = (overlay.querySelector('#pixcode') || {}).textContent || '';
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast('Código copiado!'); }, function () { toast('Selecione e copie o código'); });
      return;
    }
    if (act === 'paid') {
      api('POST', '/api/orders/' + el.getAttribute('data-id') + '/notify').then(function () {
        var s = overlay.querySelector('#paystatus'); if (s) s.textContent = 'Recebemos seu aviso! Assim que o pagamento cair, liberamos (normalmente em minutos).';
        toast('Aviso enviado! Já vamos conferir ✅');
      }).catch(function (e) { toast(e.message); });
      return;
    }
    if (act === 'logout') { S.token = null; S.user = null; lsSet('ap_token', null); return renderWelcome(); }
    if (act === 'watch') {
      var first = catItems('abertos').filter(function (i) { return i.type !== 'link'; })[0] || S.catalog.items.filter(function (i) { return i.type !== 'link'; })[0];
      if (first) openItem(first.id, 'abertos');
    }
  }

  function openItem(id, rowId) {
    S.lastFocus = document.activeElement;
    News.stop(); S.briefing = false; // nada de voz por cima de canal, música ou jogo
    var list = rowsIndex[rowId] || [];
    var it = list.filter(function (x) { return x.id === id; })[0] || itemById(id);
    if (!it) return;
    var acc = access();
    if (it.kind === 'game') {
      if (it.premium && !acc.premium && !unlocked(it.id)) return openPaywall(S.user && S.user.status === 'expired' ? 'Seu teste terminou. Assine e continue jogando todos os jogos premium.' : '"' + it.name + '" é um jogo premium, liberado para assinantes.', it);
      return startGame(it, rowId);
    }
    if (it.kind === 'yt' || it.kind === 'audio') {
      if (!acc.tv) return openPaywall('Seu teste terminou. Assine para continuar com tudo.');
      if (S.settings.premiumNovidades !== false && !acc.premium && !unlocked('midia'))
        return openPaywall('🎵 Música e Vídeos é exclusivo para assinantes. Assine e ouça à vontade.', { id: 'midia', name: 'Música e Vídeos' });
      return MediaPlayer.open(list.length ? list : [it], Math.max(0, list.indexOf(it)));
    }
    if (!acc.tv) return openPaywall('Seu teste terminou. Assine para continuar assistindo aos canais.');
    pushRecent(it.id);
    if (it.type === 'link') return openDetail(it);
    var playable = list.filter(function (x) { return x.kind !== 'game' && x.type !== 'link'; });
    if (playable.indexOf(it) < 0) playable = [it];
    Player.open(playable, playable.indexOf(it));
  }

  function startGame(it, rowId) {
    pushRecent(it.id);
    var back = '.tile[data-id="' + it.id + '"][data-rowid="' + rowId + '"]';
    var go = function () { GameHub.start(it.id, function () { S.lastFocusSel = back; renderHome(); }); };
    // Quem não assina vê um anúncio antes de jogar (o Google controla a frequência)
    if (Ads.on) Ads.interstitial('start', go); else go();
  }

  // Devolve { channelId, live }. O servidor confere se o canal está ao vivo agora (cache de 10 min).
  function resolveYoutube(it) {
    // Sem servidor/app Android para checar: canais 24h começam ao vivo; os demais pelos vídeos recentes
    var fallback = { channelId: it.channelId || null, live: it.live === true };
    if ((LOCAL || !S.online) && it.handle && window.AndroidTV && AndroidTV.ytResolve) return nativeYt(it.handle, fallback);
    if (LOCAL || !S.online || !it.handle) return Promise.resolve(fallback);
    return api('GET', '/api/yt/resolve?handle=' + encodeURIComponent(it.handle))
      .then(function (r) { return { channelId: r.channelId || fallback.channelId, live: !!r.live }; })
      .catch(function () { return fallback; });
  }

  // App Android sem servidor: o próprio aparelho descobre o canal (ID guardado 7 dias)
  var ytSeq = 0, ytWait = {};
  window.__ytNative = function (id, channelId, live) { if (ytWait[id]) { ytWait[id]({ channelId: channelId, live: !!live }); delete ytWait[id]; } };
  function nativeYt(handle, fallback) {
    var memo = lsGet('ap_yt_' + handle, null);
    return new Promise(function (resolve) {
      var id = 'yt' + (++ytSeq), done = false;
      var finish = function (r) {
        if (done) return; done = true;
        if (r && r.channelId) { lsSet('ap_yt_' + handle, { channelId: r.channelId, at: Date.now() }); return resolve(r); }
        resolve(memo && memo.channelId ? { channelId: memo.channelId, live: fallback.live } : fallback);
      };
      ytWait[id] = finish;
      setTimeout(function () { finish(null); }, 20000);
      try { AndroidTV.ytResolve(handle, id); } catch (e) { finish(null); }
    });
  }

  function back() {
    if (Player.isOpen() || GameHub.isOpen() || MediaPlayer.isOpen() || (window.Multi && Multi.isOpen())) return true;
    if (S.modalOpen) { closeModal(); return true; }
    if (root.querySelector('#authf')) { renderWelcome(); return true; }
    if (S.tab !== homeTab() && root.querySelector('.topbar')) { S.tab = homeTab(); renderHome(); return true; }
    return false; // na tela inicial: deixa o app/TV sair
  }

  // Ações globais (prioridade mais baixa: player e jogos interceptam antes)
  Input.on(function (a) {
    if (Player.isOpen() || GameHub.isOpen() || MediaPlayer.isOpen() || OptionsSheet.isOpen() || (window.Multi && Multi.isOpen())) return false;
    var scope = S.modalOpen ? overlay : root;
    if (a === 'up' || a === 'down' || a === 'left' || a === 'right') { Input.move(a, scope); return true; }
    if (a === 'ok') {
      var el = document.activeElement;
      if (!el || el === document.body) { Input.focus(scope.querySelector('.focusable')); return true; }
      if (el.tagName === 'INPUT') {
        var inputs = Array.prototype.slice.call(scope.querySelectorAll('input'));
        var i = inputs.indexOf(el);
        if (i >= 0 && i < inputs.length - 1) Input.focus(inputs[i + 1]);
        else { var sub = scope.querySelector('[type=submit]'); if (sub) sub.click(); }
        return true;
      }
      el.click();
      return true;
    }
    if (a === 'back') return back();
    return false;
  });

  // Integração com o app Android TV (botão VOLTAR do controle)
  // (o VOLTAR do Android vai para o player/jogo/menu aberto; na tela inicial, sai do app)
  window.__tvBack = function () { return Input.emit('back', 'android'); };

  // ---------------- inicialização ----------------
  function applyConfig(cfg) {
    S.settings = Object.assign({}, DEFAULT_SETTINGS, cfg.settings || {});
    if (cfg.catalog && cfg.catalog.items) S.catalog = cfg.catalog;
    S.gameOverrides = cfg.games || {};
    S.trending = cfg.trending || [];
    setupAds();
    document.title = S.settings.productName;
  }

  // Mais de um perfil: pergunta "Quem está assistindo?" ao abrir (como na Netflix)
  function askPerfilOnce() {
    if (S.perfilOk || perfis().length < 2 || S.modalOpen || !root.querySelector('.topbar')) return;
    S.perfilOk = true;
    if (!isKids()) openPerfis();
  }
  function boot() {
    Prefs.detect();
    loadCapas();
    setTimeout(askPerfilOnce, 600);
    S.token = lsGet('ap_token', null);
    var ref = (new URLSearchParams(location.search)).get('ref');
    if (ref) lsSet('ap_ref', ref);
    if ('serviceWorker' in navigator && !isFile && !LOCAL) navigator.serviceWorker.register('sw.js').catch(function () {});
    if (LOCAL) { renderHome(); return; }
    api('GET', '/api/public/config').then(function (cfg) {
      applyConfig(cfg);
      if (!S.token) return null;
      return refreshMe().catch(function (e) { if (e.status === 401) { S.token = null; lsSet('ap_token', null); } });
    }).then(function () {
      if (S.user) renderHome();
      else if (location.hash === '#login') renderAuth('login');
      else if (location.hash === '#cadastro') renderAuth('register');
      else renderWelcome();
    }).catch(function () {
      S.online = false;
      renderHome();
    });
  }

  window.App = {
    toast: toast, track: track, isFav: isFav, toggleFav: toggleFav, openExternal: openExternal,
    resolveYoutube: resolveYoutube, restoreFocus: restoreFocus, back: back, state: S,
    allChannels: allChannels, channelNumber: channelNumber, capaTitle: capaTitle, coverUrl: function (it) { return coverUrl(it); },
    pushRecent: pushRecent, access: access, openPaywall: function (r) { return openPaywall(r); }
  };
  window.UI = { toast: toast };
  boot();
})();

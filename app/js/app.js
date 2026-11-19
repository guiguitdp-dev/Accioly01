/*
 * Accioly Play — aplicativo principal (telas, contas, assinatura).
 */
(function () {
  var CFG = window.APP_CONFIG || {};
  var isFile = location.protocol === 'file:';
  var API = (CFG.serverUrl || '').replace(/\/$/, '');
  var LOCAL = CFG.localMode === true || (CFG.localMode === 'auto' && isFile && !API);
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
  function access() {
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
      return { id: g.id, name: g.name, emoji: g.emoji, color: g.color, desc: g.desc, help: g.help, trending: !!g.trending,
        premium: o.premium != null ? o.premium : !!g.premium, enabled: o.enabled !== false, kind: 'game' };
    }).filter(function (g) { return g.enabled; });
  }

  function favs() { return lsGet('ap_favs', []); }
  function isFav(id) { return favs().indexOf(id) >= 0; }
  function toggleFav(id) {
    var f = favs(), i = f.indexOf(id);
    if (i >= 0) { f.splice(i, 1); toast('Removido dos favoritos'); } else { f.unshift(id); toast('★ Adicionado aos favoritos'); }
    lsSet('ap_favs', f.slice(0, 40));
  }
  function pushRecent(id) { var r = lsGet('ap_recent', []).filter(function (x) { return x !== id; }); r.unshift(id); lsSet('ap_recent', r.slice(0, 12)); }

  function itemById(id) {
    var it = S.catalog.items.filter(function (x) { return x.id === id; })[0];
    if (it) return it;
    return games().filter(function (g) { return g.id === id; })[0];
  }

  // ---------------- telas ----------------
  function topbar() {
    var u = S.user, pill = '';
    if (LOCAL) pill = '<span class="pill active">Modo Dono</span>';
    else if (!S.online) pill = '<span class="pill expired">Offline</span>';
    else if (u && u.status === 'trial') pill = '<span class="pill trial">Teste grátis: ' + daysLeft(u.trialEndsAt) + ' dia(s)</span>';
    else if (u && u.status === 'active') pill = '<span class="pill active">Assinante até ' + fmtDate(u.paidUntil) + '</span>';
    else if (u) pill = '<span class="pill expired">Teste encerrado</span>';
    var tabs = [['inicio', 'Início'], ['tv', 'TV ao Vivo'], ['filmes', 'Filmes'], ['midia', '🎵 Música'], ['jogos', 'Jogos'], ['kids', 'Kids 🧸'], ['conta', 'Conta']];
    return '<header class="topbar"><div class="brand">' + brandHtml() + '</div><nav class="tabs" data-row="tabs">' +
      tabs.map(function (t) { return '<button class="tab focusable' + (S.tab === t[0] ? ' active' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') +
      '</nav><div class="spacer"></div><span class="clock" id="clock">' + clockText() + '</span>' + pill + '</header>';
  }

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
    return '<button class="tile focusable' + (off ? ' off' : '') + '" style="--c:' + esc(it.color || '#334') + '" data-id="' + esc(it.id) + '" data-rowid="' + esc(rowId) + '">' +
      badge + (isFav(it.id) ? '<span class="fav">★</span>' : (isNew ? '<span class="ribbon">NOVO</span>' : '')) +
      (it.emoji ? '<span class="emoji">' + it.emoji + '</span>' : '<span class="mono' + ((it.mono || '').length > 3 ? ' sm' : '') + '">' + esc(it.mono || initials(it.name)) + '</span>') +
      '<span class="name">' + esc(it.name) + '</span>' + (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') +
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
      { kicker: 'AO VIVO', title: st.heroTitle || 'Sua TV completa: canais ao vivo, filmes grátis e jogos no controle.', text: st.heroText || 'TV aberta, notícias 24h, esportes, novelas e desenhos — tudo de fontes oficiais, tocando aqui dentro.', c1: '#7c5cff', c2: '#ff7a45' },
      { kicker: 'LANÇAMENTO', title: '🎵 Música e Vídeos', text: 'Busque qualquer música ou clipe, veja o que está em alta no Brasil e toque em sequência. E ainda: música livre sem anúncios.', c1: '#22c55e', c2: '#0ea5e9', tab: 'midia', btn: '🎵 Abrir Música' },
      { kicker: 'JOGOS EM ALTA', title: '🦫 Corre Capivara, ⚽ Pênaltis e mais', text: '13 jogos para jogar com o controle remoto — sozinho ou em família, com recordes.', c1: '#f59e0b', c2: '#ef4444', tab: 'jogos', btn: '🎮 Ver jogos' },
      { kicker: 'KIDS', title: '🧸 Cantinho Kids', text: 'Desenhos e jogos para a criançada, tudo num lugar só.', c1: '#ec4899', c2: '#8b5cf6', tab: 'kids', btn: '🧸 Abrir Kids' }
    ];
  }
  function heroHtml() {
    var st = S.settings, acc = access(), s = heroSlides()[S.heroIdx || 0];
    var cta = '';
    if (!LOCAL && S.online && S.user && !acc.premium) cta = '<button class="btn hot focusable" data-act="paywall">Assinar por ' + money(st.promoRemaining > 0 ? st.promoPrice : st.regularPrice) + '/mês</button>';
    return '<section class="hero" id="hero" style="--h1:' + s.c1 + ';--h2:' + s.c2 + '"><span class="kicker">' + esc(s.kicker) + '</span><h1>' + esc(s.title) + '</h1><p>' + esc(s.text) + '</p><div class="actions" data-row="hero">' +
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

  function renderHome() {
    rowsIndex = {};
    var html = topbar();
    var st = S.settings;
    if (!S.online && !LOCAL) html += '<div class="banner">Sem conexão com o servidor. Canais e jogos grátis continuam funcionando.</div>';
    if (st.announcement) html += '<div class="banner">' + esc(st.announcement) + '</div>';
    var cats = S.catalog.categories;
    var catName = function (id) { var c = cats.filter(function (x) { return x.id === id; })[0]; return c ? c.name : id; };

    if (S.tab === 'inicio') {
      html += heroHtml();
      var f = favs().map(itemById).filter(Boolean);
      html += row('favs', '★ Meus Favoritos', f);
      var r = lsGet('ap_recent', []).map(itemById).filter(Boolean);
      html += row('recent', 'Continuar assistindo', r);
      html += row('alta', '🔥 Em alta agora', trendingItems());
      html += Ads.banner();
      html += row('abertos', catName('abertos'), catItems('abertos'));
      html += row('jogos', '🎮 Jogos no controle remoto', games());
      cats.forEach(function (c) { if (c.id !== 'abertos') html += row(c.id, c.name, catItems(c.id)); });
    } else if (S.tab === 'kids') {
      html += '<section class="hero" style="padding:1.6rem 2.2rem"><h1 style="font-size:2rem">Cantinho Kids 🧸</h1><p style="margin:0">Desenhos e jogos para a criançada, tudo num lugar só.</p></section>';
      html += row('infantil', '📺 Desenhos e canais infantis', catItems('infantil'));
      html += row('kidsgames', '🎮 Jogos para crianças', games().filter(function (g) { return KIDS_GAMES.indexOf(g.id) >= 0; }));
      html += row('educacao', '📚 Aprender brincando', catItems('educacao'));
    } else if (S.tab === 'tv') {
      cats.forEach(function (c) { if (c.id !== 'filmes') html += row(c.id, c.name, catItems(c.id)); });
    } else if (S.tab === 'midia') {
      html += mediaTabHtml();
    } else if (S.tab === 'filmes') {
      html += row('filmes', catName('filmes'), catItems('filmes'));
      html += '<p class="note" style="margin:0 var(--safe)">Esses serviços são gratuitos e legais. Ao abrir, você vai para o app/site oficial.</p>';
    } else if (S.tab === 'jogos') {
      rowsIndex.jogos = games();
      html += '<section class="row"><h2>🎮 Jogos — use o controle remoto ou um controle de videogame</h2><div class="grid">' +
        games().map(function (g) { return tile(g, 'jogos'); }).join('') + '</div></section>';
    } else if (S.tab === 'conta') {
      html += accountHtml();
    }
    root.innerHTML = html;
    root.scrollTop = 0;
    bindRoot();
    Ads.fillBanners(root);
    if (S.tab === 'midia') loadMedia();
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
    if (q.length < 2) return toast('Digite pelo menos 2 letras');
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

  // Desbloqueio de jogo premium por anúncio recompensado (30 min)
  function unlocked(id) { var u = lsGet('ap_unlocks', {}); return u[id] && u[id] > Date.now(); }
  function unlock(id) { var u = lsGet('ap_unlocks', {}); u[id] = Date.now() + 30 * 60000; lsSet('ap_unlocks', u); }

  function accountHtml() {
    var u = S.user, st = S.settings;
    if (LOCAL) return '<div class="center" style="min-height:auto"><form class="panel" id="keyf"><h1>Modo Dono</h1>' +
      '<p>' + (window.AndroidTV ? 'App funcionando direto neste aparelho, sem servidor.' : 'Versão do pendrive.') + ' Tudo liberado, sem login. Para vender para clientes, use o servidor (veja o LEIA-ME).</p>' +
      '<label class="field"><span>Chave do YouTube (opcional — libera busca e "em alta" na aba Música)</span><input class="focusable" name="ytkey" type="text" autocomplete="off" placeholder="AIza..." value="' + esc(LocalMedia.hasKey() ? '••••••••' : '') + '"></label>' +
      '<div class="inline" data-row="acc"><button type="submit" class="btn primary focusable">Salvar chave</button>' + androidBtn() + '</div>' +
      '<p class="note">Como pegar a chave grátis: console.cloud.google.com → ativar "YouTube Data API v3" → Credenciais → Criar chave de API.</p></form></div>';
    if (!u) return '<div class="center" style="min-height:auto"><div class="panel"><h1>Minha Conta</h1><p>Entre para ver sua assinatura.</p><div class="inline" data-row="acc"><button class="btn primary focusable" data-act="login">Entrar</button></div></div></div>';
    var status = { trial: 'Teste grátis', active: 'Assinante', expired: 'Teste encerrado', blocked: 'Bloqueado' }[u.status] || u.status;
    var refLink = location.origin + '/?ref=' + encodeURIComponent(u.referralCode || '');
    return '<div class="center" style="min-height:auto"><div class="panel"><h1>Olá, ' + esc(u.name.split(' ')[0]) + '!</h1>' +
      '<dl class="kv"><dt>Status</dt><dd>' + esc(status) + '</dd>' +
      (u.status === 'trial' ? '<dt>Teste termina</dt><dd>' + fmtDate(u.trialEndsAt) + ' (' + daysLeft(u.trialEndsAt) + ' dia(s))</dd>' : '') +
      (u.paidUntil ? '<dt>Assinatura até</dt><dd>' + fmtDate(u.paidUntil) + '</dd>' : '') +
      (u.founder ? '<dt>Plano</dt><dd>Fundador — ' + money(st.promoPrice) + '/mês travado</dd>' : '') +
      '<dt>E-mail</dt><dd>' + esc(u.email) + '</dd>' +
      '<dt>Indique e ganhe</dt><dd>Cada amigo que assinar com seu código te dá +' + esc(st.referralBonusDays || 7) + ' dias grátis.<br>Seu código: <b>' + esc(u.referralCode) + '</b><br><span class="note">' + esc(refLink) + '</span></dd></dl>' +
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
      '<span class="note">Restam ' + st.promoRemaining + ' de ' + st.promoSlots + ' vagas com esse preço. Depois fica ' + money(st.regularPrice) + '/mês.</span></div>';
  }

  function renderWelcome() {
    var st = S.settings;
    root.innerHTML = '<div class="center"><div class="panel">' +
      '<div class="brand" style="margin-bottom:1rem">' + brandHtml() + '</div>' +
      '<h1>TV aberta, canais grátis, filmes e jogos — tudo no controle remoto.</h1>' +
      '<p>Funciona na Smart TV, TV Box, PC e celular. Teste grátis por <b>' + st.trialDays + ' dias</b>, sem cartão.</p>' +
      promoHtml() +
      '<div class="stack" data-row="w">' +
        '<button class="btn primary focusable" data-act="register">Testar grátis por ' + st.trialDays + ' dias</button>' +
        '<button class="btn ghost focusable" data-act="login">Já tenho conta</button>' + androidBtn() +
      '</div><p class="note" style="margin-top:1.2rem">Só usamos fontes oficiais e legais. Canais pagos exigem assinatura nos apps oficiais.</p></div></div>';
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
        toast(reg ? '🎉 Conta criada! Aproveite seu teste grátis.' : 'Bem-vindo de volta!');
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
      '<p class="note">Vai abrir o site/app oficial. Se pedir login, o cadastro é gratuito.</p>' +
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
    toast('Abrindo app oficial…');
    var w = null;
    try { w = window.open(url, '_blank', 'noopener'); } catch (e) {}
    if (!w) location.href = url;
  }

  // ---------------- assinatura ----------------
  function openPaywall(reason, game) {
    if (LOCAL) return;
    S.rewardGame = game || null;
    if (!S.user) { renderAuth('register'); return; }
    var st = S.settings, promo = st.promoRemaining > 0 || S.user.founder;
    var price = promo ? st.promoPrice : st.regularPrice;
    openModal('<h2>Assine o ' + esc(st.productName) + '</h2>' +
      '<p>' + esc(reason || 'Libere todos os jogos premium e continue com tudo depois do teste.') + '</p>' +
      '<div class="price">' + money(price) + ' <small>/ ' + st.planDays + ' dias</small></div>' +
      (S.user.founder ? '<p class="note">Você é fundador: seu preço especial fica travado.</p>' : promoHtml()) +
      '<div id="paybox"><div class="inline" data-row="pay">' +
        (st.pixEnabled ? '<button class="btn primary focusable" data-act="pix">Pagar com Pix</button>' : '') +
        (st.mpEnabled ? '<button class="btn ghost focusable" data-act="mp">Cartão ou Pix (Mercado Pago)</button>' : '') +
        (game && Ads.rewardedAvailable() ? '<button class="btn hot focusable" data-act="reward">🎬 Ver 1 anúncio e jogar 30 min</button>' : '') +
        (st.supportWhatsapp ? '<button class="btn ghost focusable" data-act="support">💬 Falar no WhatsApp</button>' : '') +
        '<button class="btn ghost focusable" data-act="close">Agora não</button></div>' +
        '<p class="note">Assinantes: todos os jogos liberados e <b>sem anúncios</b>.</p>' +
        (!st.pixEnabled && !st.mpEnabled ? '<p class="note">Pagamento ainda não configurado pelo dono. Fale com o suporte.</p>' : '') +
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
          refreshMe().then(function () { closeModal(); toast('🎉 Pagamento confirmado! Assinatura ativa.'); renderHome(); });
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
    scope.querySelectorAll('.tile').forEach(function (b) {
      b.addEventListener('click', function () { openItem(b.getAttribute('data-id'), b.getAttribute('data-rowid')); });
    });
    scope.querySelectorAll('[data-act]').forEach(bindAct);
  }

  function doAct(act, el) {
    if (act === 'register') return renderAuth('register');
    if (act === 'login') return renderAuth('login');
    if (act === 'welcome') return renderWelcome();
    if (act === 'server') { if (window.AndroidTV && AndroidTV.resetServer) AndroidTV.resetServer(); return; }
    if (act === 'local') { if (window.AndroidTV && AndroidTV.useLocal) AndroidTV.useLocal(); return; }
    if (act === 'close') return closeModal();
    if (act === 'paywall') return openPaywall();
    if (act === 'pix') return checkout('pix');
    if (act === 'mtipo') { S.mediaTipo = S.mediaTipo === 'videos' ? 'music' : 'videos'; el.textContent = S.mediaTipo === 'videos' ? '🎬 Vídeos' : '🎵 Músicas'; return; }
    if (act === 'reward') {
      var g = S.rewardGame;
      return Ads.rewarded('premium-' + (g && g.id), function () {
        unlock(g.id); closeModal(); toast('🎉 Liberado por 30 minutos!');
        if (g.kind === 'game') startGame(g, 'jogos');
      }, function () { toast('Nenhum anúncio disponível agora. Tente mais tarde ou assine.'); });
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
        toast('Aviso enviado ao dono ✅');
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
    var list = rowsIndex[rowId] || [];
    var it = list.filter(function (x) { return x.id === id; })[0] || itemById(id);
    if (!it) return;
    var acc = access();
    if (it.kind === 'game') {
      if (it.premium && !acc.premium && !unlocked(it.id)) return openPaywall(S.user && S.user.status === 'expired' ? 'Seu teste terminou. Assine para continuar jogando os jogos premium.' : '"' + it.name + '" é um jogo premium.', it);
      return startGame(it, rowId);
    }
    if (it.kind === 'yt' || it.kind === 'audio') {
      if (!acc.tv) return openPaywall('Seu teste terminou. Assine para continuar.');
      if (S.settings.premiumNovidades !== false && !acc.premium && !unlocked('midia'))
        return openPaywall('🎵 Música e Vídeos é um lançamento exclusivo para assinantes.', { id: 'midia', name: 'Música e Vídeos' });
      return MediaPlayer.open(list.length ? list : [it], Math.max(0, list.indexOf(it)));
    }
    if (!acc.tv) return openPaywall('Seu teste terminou. Assine para continuar assistindo.');
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
    var fallback = { channelId: it.channelId || null, live: it.live !== false };
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
    if (Player.isOpen() || GameHub.isOpen() || MediaPlayer.isOpen()) return true;
    if (S.modalOpen) { closeModal(); return true; }
    if (root.querySelector('#authf')) { renderWelcome(); return true; }
    if (S.tab !== 'inicio' && root.querySelector('.topbar')) { S.tab = 'inicio'; renderHome(); return true; }
    return false; // na tela inicial: deixa o app/TV sair
  }

  // Ações globais (prioridade mais baixa: player e jogos interceptam antes)
  Input.on(function (a) {
    if (Player.isOpen() || GameHub.isOpen() || MediaPlayer.isOpen()) return false;
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

  function boot() {
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
    resolveYoutube: resolveYoutube, restoreFocus: restoreFocus, back: back, state: S
  };
  window.UI = { toast: toast };
  boot();
})();

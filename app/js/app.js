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
      return { id: g.id, name: g.name, emoji: g.emoji, color: g.color, desc: g.desc, help: g.help,
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
    var tabs = [['inicio', 'Início'], ['tv', 'TV ao Vivo'], ['filmes', 'Filmes e Séries'], ['jogos', 'Jogos'], ['conta', 'Minha Conta']];
    return '<header class="topbar"><div class="brand">' + brandHtml() + '</div><nav class="tabs" data-row="tabs">' +
      tabs.map(function (t) { return '<button class="tab focusable' + (S.tab === t[0] ? ' active' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') +
      '</nav><div class="spacer"></div>' + pill + '</header>';
  }

  function brandHtml() {
    var n = S.settings.productName || 'Accioly Play';
    var parts = n.split(' ');
    if (parts.length < 2) return esc(n);
    return esc(parts.slice(0, -1).join(' ')) + ' <b>' + esc(parts[parts.length - 1]) + '</b>';
  }

  function tile(it, rowId) {
    var badge, lock = false, acc = access();
    if (it.kind === 'game') {
      badge = it.premium ? '<span class="badge premium">PREMIUM</span>' : '<span class="badge free">GRÁTIS</span>';
      lock = it.premium && !acc.premium;
    } else {
      badge = it.type === 'link' ? '<span class="badge app">APP OFICIAL</span>' : '<span class="badge live">● AO VIVO</span>';
      lock = !acc.tv;
    }
    return '<button class="tile focusable" style="--c:' + esc(it.color || '#334') + '" data-id="' + esc(it.id) + '" data-rowid="' + esc(rowId) + '">' +
      badge + (isFav(it.id) ? '<span class="fav">★</span>' : '') +
      (it.emoji ? '<span class="emoji">' + it.emoji + '</span>' : '') +
      '<span class="name">' + esc(it.name) + '</span>' + (lock ? '<span class="lock">🔒</span>' : '') + '</button>';
  }

  var rowsIndex = {}; // rowId -> lista de itens (para trocar de canal com ▲▼)
  function row(id, title, items) {
    if (!items.length) return '';
    rowsIndex[id] = items;
    return '<section class="row"><h2>' + esc(title) + '</h2><div class="track" data-row="' + esc(id) + '">' +
      items.map(function (it) { return tile(it, id); }).join('') + '</div></section>';
  }

  function catItems(cat) { return S.catalog.items.filter(function (i) { return i.cat === cat && i.enabled !== false; }); }

  function heroHtml() {
    var st = S.settings, acc = access();
    var title = st.heroTitle || 'Sua TV completa: canais ao vivo, filmes grátis e jogos no controle.';
    var text = st.heroText || 'TV aberta, notícias 24h, esportes, novelas, desenhos e 8 jogos para jogar com o controle remoto ou com controle de videogame. Tudo de fontes oficiais.';
    var cta = '';
    if (!LOCAL && S.online && S.user && !acc.premium) cta = '<button class="btn hot focusable" data-act="paywall">Assinar por ' + money(st.promoRemaining > 0 ? st.promoPrice : st.regularPrice) + '/mês</button>';
    return '<section class="hero"><h1>' + esc(title) + '</h1><p>' + esc(text) + '</p><div class="actions" data-row="hero">' +
      '<button class="btn primary focusable" data-act="watch">▶ Assistir agora</button>' +
      '<button class="btn ghost focusable" data-tab="jogos">🎮 Jogar</button>' + cta + '</div></section>';
  }

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
      html += row('abertos', catName('abertos'), catItems('abertos'));
      html += row('jogos', '🎮 Jogos no controle remoto', games());
      cats.forEach(function (c) { if (c.id !== 'abertos') html += row(c.id, c.name, catItems(c.id)); });
    } else if (S.tab === 'tv') {
      cats.forEach(function (c) { if (c.id !== 'filmes') html += row(c.id, c.name, catItems(c.id)); });
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
    bindRoot();
    var first = root.querySelector('.tab.active');
    var target = (S.lastFocusSel && root.querySelector(S.lastFocusSel)) || root.querySelector('.hero .btn') || root.querySelector('.tile') || first;
    S.lastFocusSel = null;
    Input.focus(target);
  }

  function accountHtml() {
    var u = S.user, st = S.settings;
    if (LOCAL) return '<div class="center" style="min-height:auto"><div class="panel"><h1>Modo Dono</h1><p>Você está usando a versão do pendrive. Tudo liberado, sem login. Para vender para clientes, use o servidor (veja o arquivo LEIA-ME).</p></div></div>';
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
        '<button class="btn ghost focusable" data-act="logout">Sair</button>' +
      '</div></div></div>';
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
        '<button class="btn ghost focusable" data-act="login">Já tenho conta</button>' +
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
  function openPaywall(reason) {
    if (LOCAL) return;
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
        (st.supportWhatsapp ? '<button class="btn ghost focusable" data-act="support">💬 Falar no WhatsApp</button>' : '') +
        '<button class="btn ghost focusable" data-act="close">Agora não</button></div>' +
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
    return api('GET', '/api/me').then(function (r) { S.user = r.user; S.settings = Object.assign({}, S.settings, r.settings || {}); });
  }

  // ---------------- ações ----------------
  function bindAct(el) {
    el.addEventListener('click', function () { doAct(el.getAttribute('data-act'), el); });
  }
  function bindRoot() {
    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { S.tab = b.getAttribute('data-tab'); S.lastFocusSel = '.tab[data-tab="' + S.tab + '"]'; renderHome(); });
    });
    root.querySelectorAll('.tile').forEach(function (b) {
      b.addEventListener('click', function () { openItem(b.getAttribute('data-id'), b.getAttribute('data-rowid')); });
    });
    root.querySelectorAll('[data-act]').forEach(bindAct);
  }

  function doAct(act, el) {
    if (act === 'register') return renderAuth('register');
    if (act === 'login') return renderAuth('login');
    if (act === 'welcome') return renderWelcome();
    if (act === 'close') return closeModal();
    if (act === 'paywall') return openPaywall();
    if (act === 'pix') return checkout('pix');
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
      if (it.premium && !acc.premium) return openPaywall(S.user && S.user.status === 'expired' ? 'Seu teste terminou. Assine para continuar jogando os jogos premium.' : '"' + it.name + '" é um jogo premium.');
      pushRecent(it.id);
      return GameHub.start(it.id, function () { renderHome(); });
    }
    if (!acc.tv) return openPaywall('Seu teste terminou. Assine para continuar assistindo.');
    pushRecent(it.id);
    if (it.type === 'link') return openDetail(it);
    var playable = list.filter(function (x) { return x.kind !== 'game' && x.type !== 'link'; });
    if (playable.indexOf(it) < 0) playable = [it];
    Player.open(playable, playable.indexOf(it));
  }

  var ytCache = {};
  function resolveYoutube(it) {
    if (it.channelId) return Promise.resolve(it.channelId);
    if (LOCAL || !S.online || !it.handle) return Promise.resolve(null);
    if (ytCache[it.handle] !== undefined) return Promise.resolve(ytCache[it.handle]);
    return api('GET', '/api/yt/resolve?handle=' + encodeURIComponent(it.handle))
      .then(function (r) { ytCache[it.handle] = r.channelId || null; return ytCache[it.handle]; })
      .catch(function () { return null; });
  }

  function back() {
    if (Player.isOpen() || GameHub.isOpen()) return true;
    if (S.modalOpen) { closeModal(); return true; }
    if (root.querySelector('#authf')) { renderWelcome(); return true; }
    if (S.tab !== 'inicio' && root.querySelector('.topbar')) { S.tab = 'inicio'; renderHome(); return true; }
    return false; // na tela inicial: deixa o app/TV sair
  }

  // Ações globais (prioridade mais baixa: player e jogos interceptam antes)
  Input.on(function (a) {
    if (Player.isOpen() || GameHub.isOpen()) return false;
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
    document.title = S.settings.productName;
  }

  function boot() {
    S.token = lsGet('ap_token', null);
    var ref = (new URLSearchParams(location.search)).get('ref');
    if (ref) lsSet('ap_ref', ref);
    if ('serviceWorker' in navigator && !isFile) navigator.serviceWorker.register('sw.js').catch(function () {});
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

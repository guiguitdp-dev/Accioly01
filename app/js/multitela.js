/*
 * Multitela: até 4 canais ao mesmo tempo (como o "multiview" das TVs por assinatura).
 * O som vem da tela em foco; OK abre o menu da tela (tela cheia ou trocar canal).
 * ES5 puro (TVs antigas). Em aparelho fraco (modo leve) mostra só 2 telas.
 */
(function () {
  var st = null;
  var hlsP = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (!hlsP) hlsP = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'vendor/hls.min.js'; s.onload = function () { res(window.Hls); }; s.onerror = rej; document.head.appendChild(s); });
    return hlsP;
  }
  function ytCmd(f, func) { try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*'); } catch (e) {} }

  function open(items, all) {
    if (st) close(true);
    var max = window.Prefs && Prefs.leve && Prefs.leve() ? 2 : 4;
    var list = items.slice(0, max);
    for (var i = 0; list.length < Math.min(max, all.length) && i < all.length; i++) if (list.indexOf(all[i]) < 0) list.push(all[i]);
    var el = document.createElement('div');
    el.className = 'screen';
    el.id = 'multi';
    document.body.appendChild(el);
    st = { el: el, list: list, all: all, cells: [], active: 0, off: Input.on(onAction), menu: null };
    el.innerHTML = '<div class="mt-grid n' + list.length + '">' + list.map(function (it, k) {
      return '<button class="mt-cell focusable" data-i="' + k + '"><div class="mt-media"><div class="spinner"></div></div><span class="mt-name"></span><span class="mt-snd">🔊</span></button>';
    }).join('') + '</div><div class="mt-help">🖥️ Multitela · setas escolhem a tela (o som vem dela) · OK: tela cheia ou trocar canal · VOLTAR sai</div>';
    el.querySelectorAll('.mt-cell').forEach(function (b) {
      var k = +b.getAttribute('data-i');
      b.addEventListener('focus', function () { setAudio(k); });
      b.addEventListener('click', function () { cellMenu(k); });
    });
    list.forEach(function (it, k) { load(k, it); });
    Input.focus(el.querySelector('.mt-cell'));
  }

  function cellEl(k) { return st && st.el.querySelector('.mt-cell[data-i="' + k + '"]'); }

  function unload(k) {
    var c = st.cells[k];
    if (!c) return;
    try { if (c.hls) c.hls.destroy(); } catch (e) {}
    try { if (c.video) { c.video.pause(); c.video.removeAttribute('src'); c.video.load(); } } catch (e) {}
    st.cells[k] = null;
  }

  function load(k, it) {
    unload(k);
    st.list[k] = it;
    var b = cellEl(k), media = b.querySelector('.mt-media');
    media.innerHTML = '<div class="spinner"></div>';
    b.querySelector('.mt-name').textContent = (App.channelNumber(it.id) ? App.channelNumber(it.id) + ' · ' : '') + it.name;
    var cell = { it: it };
    st.cells[k] = cell;
    if (it.type === 'hls') {
      var v = document.createElement('video');
      v.muted = true; v.autoplay = true; v.playsInline = true; v.setAttribute('playsinline', '');
      media.innerHTML = ''; media.appendChild(v);
      cell.video = v;
      if (v.canPlayType('application/vnd.apple.mpegurl') && !window.MediaSource) { v.src = it.url; v.play().catch(function () {}); }
      else loadHls().then(function (Hls) {
        if (!st || st.cells[k] !== cell) return;
        var h = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 10 });
        h.loadSource(it.url); h.attachMedia(v); cell.hls = h;
        h.on(Hls.Events.MANIFEST_PARSED, function () { v.play().catch(function () {}); });
      }).catch(function () { media.innerHTML = '<p class="mt-off">Sinal indisponível</p>'; });
      if (k === st.active) setAudio(k);
      return;
    }
    App.resolveYoutube(it).then(function (yt) {
      if (!st || st.cells[k] !== cell) return;
      if (!yt.channelId || location.protocol === 'file:') { media.innerHTML = '<p class="mt-off">Este canal abre só no YouTube</p>'; return; }
      var src = yt.live ? 'https://www.youtube.com/embed/live_stream?channel=' + encodeURIComponent(yt.channelId)
        : 'https://www.youtube.com/embed/videoseries?list=UU' + encodeURIComponent(yt.channelId.slice(2));
      var f = document.createElement('iframe');
      f.allow = 'autoplay; encrypted-media';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.setAttribute('tabindex', '-1');
      f.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 'autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&hl=pt&origin=' + encodeURIComponent(location.origin);
      media.innerHTML = ''; media.appendChild(f);
      cell.iframe = f;
      f.addEventListener('load', function () { if (st && st.active === k) setAudio(k); });
    });
  }

  // Só a tela em foco tem som
  function setAudio(k) {
    if (!st) return;
    st.active = k;
    st.cells.forEach(function (c, i) {
      if (!c) return;
      var on = i === k;
      if (c.video) { c.video.muted = !on; if (on) c.video.play().catch(function () {}); }
      if (c.iframe) ytCmd(c.iframe, on ? 'unMute' : 'mute');
      var b = cellEl(i); if (b) b.classList.toggle('som', on);
    });
  }

  // Menu da tela: tela cheia ou trocar de canal
  function cellMenu(k) {
    var it = st.list[k];
    var m = document.createElement('div');
    m.className = 'mt-menu';
    m.innerHTML = '<div class="mt-box"><h3>' + esc(it.name) + '</h3><div class="inline">' +
      '<button class="btn primary focusable" data-m="full">⛶ Tela cheia</button><button class="btn ghost focusable" data-m="troca">🔄 Trocar canal</button>' +
      '<button class="btn ghost focusable" data-m="fecha">Voltar</button></div></div>';
    st.el.appendChild(m);
    st.menu = m;
    m.querySelector('[data-m=full]').addEventListener('click', function () {
      var all = st.all, idx = all.indexOf(it);
      close(true);
      Player.open(idx >= 0 ? all : [it], idx >= 0 ? idx : 0);
    });
    m.querySelector('[data-m=troca]').addEventListener('click', function () { pickChannel(k); });
    m.querySelector('[data-m=fecha]').addEventListener('click', closeMenu);
    Input.focus(m.querySelector('.focusable'));
  }
  function pickChannel(k) {
    var m = st.menu;
    m.innerHTML = '<div class="mt-box mt-pick"><h3>Escolha o canal para esta tela</h3><div class="mt-list">' + st.all.map(function (c, i) {
      return '<button class="btn ghost focusable" data-c="' + i + '">' + (App.channelNumber(c.id) || '') + ' · ' + esc(c.name) + '</button>';
    }).join('') + '</div></div>';
    m.querySelectorAll('[data-c]').forEach(function (b) {
      b.addEventListener('click', function () { var c = st.all[+b.getAttribute('data-c')]; closeMenu(); load(k, c); Input.focus(cellEl(k)); });
    });
    Input.focus(m.querySelector('.focusable'));
  }
  function closeMenu() {
    if (!st || !st.menu) return;
    st.menu.parentNode.removeChild(st.menu);
    st.menu = null;
    Input.focus(cellEl(st.active));
  }

  function onAction(a) {
    if (!st) return false;
    var scope = st.menu || st.el;
    if (a === 'back') { if (st.menu) closeMenu(); else close(); return true; }
    if (a === 'left' || a === 'right' || a === 'up' || a === 'down') { Input.move(a, scope); return true; }
    if (a === 'ok') { var f = document.activeElement; if (f && scope.contains(f)) f.click(); return true; }
    return true;
  }

  function close(silent) {
    if (!st) return;
    for (var k = 0; k < st.cells.length; k++) unload(k);
    if (st.off) st.off();
    if (st.el.parentNode) st.el.parentNode.removeChild(st.el);
    st = null;
    if (!silent && window.App) App.restoreFocus();
  }

  window.Multi = { open: open, close: close, isOpen: function () { return !!st; } };
})();

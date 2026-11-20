/*
 * Player: toca sinais HLS oficiais (.m3u8) e lives oficiais do YouTube.
 * Canais tipo "link" abrem o site/app oficial.
 * Controles: ▲/▼ troca de canal, OK mostra o menu, VOLTAR sai.
 */
(function () {
  var hlsLoading = null;
  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsLoading) return hlsLoading;
    hlsLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'vendor/hls.min.js';
      s.onload = function () { resolve(window.Hls); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return hlsLoading;
  }

  var state = null; // { list, index, el, hls, timer, off }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function open(list, index) {
    close(true);
    state = { list: list, index: index };
    var el = document.createElement('div');
    el.className = 'screen';
    el.id = 'player';
    document.body.appendChild(el);
    state.el = el;
    state.off = Input.on(onAction);
    // celular: tocar no vídeo mostra os botões
    el.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('button')) return;
      if (!osdVisible()) { showOsd(); var b = el.querySelector('.focusable'); if (b) Input.focus(b); }
    });
    render();
  }

  function current() { return state.list[state.index]; }

  function render() {
    var it = current();
    destroyMedia();
    var el = state.el;
    el.innerHTML =
      '<div class="msg" id="pmsg"><div class="box"><div class="spinner"></div><div>Sintonizando <b>' + esc(it.name) + '</b>…</div></div></div>' +
      '<div class="osd" id="osd">' +
        '<div class="title"><span class="live" id="plabel">AO VIVO</span>' + esc(it.name) + '</div>' +
        '<div class="sub">' + esc(it.desc || '') + '</div>' +
        zapHint() +
        '<div class="inline">' +
          '<button class="btn ghost focusable" data-a="back">◀ Voltar</button>' +
          '<button class="btn ghost focusable" data-a="prev">▲ Canal anterior</button>' +
          '<button class="btn ghost focusable" data-a="next">▼ Próximo canal</button>' +
          '<button class="btn ghost focusable" data-a="fav">' + (App.isFav(it.id) ? '★ Favorito' : '☆ Favoritar') + '</button>' +
          (it.fallback || it.handle || it.channelId ? '<button class="btn ghost focusable" data-a="site">↗ ' + (it.android ? 'Abrir no app oficial' : 'Abrir no site oficial') + '</button>' : '') +
        '</div>' +
        '<div class="note" style="margin-top:.8rem">▲/▼ troca de canal · OK abre este menu · VOLTAR sai</div>' +
      '</div>';
    el.querySelectorAll('[data-a]').forEach(function (b) {
      b.addEventListener('click', function () { doAction(b.getAttribute('data-a')); });
    });
    showOsd();
    App.track('play', it.id);
    if (it.type === 'hls') playHls(it);
    else if (it.type === 'youtube') playYoutube(it);
  }

  // Mostra qual é o canal anterior/próximo (como um guia de TV)
  function zapHint() {
    var n = state.list.length;
    if (n < 2) return '';
    var prev = state.list[(state.index - 1 + n) % n], next = state.list[(state.index + 1) % n];
    return '<div class="zap">▲ ' + esc(prev.name) + ' &nbsp;·&nbsp; ▼ ' + esc(next.name) + '</div>';
  }

  function setMsg(html) {
    var m = state && state.el.querySelector('#pmsg');
    if (!m) return;
    if (!html) { m.classList.add('hidden'); return; }
    m.classList.remove('hidden');
    m.innerHTML = '<div class="box">' + html + '</div>';
  }

  function failed(it, why) {
    setMsg('<div style="font-size:2.4rem">📡</div><h2>Sinal indisponível agora</h2><p class="note">' + esc(why || 'A emissora pode estar fora do ar ou bloqueando sua região.') + '</p>' +
      ((it.fallback || it.handle) ? '<p>Use o botão <b>↗ Abrir no site oficial</b> abaixo.</p>' : '') );
    showOsd(true);
  }

  function playHls(it) {
    var v = document.createElement('video');
    v.setAttribute('playsinline', '');
    v.autoplay = true;
    v.controls = false;
    state.el.insertBefore(v, state.el.firstChild);
    state.video = v;
    v.addEventListener('playing', function () { setMsg(null); });
    v.addEventListener('error', function () { failed(it); });
    var native = v.canPlayType('application/vnd.apple.mpegurl');
    if (native) { v.src = it.url; v.play().catch(function () {}); return; }
    loadHls().then(function (Hls) {
      if (!state || current() !== it) return;
      if (!Hls.isSupported()) { v.src = it.url; return; }
      var hls = new Hls({ lowLatencyMode: false, backBufferLength: 30 });
      state.hls = hls;
      var fatalCount = 0;
      hls.on(Hls.Events.ERROR, function (_e, data) {
        if (!data.fatal) return;
        fatalCount++;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && fatalCount < 3) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && fatalCount < 3) hls.recoverMediaError();
        else { hls.destroy(); state.hls = null; failed(it); }
      });
      hls.loadSource(it.url);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, function () { v.play().catch(function () { setMsg('Pressione OK para iniciar o som.'); }); });
    }).catch(function () { failed(it, 'Não foi possível carregar o player.'); });
  }

  function playYoutube(it) {
    var fileMode = location.protocol === 'file:';
    App.resolveYoutube(it).then(function (yt) {
      if (!state || current() !== it) return;
      var channelId = yt.channelId;
      if (!channelId || fileMode) {
        setMsg('<div style="font-size:2.4rem">▶️</div><h2>' + esc(it.name) + '</h2><p>Este canal abre no YouTube oficial.</p>' +
          '<button class="btn primary focusable" id="ytopen">Abrir no YouTube</button>');
        var b = state.el.querySelector('#ytopen');
        b.addEventListener('click', function () { App.openExternal(ytUrl(it), 'com.google.android.youtube.tv'); });
        Input.focus(b);
        return;
      }
      var src;
      if (yt.live) {
        src = 'https://www.youtube.com/embed/live_stream?channel=' + encodeURIComponent(channelId);
      } else {
        // Sem transmissão agora: toca os vídeos mais recentes do canal oficial
        src = 'https://www.youtube.com/embed/videoseries?list=UU' + encodeURIComponent(channelId.slice(2));
        var lbl = state.el.querySelector('#plabel');
        if (lbl) { lbl.textContent = 'VÍDEOS RECENTES'; lbl.style.background = '#334155'; }
      }
      var f = document.createElement('iframe');
      f.id = 'chiframe';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 'autoplay=1&controls=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=' + encodeURIComponent(location.origin);
      f.addEventListener('load', function () { setMsg(null); });
      state.el.insertBefore(f, state.el.firstChild);
      state.iframe = f;
      // Se a emissora bloquear a exibição fora do YouTube (ex.: jogos com direitos), mostra a saída
      if (window.loadYouTubeApi) window.loadYouTubeApi().then(function () {
        if (!state || state.iframe !== f) return;
        try {
          new YT.Player(f, { events: { onError: function () {
            failed(it, 'Esta transmissão só pode ser vista no YouTube (a emissora bloqueou a exibição em outros apps).');
          } } });
        } catch (e) {}
      }).catch(function () {});
    });
  }

  function ytUrl(it) { return it.handle ? 'https://www.youtube.com/' + it.handle + '/live' : 'https://www.youtube.com/channel/' + it.channelId + '/live'; }

  function destroyMedia() {
    if (!state) return;
    if (state.hls) { try { state.hls.destroy(); } catch (e) {} state.hls = null; }
    if (state.video) { try { state.video.pause(); state.video.removeAttribute('src'); state.video.load(); } catch (e) {} state.video = null; }
    if (state.iframe) { state.iframe.src = 'about:blank'; state.iframe = null; }
  }

  function showOsd(stay) {
    var o = state && state.el.querySelector('#osd');
    if (!o) return;
    o.classList.remove('hide');
    clearTimeout(state.timer);
    if (!stay) state.timer = setTimeout(function () { if (state) { o.classList.add('hide'); if (document.activeElement) document.activeElement.blur(); } }, 5000);
  }

  function osdVisible() {
    var o = state && state.el.querySelector('#osd');
    return o && !o.classList.contains('hide');
  }

  function zap(delta) {
    var n = state.list.length;
    var i = state.index;
    for (var k = 0; k < n; k++) {
      i = (i + delta + n) % n;
      if (state.list[i].type !== 'link') break;
    }
    state.index = i;
    render();
    App.toast('📺 ' + current().name);
  }

  function doAction(a) {
    var it = current();
    if (a === 'back') return close();
    if (a === 'prev') return zap(-1);
    if (a === 'next') return zap(1);
    if (a === 'fav') { App.toggleFav(it.id); var b = state.el.querySelector('[data-a=fav]'); if (b) b.textContent = App.isFav(it.id) ? '★ Favorito' : '☆ Favoritar'; return; }
    if (a === 'site') return App.openExternal(it.fallback || ytUrl(it), it.android || (it.type === 'youtube' && !it.fallback ? 'com.google.android.youtube.tv' : ''));
  }

  function onAction(a) {
    if (!state) return false;
    if (a === 'back') { close(); return true; }
    if (!osdVisible()) {
      if (a === 'up') { zap(-1); return true; }
      if (a === 'down') { zap(1); return true; }
      if (state.video && state.video.paused && a === 'ok') { state.video.play().catch(function () {}); }
      showOsd();
      var first = state.el.querySelector('.focusable');
      if (first) Input.focus(first);
      return true;
    }
    showOsd();
    if (a === 'ok') { var f = document.activeElement; if (f && f.click && state.el.contains(f)) f.click(); return true; }
    if (a === 'left' || a === 'right' || a === 'up' || a === 'down') { Input.move(a, state.el); return true; }
    return true;
  }

  function close(silent) {
    if (!state) return;
    destroyMedia();
    clearTimeout(state.timer);
    if (state.off) state.off();
    if (state.el && state.el.parentNode) state.el.parentNode.removeChild(state.el);
    state = null;
    if (!silent && window.App) App.restoreFocus();
  }

  window.Player = { open: open, close: close, isOpen: function () { return !!state; } };
})();

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

  // Timer para desligar (vale para todos os canais até acabar)
  var sleepAt = 0;
  setInterval(function () {
    if (sleepAt && Date.now() >= sleepAt) { sleepAt = 0; if (state) { close(); App.toast('😴 Desligado pelo timer. Boa noite!'); } }
  }, 15000);

  function open(list, index) {
    var prevId = state && state.list[state.index] ? state.list[state.index].id : null;
    close(true);
    state = { list: list, index: index, lastId: prevId, num: '' };
    document.addEventListener('keydown', onDigit, true);
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
        '<div class="title">' + (App.channelNumber(it.id) ? '<span class="pnum">' + App.channelNumber(it.id) + '</span>' : '') + '<span class="live" id="plabel">AO VIVO</span>' + esc(it.name) + '<span class="qbadge" id="pq"></span></div>' +
        '<div class="sub">' + (App.capaTitle(it.id) ? '▶ Agora: ' + esc(App.capaTitle(it.id)) : esc(it.desc || '')) + (sleepAt ? ' · 😴 desliga em ' + Math.max(1, Math.round((sleepAt - Date.now()) / 60000)) + ' min' : '') + '</div>' +
        zapHint() +
        '<div class="inline">' +
          '<button class="btn ghost focusable" data-a="back">◀ Voltar</button>' +
          '<button class="btn ghost focusable" data-a="prev">▲ Canal anterior</button>' +
          '<button class="btn ghost focusable" data-a="next">▼ Próximo canal</button>' +
          '<button class="btn primary focusable" data-a="opts">⚙️ Opções</button>' +
          '<button class="btn ghost focusable" data-a="guia">📋 Guia</button>' +
          (state.lastId ? '<button class="btn ghost focusable" data-a="last">↩ Último canal</button>' : '') +
          '<button class="btn ghost focusable" data-a="fav">' + (App.isFav(it.id) ? '★ Favorito' : '☆ Favoritar') + '</button>' +
          (it.fallback || it.handle || it.channelId ? '<button class="btn ghost focusable" data-a="site">↗ ' + (it.android ? 'Abrir no app oficial' : 'Abrir no site oficial') + '</button>' : '') +
        '</div>' +
        '<div class="note" style="margin-top:.8rem">▲/▼ troca de canal · números do controle vão direto ao canal · ◀ abre o guia · OK abre este menu · VOLTAR sai</div>' +
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

  function setQuality(txt) { var q = state && state.el.querySelector('#pq'); if (q) { q.textContent = txt || ''; q.style.display = txt ? '' : 'none'; } }

  function openOptions() {
    clearTimeout(state.timer);
    var SL = [0, 15, 30, 60, 90, 120];
    var rows = MediaOptions.rows({
      video: state.video, hls: state.hls, ytp: state.ytp, frameEl: state.video || state.iframe, iframe: !state.video, live: state.video ? true : state.live
    });
    rows.push({ label: '😴 Desligar em', values: SL.map(function (m) { return m ? m + ' min' : 'Não desligar'; }), index: 0,
      note: sleepAt ? 'Programado: desliga em ' + Math.max(1, Math.round((sleepAt - Date.now()) / 60000)) + ' min' : 'Fecha o canal sozinho (bom para dormir)',
      onChange: function (i) { sleepAt = SL[i] ? Date.now() + SL[i] * 60000 : 0; App.toast(SL[i] ? '😴 Desliga em ' + SL[i] + ' minutos' : 'Timer desligado'); } });
    OptionsSheet.open(state.el, 'Opções de vídeo', rows, function () { if (state) { showOsd(); Input.focus(state.el.querySelector('[data-a=opts]')); } });
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
    v.addEventListener('playing', function () { setMsg(null); setQuality(MediaOptions.qualityLabel(v.videoHeight)); });
    v.addEventListener('resize', function () { setQuality(MediaOptions.qualityLabel(v.videoHeight)); });
    v.addEventListener('error', function () { failed(it); });
    MediaOptions.applyFrame(v, false);
    MediaOptions.autoCaptions(v);
    var native = v.canPlayType('application/vnd.apple.mpegurl');
    if (native) { v.src = it.url; v.play().catch(function () {}); return; }
    loadHls().then(function (Hls) {
      if (!state || current() !== it) return;
      if (!Hls.isSupported()) { v.src = it.url; return; }
      var hls = new Hls({ lowLatencyMode: false, backBufferLength: 30, capLevelToPlayerSize: true, startLevel: -1 });
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
      f.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 'autoplay=1&controls=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&hl=pt' +
        (Prefs.get('legenda') === 'pt' ? '&cc_load_policy=1&cc_lang_pref=pt' : '') + '&origin=' + encodeURIComponent(location.origin);
      state.live = !!yt.live;
      MediaOptions.applyFrame(f, true);
      f.addEventListener('load', function () { setMsg(null); });
      state.el.insertBefore(f, state.el.firstChild);
      state.iframe = f;
      // Se a emissora bloquear a exibição fora do YouTube (ex.: jogos com direitos), mostra a saída
      if (window.loadYouTubeApi) window.loadYouTubeApi().then(function () {
        if (!state || state.iframe !== f) return;
        try {
          state.ytp = new YT.Player(f, { events: {
            onError: function () { failed(it, 'Esta transmissão só pode ser vista no YouTube (a emissora bloqueou a exibição em outros apps).'); },
            onPlaybackQualityChange: function (e) { setQuality(MediaOptions.ytQualityLabel(e.data)); },
            onReady: function () { if (Prefs.get('legenda') === 'pt') MediaOptions.captionsYT(state && state.ytp, true); }
          } });
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
    state.ytp = null;
    if (window.OptionsSheet && OptionsSheet.isOpen()) OptionsSheet.close();
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
    state.lastId = current().id;
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
    if (a === 'opts') return openOptions();
    if (a === 'guia') return openGuide();
    if (a === 'last') return goToId(state.lastId);
    if (a === 'prev') return zap(-1);
    if (a === 'next') return zap(1);
    if (a === 'fav') { App.toggleFav(it.id); var b = state.el.querySelector('[data-a=fav]'); if (b) b.textContent = App.isFav(it.id) ? '★ Favorito' : '☆ Favoritar'; return; }
    if (a === 'site') return App.openExternal(it.fallback || ytUrl(it), it.android || (it.type === 'youtube' && !it.fallback ? 'com.google.android.youtube.tv' : ''));
  }

  function onAction(a) {
    if (!state) return false;
    if (state.guide) {
      if (a === 'back' || a === 'right') { closeGuide(); return true; }
      if (a === 'up' || a === 'down') { Input.move(a, state.guide); return true; }
      if (a === 'ok') { var g = document.activeElement; if (g && state.guide.contains(g)) g.click(); return true; }
      return true;
    }
    if (a === 'back') { close(); return true; }
    if (!osdVisible() && a === 'left') { openGuide(); return true; }
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

  // Vai para um canal pela identificação (usado pelo número, guia e "último canal")
  function goToId(id) {
    if (!id) return;
    var all = App.allChannels(), i;
    for (i = 0; i < all.length; i++) if (all[i].id === id) break;
    if (i >= all.length) return;
    var acc = App.access();
    if (!acc.tv) { close(); return App.openPaywall('Seu teste terminou. Assine para continuar assistindo.'); }
    var old = current().id;
    state.list = all; state.index = i; state.lastId = old;
    App.pushRecent(id);
    render();
    App.toast('📺 ' + App.channelNumber(id) + ' · ' + current().name);
  }

  // Números do controle: digita "12" e vai para o canal 12 (como na TV a cabo)
  function onDigit(e) {
    if (!state || state.guide || (window.OptionsSheet && OptionsSheet.isOpen())) return;
    var k = e.key, d = /^[0-9]$/.test(k) ? k : (e.keyCode >= 96 && e.keyCode <= 105 ? String(e.keyCode - 96) : null);
    if (d === null) return;
    e.preventDefault(); e.stopPropagation();
    state.num = (state.num + d).slice(0, 3);
    var box = state.el.querySelector('#pnumin');
    if (!box) { box = document.createElement('div'); box.id = 'pnumin'; box.className = 'pnumin'; state.el.appendChild(box); }
    box.textContent = state.num + (state.num.length < 3 ? '_' : '');
    clearTimeout(state.numT);
    var go = function () {
      var n = parseInt(state.num, 10), all = App.allChannels();
      state.num = ''; if (box.parentNode) box.parentNode.removeChild(box);
      if (n >= 1 && n <= all.length) goToId(all[n - 1].id); else App.toast('Canal ' + n + ' não existe (vai até ' + all.length + ')');
    };
    if (state.num.length >= 3 || parseInt(state.num + '0', 10) > App.allChannels().length) go();
    else state.numT = setTimeout(go, 1600);
  }

  // Guia rápido: lista de canais com o que está passando (◀ abre, OK troca)
  function openGuide() {
    if (state.guide) return;
    clearTimeout(state.timer);
    var o = state.el.querySelector('#osd'); if (o) o.classList.add('hide');
    var all = App.allChannels(), cur = current().id;
    var g = document.createElement('div');
    g.className = 'pguide';
    g.innerHTML = '<div class="pg-head">📋 Guia de canais <small>OK troca · ▶ fecha</small></div><div class="pg-list">' + all.map(function (c, i) {
      var t = App.capaTitle(c.id), cov = App.coverUrl(c);
      return '<button class="pg-item focusable' + (c.id === cur ? ' atual' : '') + '" data-id="' + esc(c.id) + '">' +
        '<span class="pg-n">' + (i + 1) + '</span>' + (cov ? '<img src="' + esc(cov) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '<span class="pg-ph"></span>') +
        '<span class="pg-t"><b>' + esc(c.name) + '</b><small>' + esc(t ? 'Agora: ' + t : (c.desc || '')) + '</small></span></button>';
    }).join('') + '</div>';
    state.el.appendChild(g);
    state.guide = g;
    g.querySelectorAll('.pg-item').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-id'); closeGuide(); if (id !== current().id) goToId(id); }); });
    var at = g.querySelector('.pg-item.atual') || g.querySelector('.pg-item');
    if (at) { Input.focus(at); if (at.scrollIntoView) at.scrollIntoView({ block: 'center' }); }
  }
  function closeGuide() {
    if (!state || !state.guide) return;
    if (state.guide.parentNode) state.guide.parentNode.removeChild(state.guide);
    state.guide = null;
    showOsd();
    var b = state.el.querySelector('[data-a=guia]'); if (b) Input.focus(b);
  }

  function close(silent) {
    if (!state) return;
    document.removeEventListener('keydown', onDigit, true);
    clearTimeout(state.numT);
    destroyMedia();
    clearTimeout(state.timer);
    if (state.off) state.off();
    if (state.el && state.el.parentNode) state.el.parentNode.removeChild(state.el);
    state = null;
    if (!silent && window.App) App.restoreFocus();
  }

  window.addEventListener('resize', function () { if (state) MediaOptions.applyFrame(state.video || state.iframe, !state.video); });

  window.Player = { open: open, close: close, isOpen: function () { return !!state; } };
})();

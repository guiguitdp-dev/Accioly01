/*
 * Player de Música e Vídeos.
 *  - YouTube: player OFICIAL (IFrame API), com os anúncios do próprio YouTube.
 *    Toca a lista em sequência (quando um acaba, começa o próximo).
 *  - Música livre (Audius): áudio direto, sem anúncios.
 * Controle remoto: ▲/▼ anterior/próxima · ◀/▶ volta/avança 10s · OK abre o menu · VOLTAR sai.
 */
(function () {
  var st = null, ytLoading = null, errStreak = 0;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }

  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytLoading) return ytLoading;
    ytLoading = new Promise(function (resolve, reject) {
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (prev) prev(); resolve(); };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = function () { ytLoading = null; reject(new Error('YouTube indisponível')); };
      document.head.appendChild(s);
      setTimeout(function () { if (!(window.YT && window.YT.Player)) { ytLoading = null; reject(new Error('tempo esgotado')); } }, 15000);
    });
    return ytLoading;
  }

  function cur() { return st.list[st.index]; }

  function open(list, index) {
    close(true);
    errStreak = 0;
    var el = document.createElement('div');
    el.className = 'screen';
    el.id = 'mediaplayer';
    document.body.appendChild(el);
    st = { list: list, index: index, el: el };
    st.off = Input.on(onAction);
    el.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('button')) return;
      if (!osdVisible()) { showOsd(); var b = el.querySelector('#mtoggle'); if (b) Input.focus(b); }
    });
    build();
    play();
  }

  function build() {
    var it = cur(), yt = it.kind === 'yt';
    st.el.innerHTML =
      (yt ? '<div id="ytbox"></div>'
          : '<div class="audioview"><img id="aart" alt=""><div><div class="badge-free">🎧 MÚSICA LIVRE · SEM ANÚNCIOS</div><h1 id="atitle"></h1><p id="aartist"></p>' +
            '<div class="prog"><i id="aprog"></i></div><p class="note" id="atime">0:00</p></div><audio id="aud" preload="auto"></audio></div>') +
      '<div class="msg" id="mmsg"><div class="box"><div class="spinner"></div><div>Carregando…</div></div></div>' +
      '<div class="osd" id="mosd"><div class="title" id="mtitle"></div><div class="sub" id="msub"></div>' +
      '<div class="inline">' +
        '<button class="btn ghost focusable" data-m="back">◀ Voltar</button>' +
        '<button class="btn ghost focusable" data-m="prev">⏮ Anterior</button>' +
        '<button class="btn primary focusable" data-m="toggle" id="mtoggle">⏸ Pausar</button>' +
        '<button class="btn ghost focusable" data-m="next">⏭ Próxima</button>' +
      '</div><div class="note" style="margin-top:.8rem">' + (yt ? 'Player oficial do YouTube (pode exibir anúncios do YouTube). ' : '') +
      '▲/▼ anterior/próxima · ◀/▶ 10 segundos · OK menu · VOLTAR sai</div></div>';
    st.el.querySelectorAll('[data-m]').forEach(function (b) { b.addEventListener('click', function () { act(b.getAttribute('data-m')); }); });
    if (!yt) {
      var a = st.el.querySelector('#aud');
      st.audio = a;
      a.addEventListener('playing', function () { errStreak = 0; msg(null); setToggle(true); });
      a.addEventListener('pause', function () { setToggle(false); });
      a.addEventListener('ended', function () { move(1); });
      a.addEventListener('timeupdate', function () {
        var p = st && st.el.querySelector('#aprog'), t = st && st.el.querySelector('#atime');
        if (p && a.duration) p.style.width = (a.currentTime / a.duration * 100) + '%';
        if (t) t.textContent = fmt(a.currentTime) + ' / ' + fmt(a.duration);
      });
      a.addEventListener('error', function () { failed(); });
    }
  }

  function setToggle(playing) { var b = st && st.el.querySelector('#mtoggle'); if (b) b.textContent = playing ? '⏸ Pausar' : '▶ Tocar'; }
  function msg(html) {
    var m = st && st.el.querySelector('#mmsg');
    if (!m) return;
    if (!html) return m.classList.add('hidden');
    m.classList.remove('hidden'); m.innerHTML = '<div class="box">' + html + '</div>';
  }

  function failed(text) {
    errStreak++;
    if (errStreak >= 3) { msg('<h2>Não foi possível tocar agora</h2><p class="note">' + esc(text || 'Verifique a internet e tente de novo.') + '</p>'); showOsd(true); return; }
    App.toast('Indisponível, pulando para a próxima…');
    setTimeout(function () { if (st) move(1); }, 1200);
  }

  function play() {
    var it = cur();
    st.el.querySelector('#mtitle').textContent = it.title;
    st.el.querySelector('#msub').textContent = (it.channel || '') + (it.duration ? ' · ' + it.duration : '') + '   (' + (st.index + 1) + '/' + st.list.length + ')';
    App.track(it.kind === 'yt' ? 'yt' : 'music', it.id);
    showOsd();
    if (it.kind === 'yt') {
      msg('<div class="spinner"></div><div>Abrindo no player do YouTube…</div>');
      loadYT().then(function () {
        if (!st || cur() !== it) return;
        if (st.ytp && st.ytp.loadVideoById) { st.ytp.loadVideoById(it.id); return; }
        st.ytp = new YT.Player('ytbox', {
          width: '100%', height: '100%', videoId: it.id,
          playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1, modestbranding: 1, fs: 0, iv_load_policy: 3, origin: location.origin },
          events: {
            onReady: function (e) { e.target.playVideo(); },
            onStateChange: function (e) {
              if (e.data === YT.PlayerState.PLAYING) { errStreak = 0; msg(null); setToggle(true); }
              if (e.data === YT.PlayerState.PAUSED) setToggle(false);
              if (e.data === YT.PlayerState.ENDED) move(1);
            },
            onError: function () { failed('O dono do vídeo não permite tocar fora do YouTube.'); }
          }
        });
      }).catch(function () { msg('<h2>Não foi possível abrir o YouTube</h2><p class="note">Verifique a internet.</p>'); showOsd(true); });
    } else {
      var img = st.el.querySelector('#aart');
      img.src = it.thumb || 'icon.svg';
      st.el.querySelector('#atitle').textContent = it.title;
      st.el.querySelector('#aartist').textContent = it.channel || '';
      st.audio.src = it.stream;
      st.audio.play().then(function () { msg(null); }).catch(function () { msg('Pressione OK para tocar.'); });
    }
  }

  function move(d) {
    var n = st.list.length;
    st.index = (st.index + d + n) % n;
    if (cur().kind !== 'yt' && st.ytp) { try { st.ytp.destroy(); } catch (e) {} st.ytp = null; }
    if ((cur().kind === 'yt') !== !!st.el.querySelector('#ytbox')) { if (st.audio) st.audio.pause(); st.audio = null; build(); }
    play();
  }

  function toggle() {
    if (st.ytp && st.ytp.getPlayerState) { if (st.ytp.getPlayerState() === 1) st.ytp.pauseVideo(); else st.ytp.playVideo(); }
    else if (st.audio) { if (st.audio.paused) st.audio.play().catch(function () {}); else st.audio.pause(); }
  }
  function seek(sec) {
    if (st.ytp && st.ytp.getCurrentTime) st.ytp.seekTo(Math.max(0, st.ytp.getCurrentTime() + sec), true);
    else if (st.audio && st.audio.duration) st.audio.currentTime = Math.max(0, Math.min(st.audio.duration - 1, st.audio.currentTime + sec));
    App.toast(sec > 0 ? '⏩ +10s' : '⏪ -10s');
  }

  function act(a) {
    if (a === 'back') return close();
    if (a === 'prev') return move(-1);
    if (a === 'next') return move(1);
    if (a === 'toggle') return toggle();
  }

  function showOsd(stay) {
    var o = st && st.el.querySelector('#mosd');
    if (!o) return;
    o.classList.remove('hide');
    clearTimeout(st.timer);
    if (!stay) st.timer = setTimeout(function () { if (st) { o.classList.add('hide'); if (document.activeElement) document.activeElement.blur(); } }, 5000);
  }
  function osdVisible() { var o = st && st.el.querySelector('#mosd'); return o && !o.classList.contains('hide'); }

  function onAction(a) {
    if (!st) return false;
    if (a === 'back') { close(); return true; }
    // ▲/▼ sempre trocam de faixa (como trocar de canal)
    if (a === 'up') { move(-1); return true; }
    if (a === 'down') { move(1); return true; }
    if (!osdVisible()) {
      if (a === 'left') { seek(-10); return true; }
      if (a === 'right') { seek(10); return true; }
      if (a === 'start') { toggle(); return true; }
      showOsd();
      Input.focus(st.el.querySelector('#mtoggle'));
      return true;
    }
    showOsd();
    if (a === 'ok') { var f = document.activeElement; if (f && st.el.contains(f) && f.click) f.click(); return true; }
    if (a === 'start') { toggle(); return true; }
    if (a === 'left' || a === 'right') Input.move(a, st.el);
    return true;
  }

  function close(silent) {
    if (!st) return;
    clearTimeout(st.timer);
    if (st.ytp) { try { st.ytp.destroy(); } catch (e) {} }
    if (st.audio) { try { st.audio.pause(); st.audio.removeAttribute('src'); st.audio.load(); } catch (e) {} }
    if (st.off) st.off();
    if (st.el.parentNode) st.el.parentNode.removeChild(st.el);
    st = null;
    if (!silent && window.App) App.restoreFocus();
  }

  window.MediaPlayer = { open: open, close: close, isOpen: function () { return !!st; } };
  window.loadYouTubeApi = loadYT;
})();

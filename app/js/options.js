/*
 * Preferências do app (guardadas no aparelho) + painel de opções reutilizável
 * (usado dentro do player de canais, do player de música/vídeo e da pausa dos jogos).
 *
 * Prefs:
 *   perf    'auto' | 'alto' | 'leve'   — visual completo ou leve (TVs/TV Box mais simples)
 *   ui      'normal' | 'grande' | 'pequeno' — tamanho da interface
 *   som     true/false — sons dos jogos
 *   vibra   true/false — vibração do controle/celular nos jogos
 *   legenda 'off' | 'pt' — legendas nos vídeos quando houver
 *   tamanho 'ajustar' | 'preencher' | 'esticar' | 'zoom' — enquadramento do vídeo
 *   fps     true/false — mostrar quadros por segundo nos jogos
 */
(function () {
  var KEY = 'ap_prefs';
  var DEF = { perf: 'auto', ui: 'normal', som: true, vibra: true, legenda: 'off', tamanho: 'ajustar', fps: false, autoLeve: false, jogoTela: 'ajustar' };
  var p = {};
  try { p = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  for (var k in DEF) if (p[k] === undefined) p[k] = DEF[k];

  function save() { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }
  function leve() { return p.perf === 'leve' || (p.perf === 'auto' && p.autoLeve); }
  function apply() {
    var h = document.documentElement;
    h.setAttribute('data-perf', leve() ? 'leve' : 'alto');
    h.setAttribute('data-ui', p.ui);
  }

  // Detecção automática: aparelho fraco => visual leve (só no modo "auto")
  function detect() {
    if (p.perf !== 'auto') return;
    var weakHw = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
    if (weakHw) { p.autoLeve = true; save(); apply(); return; }
    var n = 0, t0 = performance.now();
    (function tick() {
      n++;
      if (performance.now() - t0 < 1500) return requestAnimationFrame(tick);
      var fps = n / ((performance.now() - t0) / 1000);
      var was = p.autoLeve;
      p.autoLeve = fps < 40;
      if (was !== p.autoLeve) { save(); apply(); }
    })();
  }

  window.Prefs = {
    get: function (k) { return p[k]; },
    set: function (k, v) { p[k] = v; save(); apply(); },
    leve: leve,
    apply: apply,
    detect: detect
  };
  apply();

  // ---------------- Painel de opções ----------------
  // rows: [{ label, values: ['A','B'], index, onChange(i), note }]
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var open = null;

  function render() {
    var o = open;
    o.el.innerHTML = '<div class="sheet-title">' + esc(o.title) + '</div>' + o.rows.map(function (r, i) {
      var single = r.values.length < 2;
      return '<button class="opt focusable" data-i="' + i + '"' + (single ? ' aria-disabled="true"' : '') + '>' +
        '<span class="opt-l">' + esc(r.label) + '</span><span class="opt-v">' + (single ? '' : '‹ ') + esc(r.values[r.index] || '—') + (single ? '' : ' ›') + '</span>' +
        (r.note ? '<span class="opt-n">' + esc(r.note) + '</span>' : '') + '</button>';
    }).join('') + '<button class="opt opt-close focusable" data-close="1">✓ Pronto</button>';
    o.el.querySelectorAll('[data-i]').forEach(function (b) {
      b.addEventListener('click', function () { cycle(+b.getAttribute('data-i'), 1); });
    });
    o.el.querySelector('[data-close]').addEventListener('click', close);
  }
  function cycle(i, d) {
    var r = open.rows[i];
    if (!r || r.values.length < 2) return;
    r.index = (r.index + d + r.values.length) % r.values.length;
    try { r.onChange(r.index); } catch (e) {}
    var focusI = i;
    render();
    Input.focus(open.el.querySelector('[data-i="' + focusI + '"]'));
  }
  function onAction(a) {
    if (!open) return false;
    var f = document.activeElement, i = f && f.getAttribute ? f.getAttribute('data-i') : null;
    if (a === 'back') { close(); return true; }
    if (a === 'up' || a === 'down') { Input.move(a, open.el); return true; }
    if ((a === 'left' || a === 'right') && i != null) { cycle(+i, a === 'left' ? -1 : 1); return true; }
    if (a === 'ok') { if (f && open.el.contains(f)) f.click(); return true; }
    return true;
  }
  function close() {
    if (!open) return;
    var o = open; open = null;
    o.off();
    if (o.el.parentNode) o.el.parentNode.removeChild(o.el);
    if (o.onClose) o.onClose();
  }

  window.OptionsSheet = {
    open: function (container, title, rows, onClose) {
      if (open) close();
      var el = document.createElement('div');
      el.className = 'sheet';
      container.appendChild(el);
      open = { el: el, title: title, rows: rows, onClose: onClose, off: Input.on(onAction) };
      render();
      Input.focus(el.querySelector('.opt'));
    },
    close: close,
    isOpen: function () { return !!open; }
  };
})();

/*
 * Opções de vídeo (qualidade, enquadramento, legendas, velocidade, volume) para
 * vídeo HLS (<video> + hls.js) e para o player oficial do YouTube (IFrame API).
 */
(function () {
  var VOL = [0, 0.25, 0.5, 0.75, 1];
  var YTQ = [['Automática', 'default'], ['1080p', 'hd1080'], ['720p', 'hd720'], ['480p', 'large'], ['360p', 'medium']];
  var FRAMES = [['Ajustar', 'ajustar'], ['Preencher a tela', 'preencher'], ['Esticar', 'esticar'], ['Zoom', 'zoom']];

  function applyFrame(el, isIframe) {
    if (!el) return;
    var t = Prefs.get('tamanho'), A = window.innerWidth / Math.max(1, window.innerHeight), R = 16 / 9;
    if (!isIframe) {
      el.style.objectFit = t === 'preencher' ? 'cover' : t === 'esticar' ? 'fill' : 'contain';
      el.style.transform = t === 'zoom' ? 'scale(1.25)' : '';
      return;
    }
    var s = A > R ? A / R : R / A;
    el.style.transformOrigin = 'center center';
    el.style.transform = t === 'preencher' ? 'scale(' + s + ')' : t === 'esticar' ? (A > R ? 'scaleX(' + s + ')' : 'scaleY(' + s + ')') : t === 'zoom' ? 'scale(1.25)' : '';
  }

  function qualityLabel(h) {
    if (!h) return '';
    return h >= 2160 ? '4K' : h >= 1080 ? 'FULL HD ' + h + 'p' : h >= 720 ? 'HD ' + h + 'p' : h + 'p';
  }
  function ytQualityLabel(q) {
    return { hd2160: '4K', hd1440: 'QHD 1440p', hd1080: 'FULL HD 1080p', hd720: 'HD 720p', large: '480p', medium: '360p', small: '240p', tiny: '144p' }[q] || '';
  }

  // c: { video, hls, ytp, frameEl, iframe (bool), live (bool), audio (bool) }
  function rows(c) {
    var out = [];
    // Qualidade
    if (c.hls && c.hls.levels && c.hls.levels.length > 1) {
      var lv = c.hls.levels.map(function (l) { return l.height ? l.height + 'p' : Math.round((l.bitrate || 0) / 1000) + ' kbps'; });
      out.push({ label: 'Qualidade', values: ['Automática'].concat(lv), index: c.hls.autoLevelEnabled ? 0 : c.hls.currentLevel + 1,
        onChange: function (i) { c.hls.currentLevel = i - 1; } });
    } else if (c.ytp && c.ytp.setPlaybackQuality) {
      out.push({ label: 'Qualidade', values: YTQ.map(function (q) { return q[0]; }), index: 0, note: 'O YouTube pode ajustar conforme a sua internet',
        onChange: function (i) {
          var q = YTQ[i][1];
          try { if (c.ytp.setPlaybackQualityRange) c.ytp.setPlaybackQualityRange(q, q); } catch (e) {}
          try { c.ytp.setPlaybackQuality(q); } catch (e) {}
        } });
    } else if (!c.audio) {
      out.push({ label: 'Qualidade', values: ['Automática'], index: 0, note: 'Este sinal tem uma qualidade só (o aparelho ajusta sozinho)', onChange: function () {} });
    }
    // Enquadramento
    if (!c.audio) {
      var fi = 0; FRAMES.forEach(function (f, i) { if (f[1] === Prefs.get('tamanho')) fi = i; });
      out.push({ label: 'Tamanho da imagem', values: FRAMES.map(function (f) { return f[0]; }), index: fi,
        onChange: function (i) { Prefs.set('tamanho', FRAMES[i][1]); applyFrame(c.frameEl, c.iframe); } });
    }
    // Legendas
    if (c.video && !c.audio) {
      var tracks = [];
      for (var t = 0; t < c.video.textTracks.length; t++) { var tr = c.video.textTracks[t]; if (tr.kind === 'subtitles' || tr.kind === 'captions') tracks.push(tr); }
      if (tracks.length) {
        var cur = 0; tracks.forEach(function (tr, i) { if (tr.mode === 'showing') cur = i + 1; });
        out.push({ label: 'Legendas', values: ['Desligadas'].concat(tracks.map(function (tr, i) { return tr.label || tr.language || ('Legenda ' + (i + 1)); })), index: cur,
          onChange: function (i) { tracks.forEach(function (tr, k) { tr.mode = k === i - 1 ? 'showing' : 'disabled'; }); Prefs.set('legenda', i ? 'pt' : 'off'); } });
      } else out.push({ label: 'Legendas', values: ['Nenhuma neste canal'], index: 0, onChange: function () {} });
    } else if (c.ytp) {
      out.push({ label: 'Legendas', values: ['Desligadas', 'Ligadas (português quando houver)'], index: Prefs.get('legenda') === 'pt' ? 1 : 0, note: 'Mostra as legendas oficiais ou automáticas do vídeo',
        onChange: function (i) { Prefs.set('legenda', i ? 'pt' : 'off'); captionsYT(c.ytp, !!i); } });
    }
    // Velocidade (vídeos, não ao vivo)
    if (c.ytp && !c.live && c.ytp.setPlaybackRate) {
      var rates = (c.ytp.getAvailablePlaybackRates && c.ytp.getAvailablePlaybackRates()) || [0.75, 1, 1.25, 1.5];
      rates = rates.filter(function (r) { return r >= 0.5 && r <= 2; });
      var ri = Math.max(0, rates.indexOf(c.ytp.getPlaybackRate ? c.ytp.getPlaybackRate() : 1));
      out.push({ label: 'Velocidade', values: rates.map(function (r) { return r === 1 ? 'Normal' : r + 'x'; }), index: ri, onChange: function (i) { c.ytp.setPlaybackRate(rates[i]); } });
    } else if (c.video && c.audio) {
      var ar = [0.75, 1, 1.25, 1.5];
      out.push({ label: 'Velocidade', values: ['0.75x', 'Normal', '1.25x', '1.5x'], index: Math.max(0, ar.indexOf(c.video.playbackRate)), onChange: function (i) { c.video.playbackRate = ar[i]; } });
    }
    // Volume
    var vi = 4;
    if (c.video) vi = c.video.muted ? 0 : Math.max(0, VOL.indexOf(Math.round(c.video.volume * 4) / 4));
    else if (c.ytp && c.ytp.getVolume) vi = c.ytp.isMuted && c.ytp.isMuted() ? 0 : Math.max(0, VOL.indexOf(Math.round(c.ytp.getVolume() / 25) / 4));
    out.push({ label: 'Volume', values: ['Mudo', '25%', '50%', '75%', '100%'], index: vi, onChange: function (i) {
      if (c.video) { c.video.muted = i === 0; c.video.volume = VOL[i] || 0; }
      else if (c.ytp) { if (i === 0) c.ytp.mute(); else { c.ytp.unMute(); c.ytp.setVolume(VOL[i] * 100); } }
    } });
    return out;
  }

  function captionsYT(ytp, on) {
    try {
      if (on) { ytp.loadModule('captions'); ytp.setOption('captions', 'track', { languageCode: 'pt' }); }
      else ytp.unloadModule('captions');
    } catch (e) {}
  }

  // Liga a legenda nas trilhas de um <video> quando a preferência está ligada
  function autoCaptions(video) {
    if (Prefs.get('legenda') !== 'pt' || !video) return;
    var pick = function () {
      for (var t = 0; t < video.textTracks.length; t++) {
        var tr = video.textTracks[t];
        if (tr.kind === 'subtitles' || tr.kind === 'captions') { tr.mode = 'showing'; return; }
      }
    };
    pick();
    if (video.textTracks.addEventListener) video.textTracks.addEventListener('addtrack', pick);
  }

  window.MediaOptions = { rows: rows, applyFrame: applyFrame, qualityLabel: qualityLabel, ytQualityLabel: ytQualityLabel, captionsYT: captionsYT, autoCaptions: autoCaptions };
})();

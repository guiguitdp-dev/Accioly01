/*
 * GameHub: motor simples dos jogos do Accioly Play.
 * Todo jogo roda num canvas 1280x720 e funciona com:
 *   - controle remoto da TV (setas + OK + VOLTAR)
 *   - teclado (setas/WASD + Enter + Esc)
 *   - controles de videogame (Gamepad API: Xbox, PlayStation, genéricos USB/Bluetooth)
 *
 * Para criar um jogo novo: GameHub.register({ id, name, emoji, color, desc, help, premium, create(api) })
 * create(api) devolve { update(dt), draw(ctx), action(a, source) }.
 *   Opcionais: back() (true = tratou o VOLTAR), destroy(), tap(x, y) (toque/clique no
 *   canvas, em coordenadas 1280x720), aim(x, y) (mouse/dedo movendo — jogos de mira).
 *   api.firing() = botão de tiro/OK segurado (teclado, controle remoto, gamepad ou toque).
 * No celular/tablet aparece um controle na tela (direcional + botão A + pausa).
 */
(function () {
  var W = 1280, H = 720;
  var games = [];
  var run = null;
  var audioCtx = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // Vibração: controle de videogame (quando suporta) e celular
  function rumble(ms, strength) {
    if (window.Prefs && !Prefs.get('vibra')) return;
    try {
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; i < pads.length; i++) {
        var gp = pads[i];
        if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect)
          gp.vibrationActuator.playEffect('dual-rumble', { duration: ms || 120, strongMagnitude: strength || 0.6, weakMagnitude: (strength || 0.6) / 2 });
      }
      if (navigator.vibrate && ('ontouchstart' in window)) navigator.vibrate(Math.min(ms || 80, 120));
    } catch (e) {}
  }

  function beep(freq, dur, type, vol) {
    if (window.Prefs && !Prefs.get('som')) return;
    // explosões e danos (som grave) também vibram o controle
    if (type === 'sawtooth' && freq < 200) rumble(Math.round((dur || 0.1) * 600), 0.7);
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type || 'square';
      o.frequency.value = freq || 440;
      g.gain.value = vol || 0.05;
      o.connect(g); g.connect(audioCtx.destination);
      var t = audioCtx.currentTime;
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.08));
      o.start(t); o.stop(t + (dur || 0.08) + 0.02);
    } catch (e) {}
  }

  function bestKey(id) { return 'ap_best_' + id; }
  function getBest(id) { try { return +localStorage.getItem(bestKey(id)) || 0; } catch (e) { return 0; } }
  function setBest(id, v) { try { localStorage.setItem(bestKey(id), String(v)); } catch (e) {} }

  // Direção contínua para o jogador n (0 = setas + controle 1; 1 = WASD + controle 2)
  function dir(player, merge) {
    var h = Input.held, x = 0, y = 0;
    var p0 = Input.pad(0), p1 = Input.pad(1);
    if (player === 0 || merge) {
      if (h.left) x -= 1; if (h.right) x += 1; if (h.up) y -= 1; if (h.down) y += 1;
      if (p0) { if (p0.left) x -= 1; if (p0.right) x += 1; if (p0.up) y -= 1; if (p0.down) y += 1; }
    }
    if (player === 1 || merge) {
      if (h.a) x -= 1; if (h.d) x += 1; if (h.w) y -= 1; if (h.s) y += 1;
      if (p1) { if (p1.left) x -= 1; if (p1.right) x += 1; if (p1.up) y -= 1; if (p1.down) y += 1; }
    }
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }

  function register(def) { games.push(def); }

  // Celular/tablet: controle na tela
  function isTouch() { return ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0; }
  function touchPad(def) {
    if (!isTouch()) return '';
    var b = function (k, label, cls) { return '<button class="tbtn ' + (cls || '') + '" data-k="' + k + '">' + label + '</button>'; };
    return '<div class="tpad" aria-hidden="true">' +
      '<div class="tdir">' + b('up', '▲', 'tu') + b('left', '◀', 'tl') + b('right', '▶', 'tr') + b('down', '▼', 'td') + '</div>' +
      '<div class="tact">' + b('ok', def.fireLabel || 'A', 'ta') + '</div>' +
      b('back', '⏸', 'tp') + '</div>';
  }
  function bindTouch(el) {
    el.querySelectorAll('.tbtn').forEach(function (btn) {
      var k = btn.getAttribute('data-k');
      var down = function (e) {
        e.preventDefault();
        if (btn.setPointerCapture && e.pointerId != null) try { btn.setPointerCapture(e.pointerId); } catch (x) {}
        btn.classList.add('on');
        if (k !== 'back') Input.held[k] = true;
        Input.emit(k, 'touch');
      };
      var up = function (e) { if (e) e.preventDefault(); btn.classList.remove('on'); if (k !== 'back') Input.held[k] = false; };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  }

  function start(id, onExit) {
    var def = games.filter(function (g) { return g.id === id; })[0];
    if (!def) return;
    stop(true);
    var el = document.createElement('div');
    el.className = 'game-screen' + (isTouch() ? ' touch' : '');
    el.innerHTML = '<canvas width="' + W + '" height="' + H + '"></canvas>' +
      '<div class="game-hud"><span id="ghl"></span><span id="ghr"></span></div>' +
      '<div class="game-help">' + esc(def.help || '') + (isTouch() ? ' · ⏸ pausa' : ' · VOLTAR pausa') + '</div>' +
      touchPad(def) +
      '<div id="gmenu"></div>';
    document.body.appendChild(el);
    var canvas = el.querySelector('canvas');
    bindTouch(el);
    // Toque/clique e mira no canvas (jogos de mira usam tap/aim)
    function toCanvas(e) { var r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
    canvas.addEventListener('pointerdown', function (e) { if (run && run.game && run.game.tap && !run.paused && !run.over) { var p = toCanvas(e); run.game.tap(p.x, p.y); } });
    canvas.addEventListener('pointermove', function (e) { if (run && run.game && run.game.aim) { var p = toCanvas(e); run.game.aim(p.x, p.y); } });
    function fit() {
      var cover = window.Prefs && Prefs.get('jogoTela') === 'cheia';
      var s = (cover ? Math.max : Math.min)(window.innerWidth / W, window.innerHeight / H);
      canvas.style.width = Math.floor(W * s) + 'px';
      canvas.style.height = Math.floor(H * s) + 'px';
    }
    fit();
    window.addEventListener('resize', fit);
    var ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');
    setLeve(ctx, window.Prefs && Prefs.leve());

    run = { def: def, el: el, ctx: ctx, paused: false, over: false, raf: 0, last: 0, onExit: onExit, fit: fit, score: 0, frames: 0, fpsT: 0, fps: 60, slow: 0 };

    var api = {
      W: W, H: H,
      dir: dir,
      held: Input.held,
      pad: Input.pad,
      padCount: Input.padCount,
      sound: beep,
      rand: function (a, b) { return a + Math.random() * (b - a); },
      randInt: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
      best: function () { return getBest(def.id); },
      hud: function (left, right) {
        var l = el.querySelector('#ghl'), r = el.querySelector('#ghr');
        if (l) l.textContent = left || '';
        if (r) r.textContent = (right || '') + (window.Prefs && Prefs.get('fps') ? '   ' + run.fps + ' FPS' : '');
      },
      rumble: rumble,
      leve: function () { return !!(window.Prefs && Prefs.leve()); },
      score: function (n) { run.score = n; },
      firing: function () { var p = Input.pad(0); return !!(Input.held.ok || (p && p.ok)); },
      touch: isTouch(),
      gameOver: function (finalScore, title) { gameOver(finalScore, title); }
    };
    run.game = def.create(api);
    run.off = Input.on(onAction);
    if (window.App) App.track('game', def.id);
    run.raf = requestAnimationFrame(loop);
  }

  // Modo leve: desliga o brilho (shadowBlur), o efeito mais pesado em TVs/TV Box simples
  function setLeve(ctx, on) {
    try {
      if (on) Object.defineProperty(ctx, 'shadowBlur', { configurable: true, get: function () { return 0; }, set: function () {} });
      else delete ctx.shadowBlur;
    } catch (e) {}
  }

  function loop(t) {
    if (!run) return;
    var dt = run.last ? Math.min(0.05, (t - run.last) / 1000) : 0;
    run.last = t;
    // mede FPS; se o aparelho não aguenta, liga o modo leve sozinho (no modo automático)
    run.frames++; run.fpsT += dt;
    if (run.fpsT >= 1) {
      run.fps = Math.round(run.frames / run.fpsT); run.frames = 0; run.fpsT = 0;
      if (!run.paused && run.fps < 40 && window.Prefs && Prefs.get('perf') === 'auto' && !Prefs.leve()) {
        if (++run.slow >= 2) { Prefs.set('autoLeve', true); setLeve(run.ctx, true); }
      } else run.slow = 0;
    }
    if (!run.paused && !run.over && run.game.update) run.game.update(dt);
    run.ctx.save();
    if (run.game.draw) run.game.draw(run.ctx);
    run.ctx.restore();
    run.raf = requestAnimationFrame(loop);
  }

  function menu(title, sub, buttons) {
    var m = run.el.querySelector('#gmenu');
    m.innerHTML = '<div class="modal-bg"><div class="modal" style="text-align:center"><h2>' + esc(title) + '</h2>' +
      (sub ? '<p class="note" style="font-size:1.1rem">' + sub + '</p>' : '') +
      '<div class="stack gmenu-btns" style="margin:1rem auto 0;max-width:24rem">' +
      buttons.map(function (b, i) { return '<button class="btn ' + (i === 0 ? 'primary' : 'ghost') + ' focusable" data-i="' + i + '">' + esc(b.label) + '</button>'; }).join('') +
      '</div></div></div>';
    m.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () { buttons[+btn.getAttribute('data-i')].fn(); });
    });
    Input.focus(m.querySelector('button'));
  }
  function closeMenu() { if (run) run.el.querySelector('#gmenu').innerHTML = ''; }
  function menuOpen() { return run && run.el.querySelector('#gmenu').innerHTML !== ''; }

  function pause() {
    run.paused = true;
    menu('Pausado', esc(run.def.name), [
      { label: '▶ Continuar', fn: function () { closeMenu(); run.paused = false; } },
      { label: '↻ Reiniciar', fn: restart },
      { label: '⚙️ Opções', fn: gameOptions },
      { label: '✕ Sair do jogo', fn: function () { stop(); } }
    ]);
  }

  function gameOptions() {
    if (!window.OptionsSheet) return;
    var perfVals = ['auto', 'alto', 'leve'];
    OptionsSheet.open(run.el, 'Opções do jogo', [
      { label: 'Som', values: ['Ligado', 'Desligado'], index: Prefs.get('som') ? 0 : 1, onChange: function (i) { Prefs.set('som', i === 0); } },
      { label: 'Vibração do controle', values: ['Ligada', 'Desligada'], index: Prefs.get('vibra') ? 0 : 1, onChange: function (i) { Prefs.set('vibra', i === 0); if (!i) rumble(150, 0.8); } },
      { label: 'Gráficos', values: ['Automático', 'Máximo (brilho e efeitos)', 'Leve (TV mais simples)'], index: Math.max(0, perfVals.indexOf(Prefs.get('perf'))),
        note: 'Leve deixa o jogo mais rápido em TVs e TV Box simples',
        onChange: function (i) { Prefs.set('perf', perfVals[i]); if (perfVals[i] !== 'auto') Prefs.set('autoLeve', false); setLeve(run.ctx, Prefs.leve()); } },
      { label: 'Tamanho da tela', values: ['Ajustar (mostra tudo)', 'Tela cheia (corta as bordas)'], index: Prefs.get('jogoTela') === 'cheia' ? 1 : 0, onChange: function (i) { Prefs.set('jogoTela', i ? 'cheia' : 'ajustar'); run.fit(); } },
      { label: 'Mostrar FPS', values: ['Não', 'Sim'], index: Prefs.get('fps') ? 1 : 0, onChange: function (i) { Prefs.set('fps', !!i); } }
    ], function () { if (run) Input.focus(run.el.querySelector('#gmenu button')); });
  }

  function restart() {
    var id = run.def.id, cb = run.onExit;
    var go = function () { start(id, cb); };
    // Gancho para anúncio entre partidas (só para quem não assina — ver js/ads.js)
    if (window.Ads && Ads.on) Ads.interstitial('next', go); else go();
  }

  function gameOver(finalScore, title) {
    if (!run || run.over) return;
    run.over = true;
    var best = getBest(run.def.id);
    var isRecord = finalScore > best;
    if (isRecord) setBest(run.def.id, finalScore);
    beep(isRecord ? 880 : 180, 0.35, 'triangle', 0.08);
    if (window.App) App.track('score', run.def.id, finalScore);
    menu(title || 'Fim de jogo', 'Pontos: <b>' + finalScore + '</b> · Recorde: <b>' + Math.max(best, finalScore) + '</b>' + (isRecord ? ' 🏆 Novo recorde!' : ''), [
      { label: '↻ Jogar de novo', fn: restart },
      { label: '✕ Sair', fn: function () { stop(); } }
    ]);
  }

  function onAction(a, src) {
    if (!run) return false;
    if (window.OptionsSheet && OptionsSheet.isOpen()) return true;
    if (menuOpen()) {
      if (a === 'ok') { var f = document.activeElement; if (f && run.el.contains(f)) f.click(); }
      else if (a === 'back') { if (run.paused) { closeMenu(); run.paused = false; } else if (run.over) stop(); }
      else if (a === 'left' || a === 'right' || a === 'up' || a === 'down') Input.move(a, run.el.querySelector('#gmenu'));
      return true;
    }
    // O jogo pode tratar o VOLTAR (ex.: cancelar uma seleção) antes de pausar
    if (a === 'back' && run.game.back && run.game.back()) return true;
    if (a === 'back' || (a === 'start' && !run.def.usesStart)) { pause(); return true; }
    if (run.game.action) run.game.action(a, src);
    return true;
  }

  function stop(silent) {
    if (!run) return;
    cancelAnimationFrame(run.raf);
    if (run.off) run.off();
    window.removeEventListener('resize', run.fit);
    if (run.game && run.game.destroy) run.game.destroy();
    ['up', 'down', 'left', 'right', 'ok'].forEach(function (k) { Input.held[k] = false; });
    if (run.el.parentNode) run.el.parentNode.removeChild(run.el);
    var cb = run.onExit;
    run = null;
    if (!silent && cb) cb();
  }

  // Utilitários de desenho compartilhados
  var draw = {
    clear: function (ctx, c1, c2) {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, c1 || '#0b0b18'); g.addColorStop(1, c2 || '#04040a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    glow: function (ctx, color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur || 18; },
    text: function (ctx, txt, x, y, size, color, align) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = color || '#fff';
      ctx.font = '800 ' + (size || 32) + 'px "Segoe UI", Roboto, Arial, sans-serif';
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, x, y);
    },
    roundRect: function (ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
  };

  window.GameHub = { register: register, start: start, stop: stop, list: function () { return games.slice(); }, isOpen: function () { return !!run; }, draw: draw, W: W, H: H, best: getBest };
})();

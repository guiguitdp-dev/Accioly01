/*
 * Entrada unificada: teclado, controle remoto da TV (Samsung, LG, Android TV,
 * TV Box, Fire TV) e controles de videogame (Gamepad API).
 *
 * Gera "ações": up, down, left, right, ok, back, start.
 * - Menus usam navegação espacial (setas movem o foco para o item mais próximo).
 * - Jogos leem Input.held (teclas seguradas) e Input.pad(n) (controle n).
 */
(function () {
  var KEYMAP = {
    37: 'left', 38: 'up', 39: 'right', 40: 'down',
    13: 'ok', 32: 'ok',
    27: 'back', 8: 'back', 461: 'back', 10009: 'back', 166: 'back', 4: 'back',
    415: 'start', 19: 'start', 10252: 'start', 179: 'start',
    // WASD para segundo jogador / teclado
    87: 'w', 65: 'a', 83: 's', 68: 'd'
  };
  var KEYNAMES = {
    ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down',
    Enter: 'ok', ' ': 'ok', Escape: 'back', Backspace: 'back', GoBack: 'back',
    BrowserBack: 'back', MediaPlayPause: 'start'
  };

  var listeners = [];
  var held = { up: false, down: false, left: false, right: false, ok: false, back: false, start: false, w: false, a: false, s: false, d: false };

  function isTyping(e) {
    var t = e && e.target;
    if (!t) return false;
    var tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function actionFromEvent(e) {
    return KEYNAMES[e.key] || KEYMAP[e.keyCode] || null;
  }

  function emit(action, source) {
    for (var i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i](action, source) === true) return true;
    }
    return false;
  }

  document.addEventListener('keydown', function (e) {
    var a = actionFromEvent(e);
    if (!a) return;
    if (isTyping(e)) {
      // Dentro de campo de texto: setas laterais e backspace editam o texto.
      if (a === 'left' || a === 'right' || a === 'ok' && e.key === ' ' || a === 'back' && e.keyCode === 8 ||
          a === 'w' || a === 'a' || a === 's' || a === 'd') return;
    }
    held[a] = true;
    if (emit(a, 'key')) e.preventDefault();
    else if (a !== 'w' && a !== 'a' && a !== 's' && a !== 'd') e.preventDefault();
  });
  document.addEventListener('keyup', function (e) {
    var a = actionFromEvent(e);
    if (a) held[a] = false;
  });

  // ---------------- Gamepad ----------------
  var padState = [];
  var REPEAT_DELAY = 380, REPEAT_RATE = 130;

  function readPad(gp) {
    var b = function (i) { return !!(gp.buttons[i] && gp.buttons[i].pressed); };
    var ax = gp.axes || [];
    return {
      up: b(12) || (ax[1] || 0) < -0.5,
      down: b(13) || (ax[1] || 0) > 0.5,
      left: b(14) || (ax[0] || 0) < -0.5,
      right: b(15) || (ax[0] || 0) > 0.5,
      ok: b(0),
      back: b(1),
      x: b(2), y: b(3),
      start: b(9)
    };
  }

  var pads = [];
  function pollGamepads(now) {
    var list = navigator.getGamepads ? navigator.getGamepads() : [];
    pads = [];
    for (var i = 0; i < list.length; i++) {
      var gp = list[i];
      if (!gp || !gp.connected) continue;
      var s = readPad(gp);
      pads.push(s);
      var prev = padState[gp.index] || {};
      var timers = prev._t || {};
      ['up', 'down', 'left', 'right', 'ok', 'back', 'start'].forEach(function (k) {
        if (s[k] && !prev[k]) { emit(k, 'pad' + gp.index); timers[k] = now + REPEAT_DELAY; }
        else if (s[k] && prev[k] && (k === 'up' || k === 'down' || k === 'left' || k === 'right') && now >= timers[k]) {
          emit(k, 'pad' + gp.index); timers[k] = now + REPEAT_RATE;
        }
      });
      s._t = timers;
      padState[gp.index] = s;
    }
    requestAnimationFrame(pollGamepads);
  }
  requestAnimationFrame(pollGamepads);

  window.addEventListener('gamepadconnected', function () {
    if (window.UI && UI.toast) UI.toast('🎮 Controle conectado!');
  });

  // ---------------- Navegação espacial ----------------
  function visible(el) {
    if (!el || el.disabled) return false;
    var r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    var s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none';
  }

  function focusables(scope) {
    var root = scope || document;
    var nodes = root.querySelectorAll('.focusable');
    var out = [];
    for (var i = 0; i < nodes.length; i++) if (visible(nodes[i])) out.push(nodes[i]);
    return out;
  }

  function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  function move(dir, scope) {
    var cur = document.activeElement;
    var items = focusables(scope);
    if (!items.length) return false;
    if (!cur || items.indexOf(cur) === -1) { focus(items[0]); return true; }
    var cr = cur.getBoundingClientRect();
    var c = center(cr);
    var best = null, bestScore = Infinity;
    // Mesma linha (row) tem prioridade para esquerda/direita.
    var curRow = cur.closest('[data-row]');
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      if (el === cur) continue;
      var r = el.getBoundingClientRect();
      var p = center(r);
      var dx = p.x - c.x, dy = p.y - c.y;
      var primary, secondary;
      if (dir === 'left') { if (r.right > cr.left + 4) continue; primary = -dx; secondary = Math.abs(dy); }
      else if (dir === 'right') { if (r.left < cr.right - 4) continue; primary = dx; secondary = Math.abs(dy); }
      else if (dir === 'up') { if (r.bottom > cr.top + 4) continue; primary = -dy; secondary = Math.abs(dx); }
      else { if (r.top < cr.bottom - 4) continue; primary = dy; secondary = Math.abs(dx); }
      var score = primary + secondary * 3;
      if ((dir === 'left' || dir === 'right') && curRow && el.closest('[data-row]') === curRow) score -= 100000;
      if ((dir === 'up' || dir === 'down')) {
        // Ao trocar de fileira, volta para o item lembrado daquela fileira.
        var row = el.closest('[data-row]');
        if (row && row !== curRow && row._lastFocus === el) score -= 50;
      }
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { focus(best); return true; }
    return false;
  }

  function focus(el) {
    if (!el) return;
    el.focus({ preventScroll: true });
    var row = el.closest('[data-row]');
    if (row) row._lastFocus = el;
    try { el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }
    catch (e) { el.scrollIntoView(false); }
  }

  window.Input = {
    held: held,
    pad: function (n) { return pads[n] || null; },
    padCount: function () { return pads.length; },
    on: function (fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    move: move,
    focus: focus,
    focusables: focusables,
    emit: emit
  };
})();

/* Blocos Encaixe — encaixe peças no tabuleiro 8x8 e complete linhas/colunas. Gênero "block puzzle". */
GameHub.register({
  id: 'blocos', name: 'Blocos Encaixe', emoji: '🟪', color: '#7c3aed', premium: true, trending: true,
  desc: 'Encaixe as peças e complete linhas e colunas. Fácil de aprender, difícil de largar!',
  help: 'Setas movem a peça · OK encaixa · seta → até o fim troca de peça',
  create: function (api) {
    var D = GameHub.draw, N = 8, CELL = 70, OX = 170, OY = 72, TX = 860, SLOT = 186;
    var SHAPES = [
      [[0, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0]], [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]],
      [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
      [[0, 0], [0, 1], [1, 0], [1, 1]], [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
      [[0, 0], [1, 0], [1, 1]], [[0, 1], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 0]], [[0, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [0, 1], [0, 2], [1, 0]], [[0, 0], [0, 1], [1, 1], [2, 1]], [[0, 2], [1, 0], [1, 1], [1, 2]],
      [[0, 0], [0, 1], [0, 2], [1, 1]], [[0, 1], [1, 0], [1, 1], [1, 2]]
    ];
    var COLORS = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
    var board = [], pieces = [], sel = 0, mode = 'board', gx = 3, gy = 3, score = 0, streak = 0, flash = [], msg = '', msgT = 0, over = false;
    for (var i = 0; i < N * N; i++) board.push(null);

    function size(p) { var w = 0, h = 0; p.cells.forEach(function (q) { h = Math.max(h, q[0] + 1); w = Math.max(w, q[1] + 1); }); return { w: w, h: h }; }
    function fits(p, x, y) {
      for (var k = 0; k < p.cells.length; k++) {
        var r = y + p.cells[k][0], c = x + p.cells[k][1];
        if (r < 0 || c < 0 || r >= N || c >= N || board[r * N + c]) return false;
      }
      return true;
    }
    function fitsAnywhere(p) { for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (fits(p, x, y)) return true; return false; }
    function newPiece() { var s = SHAPES[api.randInt(0, SHAPES.length - 1)]; return { cells: s, color: COLORS[api.randInt(0, COLORS.length - 1)] }; }
    function deal() {
      for (var t = 0; t < 12; t++) {
        pieces = [newPiece(), newPiece(), newPiece()];
        if (pieces.some(fitsAnywhere)) break;
      }
      sel = 0; clampGhost();
    }
    function clampGhost() {
      var p = pieces[sel]; if (!p) return;
      var s = size(p); gx = Math.max(0, Math.min(N - s.w, gx)); gy = Math.max(0, Math.min(N - s.h, gy));
    }
    function nextSel(dir) {
      for (var k = 1; k <= 3; k++) { var j = (sel + dir * k + 3) % 3; if (pieces[j]) { sel = j; clampGhost(); return; } }
    }
    function lines(p, x, y) {
      var tmp = board.slice();
      p.cells.forEach(function (q) { tmp[(y + q[0]) * N + x + q[1]] = 1; });
      var rows = [], cols = [];
      for (var r = 0; r < N; r++) { var full = true; for (var c = 0; c < N; c++) if (!tmp[r * N + c]) { full = false; break; } if (full) rows.push(r); }
      for (var c2 = 0; c2 < N; c2++) { var f = true; for (var r2 = 0; r2 < N; r2++) if (!tmp[r2 * N + c2]) { f = false; break; } if (f) cols.push(c2); }
      return { rows: rows, cols: cols };
    }
    function place() {
      var p = pieces[sel];
      if (!p || !fits(p, gx, gy)) { api.sound(150, 0.1); return; }
      var L = lines(p, gx, gy);
      p.cells.forEach(function (q) { board[(gy + q[0]) * N + gx + q[1]] = p.color; });
      score += p.cells.length;
      var n = L.rows.length + L.cols.length;
      if (n) {
        streak++;
        L.rows.forEach(function (r) { for (var c = 0; c < N; c++) { flash.push({ i: r * N + c, t: 0.4, color: board[r * N + c] }); board[r * N + c] = null; } });
        L.cols.forEach(function (c) { for (var r = 0; r < N; r++) { if (board[r * N + c]) flash.push({ i: r * N + c, t: 0.4, color: board[r * N + c] }); board[r * N + c] = null; } });
        var pts = n * 80 * n + (streak > 1 ? streak * 40 : 0);
        score += pts;
        msg = (n > 1 ? n + ' linhas! ' : 'Linha! ') + '+' + pts + (streak > 1 ? '  Sequência x' + streak : ''); msgT = 1.3;
        api.sound(600 + n * 120, 0.15, 'triangle');
        if (board.every(function (b) { return !b; })) { score += 500; msg = 'Tabuleiro limpo! +500'; msgT = 1.6; }
      } else { streak = 0; api.sound(420, 0.05); }
      pieces[sel] = null;
      if (pieces.every(function (x) { return !x; })) deal(); else nextSel(1);
      if (!pieces.some(function (x) { return x && fitsAnywhere(x); })) { over = true; setTimeout(function () { api.gameOver(score, 'Sem espaço para as peças'); }, 700); }
    }
    deal();
    return {
      back: function () { if (mode === 'tray') { mode = 'board'; return true; } return false; },
      action: function (a) {
        if (over) return;
        var p = pieces[sel], s = p ? size(p) : { w: 1, h: 1 };
        if (mode === 'tray') {
          if (a === 'up') nextSel(-1); else if (a === 'down') nextSel(1);
          else if (a === 'left' || a === 'ok') { mode = 'board'; clampGhost(); }
          return;
        }
        if (a === 'left') gx = Math.max(0, gx - 1);
        else if (a === 'right') { if (gx + s.w >= N) mode = 'tray'; else gx++; }
        else if (a === 'up') gy = Math.max(0, gy - 1);
        else if (a === 'down') gy = Math.min(N - s.h, gy + 1);
        else if (a === 'ok') place();
      },
      update: function (dt) {
        flash = flash.filter(function (f) { f.t -= dt; return f.t > 0; });
        if (msgT > 0) msgT -= dt;
        api.hud('Pontos: ' + score, 'Recorde: ' + api.best());
      },
      draw: function (ctx) {
        D.clear(ctx, '#140b2b', '#05030c');
        ctx.fillStyle = 'rgba(255,255,255,.05)'; D.roundRect(ctx, OX - 10, OY - 10, N * CELL + 20, N * CELL + 20, 18); ctx.fill();
        var p = pieces[sel], L = p && mode === 'board' && fits(p, gx, gy) ? lines(p, gx, gy) : { rows: [], cols: [] };
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          var x = OX + c * CELL, y = OY + r * CELL, v = board[r * N + c];
          var hl = L.rows.indexOf(r) >= 0 || L.cols.indexOf(c) >= 0;
          ctx.shadowBlur = 0;
          ctx.fillStyle = v ? v : (hl ? 'rgba(250,204,21,.18)' : 'rgba(255,255,255,.06)');
          if (v) { ctx.shadowColor = v; ctx.shadowBlur = hl ? 24 : 8; }
          D.roundRect(ctx, x + 3, y + 3, CELL - 6, CELL - 6, 10); ctx.fill();
        }
        flash.forEach(function (f) {
          var x = OX + (f.i % N) * CELL, y = OY + Math.floor(f.i / N) * CELL, k = f.t / 0.4;
          ctx.globalAlpha = k; ctx.fillStyle = '#fff'; ctx.shadowBlur = 20; ctx.shadowColor = f.color || '#fff';
          D.roundRect(ctx, x + 3 + (1 - k) * 20, y + 3 + (1 - k) * 20, CELL - 6 - (1 - k) * 40, CELL - 6 - (1 - k) * 40, 10); ctx.fill();
        });
        ctx.globalAlpha = 1;
        if (p && mode === 'board') {
          var ok = fits(p, gx, gy);
          p.cells.forEach(function (q) {
            var x = OX + (gx + q[1]) * CELL, y = OY + (gy + q[0]) * CELL;
            ctx.globalAlpha = 0.75; ctx.shadowBlur = 18; ctx.shadowColor = ok ? p.color : '#ef4444';
            ctx.fillStyle = ok ? p.color : '#7f1d1d'; D.roundRect(ctx, x + 3, y + 3, CELL - 6, CELL - 6, 10); ctx.fill();
            ctx.globalAlpha = 1; ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
          });
        }
        ctx.globalAlpha = 1;
        for (var k = 0; k < 3; k++) {
          var sy = OY + k * SLOT, active = k === sel;
          ctx.shadowBlur = active ? 20 : 0; ctx.shadowColor = '#c4b5fd';
          ctx.fillStyle = active ? (mode === 'tray' ? 'rgba(196,181,253,.25)' : 'rgba(196,181,253,.12)') : 'rgba(255,255,255,.04)';
          D.roundRect(ctx, TX, sy, 280, SLOT - 14, 18); ctx.fill();
          if (active && mode === 'tray') { ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke(); }
          var pc = pieces[k]; if (!pc) continue;
          var s = size(pc), mc = 30, px = TX + 140 - (s.w * mc) / 2, py = sy + (SLOT - 14) / 2 - (s.h * mc) / 2;
          var can = fitsAnywhere(pc);
          pc.cells.forEach(function (q) { ctx.shadowBlur = 0; ctx.globalAlpha = can ? 1 : 0.3; ctx.fillStyle = pc.color; D.roundRect(ctx, px + q[1] * mc + 2, py + q[0] * mc + 2, mc - 4, mc - 4, 6); ctx.fill(); });
          ctx.globalAlpha = 1;
        }
        if (mode === 'tray') D.text(ctx, '▲▼ escolhe · OK confirma', TX + 140, OY + 3 * SLOT + 6, 22, '#c4b5fd');
        if (msgT > 0) D.text(ctx, msg, OX + N * CELL / 2, OY + N * CELL / 2, 44, '#fde68a');
      }
    };
  }
});

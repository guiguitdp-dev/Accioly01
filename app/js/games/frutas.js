/* Festa das Frutas — junte 3 ou mais frutas iguais. Gênero "combinar 3", visual próprio. */
GameHub.register({
  id: 'frutas', name: 'Festa das Frutas', emoji: '🍍', color: '#f59e0b', premium: true, trending: true,
  desc: 'Troque frutas de lugar e junte 3 ou mais iguais. Faça combos e passe de fase!',
  help: 'Setas movem · OK pega a fruta · seta troca · VOLTAR solta',
  create: function (api) {
    var D = GameHub.draw, W = api.W, H = api.H, N = 8, CELL = 72;
    var OX = (W - N * CELL) / 2, OY = (H - N * CELL) / 2 + 20;
    var TYPES = [
      { e: '🍍', c: '#facc15' }, { e: '🍉', c: '#ef4444' }, { e: '🍇', c: '#a855f7' },
      { e: '🥥', c: '#a16207' }, { e: '🍋', c: '#84cc16' }, { e: '🫐', c: '#3b82f6' }
    ];
    var grid, cur = { r: 3, c: 3 }, held = false, busy = 0, score = 0, moves = 25, level = 1, target = 1500, combo = 0, pops = [], swapAnim = null, msg = '', msgT = 0;

    function rnd() { return api.randInt(0, TYPES.length - 1); }
    function cell(t) { return { t: t, y: 0, s: 1 }; }
    function init() {
      grid = [];
      for (var r = 0; r < N; r++) {
        grid.push([]);
        for (var c = 0; c < N; c++) {
          var t;
          do { t = rnd(); } while ((c >= 2 && grid[r][c - 1].t === t && grid[r][c - 2].t === t) || (r >= 2 && grid[r - 1][c].t === t && grid[r - 2][c].t === t));
          grid[r].push(cell(t));
        }
      }
      if (!hasMove()) init();
    }
    function findMatches() {
      var m = [], r, c, k;
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) m.push(false);
      for (r = 0; r < N; r++) for (c = 0; c < N - 2; c++) {
        var t = grid[r][c].t; if (t < 0) continue;
        if (grid[r][c + 1].t === t && grid[r][c + 2].t === t) { for (k = c; k < N && grid[r][k].t === t; k++) m[r * N + k] = true; }
      }
      for (c = 0; c < N; c++) for (r = 0; r < N - 2; r++) {
        var t2 = grid[r][c].t; if (t2 < 0) continue;
        if (grid[r + 1][c].t === t2 && grid[r + 2][c].t === t2) { for (k = r; k < N && grid[k][c].t === t2; k++) m[k * N + c] = true; }
      }
      return m;
    }
    function swap(a, b) { var t = grid[a.r][a.c]; grid[a.r][a.c] = grid[b.r][b.c]; grid[b.r][b.c] = t; }
    function hasMove() {
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
        var dirs = [[0, 1], [1, 0]];
        for (var i = 0; i < 2; i++) {
          var r2 = r + dirs[i][0], c2 = c + dirs[i][1];
          if (r2 >= N || c2 >= N) continue;
          swap({ r: r, c: c }, { r: r2, c: c2 });
          var ok = findMatches().indexOf(true) >= 0;
          swap({ r: r, c: c }, { r: r2, c: c2 });
          if (ok) return true;
        }
      }
      return false;
    }
    function resolve() {
      var m = findMatches(), n = 0;
      for (var i = 0; i < m.length; i++) if (m[i]) {
        var r = Math.floor(i / N), c = i % N;
        pops.push({ x: OX + c * CELL + CELL / 2, y: OY + r * CELL + CELL / 2, t: 0.35, color: TYPES[grid[r][c].t].c });
        grid[r][c].t = -1; n++;
      }
      if (!n) return false;
      combo++;
      score += n * 20 * combo;
      api.sound(500 + combo * 90, 0.08, 'triangle');
      if (combo > 1) { msg = 'Combo x' + combo + '!'; msgT = 1; }
      for (var c2 = 0; c2 < N; c2++) {
        var write = N - 1;
        for (var r2 = N - 1; r2 >= 0; r2--) {
          if (grid[r2][c2].t >= 0) {
            if (write !== r2) { grid[write][c2] = grid[r2][c2]; grid[write][c2].y -= (write - r2) * CELL; }
            write--;
          }
        }
        for (var r3 = write; r3 >= 0; r3--) { var nc = cell(rnd()); nc.y = -(write + 1) * CELL - 20; grid[r3][c2] = nc; }
      }
      busy = 1;
      return true;
    }
    function afterSettle() {
      if (resolve()) return;
      combo = 0;
      if (score >= target) { level++; moves += 15; target += 1500 + level * 500; msg = 'Fase ' + level + '! +15 jogadas'; msgT = 1.6; api.sound(990, 0.25, 'triangle'); }
      if (moves <= 0) return api.gameOver(score, 'Acabaram as jogadas');
      if (!hasMove()) { init(); msg = 'Sem jogadas — embaralhando'; msgT = 1.4; }
    }
    function trySwap(dr, dc) {
      var b = { r: cur.r + dr, c: cur.c + dc };
      if (b.r < 0 || b.c < 0 || b.r >= N || b.c >= N) return;
      var a = { r: cur.r, c: cur.c };
      swap(a, b);
      held = false;
      if (findMatches().indexOf(true) >= 0) {
        moves--; cur = b; combo = 0; swapAnim = { a: a, b: b, t: 0.18, back: false };
      } else {
        swapAnim = { a: a, b: b, t: 0.18, back: true };
        api.sound(180, 0.08);
      }
      busy = 1;
    }
    init();
    return {
      back: function () { if (held) { held = false; return true; } return false; },
      action: function (a) {
        if (busy) return;
        var d = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[a];
        if (d) {
          if (held) trySwap(d[0], d[1]);
          else { cur.r = Math.max(0, Math.min(N - 1, cur.r + d[0])); cur.c = Math.max(0, Math.min(N - 1, cur.c + d[1])); }
        } else if (a === 'ok') { held = !held; api.sound(held ? 620 : 400, 0.04); }
      },
      update: function (dt) {
        if (swapAnim) {
          swapAnim.t -= dt;
          if (swapAnim.t <= 0) {
            if (swapAnim.back) { swap(swapAnim.a, swapAnim.b); swapAnim = null; busy = 0; }
            else { swapAnim = null; resolve(); }
          }
        } else if (busy) {
          var moving = false;
          for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
            var k = grid[r][c];
            if (k.y < 0) { k.y = Math.min(0, k.y + dt * 1100); moving = true; }
          }
          if (!moving) { busy = 0; afterSettle(); }
        }
        pops = pops.filter(function (p) { p.t -= dt; return p.t > 0; });
        if (msgT > 0) msgT -= dt;
        api.hud('Pontos: ' + score + '   Fase ' + level + '  (meta ' + target + ')', 'Jogadas: ' + moves + '   Recorde: ' + api.best());
      },
      draw: function (ctx) {
        D.clear(ctx, '#2a1305', '#0c0503');
        ctx.fillStyle = 'rgba(255,255,255,.06)'; D.roundRect(ctx, OX - 12, OY - 12, N * CELL + 24, N * CELL + 24, 22); ctx.fill();
        var sa = swapAnim, prog = sa ? 1 - sa.t / 0.18 : 0;
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          var k = grid[r][c]; if (k.t < 0) continue;
          var x = OX + c * CELL, y = OY + r * CELL + k.y;
          if (sa) {
            var isA = sa.a.r === r && sa.a.c === c, isB = sa.b.r === r && sa.b.c === c;
            // troca válida: desliza até o lugar novo · troca inválida: vai até a metade e volta
            var p = sa.back ? 1 - 0.5 * (prog < 0.5 ? prog * 2 : (1 - prog) * 2) : 1 - prog;
            if (isA) { x += (sa.b.c - sa.a.c) * CELL * p; y += (sa.b.r - sa.a.r) * CELL * p; }
            if (isB) { x += (sa.a.c - sa.b.c) * CELL * p; y += (sa.a.r - sa.b.r) * CELL * p; }
          }
          if (y < OY - CELL) continue;
          var T = TYPES[k.t];
          ctx.shadowBlur = 0; ctx.fillStyle = T.c + '33'; D.roundRect(ctx, x + 5, y + 5, CELL - 10, CELL - 10, 16); ctx.fill();
          D.text(ctx, T.e, x + CELL / 2, y + CELL / 2 + 3, 42);
        }
        var cx = OX + cur.c * CELL, cy = OY + cur.r * CELL;
        ctx.shadowColor = held ? '#facc15' : '#fff'; ctx.shadowBlur = 20; ctx.lineWidth = held ? 7 : 5; ctx.strokeStyle = held ? '#facc15' : '#fff';
        D.roundRect(ctx, cx + 3, cy + 3, CELL - 6, CELL - 6, 16); ctx.stroke();
        pops.forEach(function (p) { ctx.globalAlpha = p.t / 0.35; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, (0.35 - p.t) * 140, 0, Math.PI * 2); ctx.fill(); });
        ctx.globalAlpha = 1;
        if (msgT > 0) D.text(ctx, msg, W / 2, OY - 34, 40, '#fde68a');
      }
    };
  }
});

/* Memória Brasil — encontre os pares. Ótimo para crianças e família. */
GameHub.register({
  id: 'memoria', name: 'Memória Brasil', emoji: '🃏', color: '#db2777', premium: false,
  desc: 'Encontre todos os pares no menor número de jogadas.',
  help: 'Setas movem · OK vira a carta',
  create: function (api) {
    var D = GameHub.draw, W = api.W, H = api.H;
    var EMO = ['🦜', '🐆', '🍍', '⚽', '🥥', '🏖️', '🎭', '🥁', '🦥', '🌵', '🐢', '🍌'];
    var COLS = 6, ROWS = 4, cw = 150, ch = 140, gap = 18;
    var ox = (W - (COLS * cw + (COLS - 1) * gap)) / 2, oy = 90;
    var cards, cur, open, moves, found, lock, t;
    function init() {
      var pick = EMO.slice().sort(function () { return Math.random() - 0.5; }).slice(0, (COLS * ROWS) / 2);
      cards = pick.concat(pick).sort(function () { return Math.random() - 0.5; }).map(function (e) { return { e: e, up: false, done: false, flip: 0 }; });
      cur = 0; open = []; moves = 0; found = 0; lock = 0; t = 0;
    }
    init();
    return {
      action: function (a) {
        var c = cur % COLS, r = Math.floor(cur / COLS);
        if (a === 'left') c = (c + COLS - 1) % COLS; if (a === 'right') c = (c + 1) % COLS;
        if (a === 'up') r = (r + ROWS - 1) % ROWS; if (a === 'down') r = (r + 1) % ROWS;
        cur = r * COLS + c;
        if (a === 'ok' && lock <= 0) {
          var k = cards[cur];
          if (k.up || k.done) return;
          k.up = true; open.push(cur); api.sound(520, 0.04);
          if (open.length === 2) {
            moves++;
            var A = cards[open[0]], B = cards[open[1]];
            if (A.e === B.e) { A.done = B.done = true; found++; open = []; api.sound(880, 0.12, 'triangle');
              if (found === cards.length / 2) setTimeout(function () { api.gameOver(Math.max(10, 1000 - moves * 20 - Math.floor(t) * 2), 'Você achou todos! 🎉'); }, 500);
            } else lock = 0.9;
          }
        }
      },
      update: function (dt) {
        t += dt;
        if (lock > 0) { lock -= dt; if (lock <= 0) { open.forEach(function (i) { cards[i].up = false; }); open = []; } }
        cards.forEach(function (k) { var target = (k.up || k.done) ? 1 : 0; k.flip += (target - k.flip) * Math.min(1, dt * 12); });
        api.hud('Jogadas: ' + moves + '   Pares: ' + found + '/' + cards.length / 2, 'Tempo: ' + Math.floor(t) + 's');
      },
      draw: function (ctx) {
        D.clear(ctx, '#1a0716', '#060207');
        cards.forEach(function (k, i) {
          var c = i % COLS, r = Math.floor(i / COLS), x = ox + c * (cw + gap), y = oy + r * (ch + gap);
          var sx = Math.abs(Math.cos(k.flip * Math.PI)) || 0.02;
          ctx.save(); ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(sx, 1);
          var face = k.flip > 0.5;
          ctx.shadowBlur = i === cur ? 30 : 8; ctx.shadowColor = i === cur ? '#fff' : '#000';
          ctx.fillStyle = face ? (k.done ? '#14532d' : '#fdf2f8') : '#9d174d';
          D.roundRect(ctx, -cw / 2, -ch / 2, cw, ch, 16); ctx.fill();
          if (i === cur) { ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke(); }
          if (face) D.text(ctx, k.e, 0, 4, 70); else D.text(ctx, '?', 0, 4, 60, '#fbcfe8');
          ctx.restore();
        });
      }
    };
  }
});

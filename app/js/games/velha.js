/* Jogo da Velha — contra a TV, melhor de 5 partidas. */
GameHub.register({
  id: 'velha', name: 'Jogo da Velha', emoji: '❌', color: '#2563eb', premium: false,
  desc: 'Você (X) contra a TV (O). Melhor de 5 partidas.',
  help: 'Setas movem · OK marca',
  create: function (api) {
    var D = GameHub.draw, W = api.W, H = api.H, S = 170, ox = W / 2 - S * 1.5, oy = 120;
    var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    var b, cur, turn, wins = 0, losses = 0, draws = 0, games = 0, wait = 0, msg = '', winLine = null;
    function winner(bb) { for (var i = 0; i < LINES.length; i++) { var l = LINES[i]; if (bb[l[0]] && bb[l[0]] === bb[l[1]] && bb[l[1]] === bb[l[2]]) return { p: bb[l[0]], line: l }; } return bb.indexOf('') === -1 ? { p: 'draw' } : null; }
    function minimax(bb, p) {
      var w = winner(bb);
      if (w) return { s: w.p === 'O' ? 10 : w.p === 'X' ? -10 : 0 };
      var best = { s: p === 'O' ? -99 : 99, i: -1 };
      for (var i = 0; i < 9; i++) if (!bb[i]) {
        bb[i] = p; var r = minimax(bb, p === 'O' ? 'X' : 'O'); bb[i] = '';
        if ((p === 'O' && r.s > best.s) || (p === 'X' && r.s < best.s)) best = { s: r.s, i: i };
      }
      return best;
    }
    function newGame() { b = ['', '', '', '', '', '', '', '', '']; cur = 4; turn = games % 2 === 0 ? 'X' : 'O'; msg = ''; winLine = null; if (turn === 'O') wait = 0.6; }
    function check() {
      var w = winner(b);
      if (!w) return false;
      games++; winLine = w.line || null;
      if (w.p === 'X') { wins++; msg = 'Você venceu! 🎉'; api.sound(880, 0.2, 'triangle'); }
      else if (w.p === 'O') { losses++; msg = 'A TV venceu!'; api.sound(160, 0.3, 'sawtooth'); }
      else { draws++; msg = 'Deu velha!'; api.sound(440, 0.2); }
      turn = 'end'; wait = 1.8;
      return true;
    }
    newGame();
    return {
      action: function (a) {
        var c = cur % 3, r = Math.floor(cur / 3);
        if (a === 'left') c = (c + 2) % 3; if (a === 'right') c = (c + 1) % 3;
        if (a === 'up') r = (r + 2) % 3; if (a === 'down') r = (r + 1) % 3;
        cur = r * 3 + c;
        if (a === 'ok' && turn === 'X' && !b[cur]) { b[cur] = 'X'; api.sound(520, 0.05); if (!check()) { turn = 'O'; wait = 0.5; } }
      },
      update: function (dt) {
        if (wait > 0) {
          wait -= dt;
          if (wait <= 0) {
            if (turn === 'O') {
              var empty = b.map(function (v, i) { return v ? -1 : i; }).filter(function (i) { return i >= 0; });
              var mv = Math.random() < 0.25 ? empty[api.randInt(0, empty.length - 1)] : minimax(b, 'O').i;
              b[mv] = 'O'; api.sound(330, 0.05);
              if (!check()) turn = 'X';
            } else if (turn === 'end') {
              if (games >= 5) return api.gameOver(wins * 100 + draws * 30, wins > losses ? 'Você ganhou a série! 🏆' : wins === losses ? 'Empate na série!' : 'A TV ganhou a série');
              newGame();
            }
          }
        }
        api.hud('Você ' + wins + ' × ' + losses + ' TV   (velhas: ' + draws + ')', 'Partida ' + Math.min(games + 1, 5) + '/5');
      },
      draw: function (ctx) {
        D.clear(ctx, '#07112a', '#02040c');
        for (var i = 0; i < 9; i++) {
          var x = ox + (i % 3) * S, y = oy + Math.floor(i / 3) * S;
          ctx.shadowBlur = i === cur && turn === 'X' ? 24 : 0; ctx.shadowColor = '#93c5fd';
          ctx.fillStyle = winLine && winLine.indexOf(i) >= 0 ? '#1e3a8a' : (i === cur && turn === 'X' ? '#1e40af' : '#0f1d3d');
          D.roundRect(ctx, x + 6, y + 6, S - 12, S - 12, 18); ctx.fill();
          if (i === cur && turn === 'X') { ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke(); }
          if (b[i] === 'X') { D.glow(ctx, '#f43f5e', 20); D.text(ctx, '✕', x + S / 2, y + S / 2 + 4, 110, '#fb7185'); }
          if (b[i] === 'O') { D.glow(ctx, '#38bdf8', 20); ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(x + S / 2, y + S / 2, 44, 0, Math.PI * 2); ctx.stroke(); }
        }
        if (msg) D.text(ctx, msg, W / 2, 680, 40, '#fde68a');
        else if (turn === 'O') D.text(ctx, 'A TV está pensando…', W / 2, 680, 30, '#93c5fd');
      }
    };
  }
});

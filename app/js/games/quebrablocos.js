/* Quebra-Blocos — rebata a bola e destrua todos os blocos. */
GameHub.register({
  id: 'quebrablocos', name: 'Quebra-Blocos', emoji: '🧱', color: '#ea580c', premium: true,
  desc: 'Rebata a bola, destrua os blocos e passe de fase.',
  help: '◀ ▶ movem a raquete · OK lança a bola',
  create: function (api) {
    var D = GameHub.draw, W = api.W, H = api.H;
    var pad, ball, bricks, lives, score, level, stuck;
    var COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];
    function buildLevel() {
      bricks = [];
      var cols = 12, rows = Math.min(6, 3 + level), bw = 92, bh = 30, gap = 8, ox = (W - (cols * bw + (cols - 1) * gap)) / 2;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        if (level > 1 && (r + c + level) % 7 === 0) continue;
        bricks.push({ x: ox + c * (bw + gap), y: 90 + r * (bh + gap), w: bw, h: bh, color: COLORS[r % COLORS.length], hp: r < level - 1 ? 2 : 1 });
      }
    }
    function resetBall() { stuck = true; ball = { x: pad.x + pad.w / 2, y: pad.y - 12, r: 11, vx: 0, vy: 0, sp: 480 + level * 40 }; }
    function init() { pad = { x: W / 2 - 80, y: H - 50, w: 160, h: 16 }; lives = 3; score = 0; level = 1; buildLevel(); resetBall(); }
    function launch() { if (!stuck) return; stuck = false; var a = -Math.PI / 2 + api.rand(-0.5, 0.5); ball.vx = Math.cos(a) * ball.sp; ball.vy = Math.sin(a) * ball.sp; api.sound(520, 0.05); }
    init();
    return {
      action: function (a) { if (a === 'ok' || a === 'up') launch(); },
      update: function (dt) {
        var d = api.dir(0, true);
        pad.x = Math.max(0, Math.min(W - pad.w, pad.x + d.x * 760 * dt));
        if (stuck) { ball.x = pad.x + pad.w / 2; ball.y = pad.y - 12; var p = api.pad(0); if (p && p.ok) launch(); }
        else {
          ball.x += ball.vx * dt; ball.y += ball.vy * dt;
          if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1; api.sound(300, 0.03); }
          if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -1; api.sound(300, 0.03); }
          if (ball.y < 50 + ball.r) { ball.y = 50 + ball.r; ball.vy *= -1; api.sound(300, 0.03); }
          if (ball.vy > 0 && ball.y + ball.r >= pad.y && ball.y < pad.y + pad.h && ball.x > pad.x - 8 && ball.x < pad.x + pad.w + 8) {
            var hit = (ball.x - (pad.x + pad.w / 2)) / (pad.w / 2);
            var ang = -Math.PI / 2 + hit * 1.05;
            ball.vx = Math.cos(ang) * ball.sp; ball.vy = Math.sin(ang) * ball.sp; api.sound(440, 0.05);
          }
          for (var i = bricks.length - 1; i >= 0; i--) {
            var b = bricks[i];
            if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
              var ox = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r));
              var oy = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
              if (ox < oy) ball.vx *= -1; else ball.vy *= -1;
              b.hp--; if (b.hp <= 0) { bricks.splice(i, 1); score += 10 * level; } api.sound(700 + (i % 6) * 40, 0.04);
              break;
            }
          }
          if (ball.y > H + 30) { lives--; api.sound(150, 0.3, 'sawtooth'); if (lives <= 0) return api.gameOver(score); resetBall(); }
          if (!bricks.length) { level++; ball.sp += 30; buildLevel(); resetBall(); api.sound(990, 0.2, 'triangle'); }
        }
        api.hud('Pontos: ' + score + '   Fase ' + level, '❤'.repeat(lives) + '   Recorde: ' + api.best());
      },
      draw: function (ctx) {
        D.clear(ctx, '#120a1e', '#05030a');
        bricks.forEach(function (b) { D.glow(ctx, b.color, 14); ctx.fillStyle = b.hp > 1 ? '#fff' : b.color; D.roundRect(ctx, b.x, b.y, b.w, b.h, 6); ctx.fill(); });
        D.glow(ctx, '#a78bfa', 20); ctx.fillStyle = '#c4b5fd'; D.roundRect(ctx, pad.x, pad.y, pad.w, pad.h, 8); ctx.fill();
        D.glow(ctx, '#fff', 22); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
        if (stuck) D.text(ctx, 'Pressione OK para lançar', W / 2, H / 2 + 80, 30, '#e9d5ff');
      }
    };
  }
});

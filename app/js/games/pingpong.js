/* Pingue-Pongue Neon — 1 jogador contra a TV ou 2 jogadores (2 controles ou teclado). */
GameHub.register({
  id: 'pingpong', name: 'Pingue-Pongue 2P', emoji: '🏓', color: '#0891b2', premium: true,
  desc: 'Desafie a TV ou um amigo. Quem fizer 7 pontos vence.',
  help: '▲ ▼ movem · 2 jogadores: W/S + setas ou 2 controles',
  create: function (api) {
    var D = GameHub.draw, W = api.W, H = api.H;
    var mode = 1, choosing = true, L, R, ball, sl, sr, serveT, done;
    function init() { L = { x: 40, y: H / 2 - 70, w: 18, h: 140 }; R = { x: W - 58, y: H / 2 - 70, w: 18, h: 140 }; sl = 0; sr = 0; done = false; serve(1); }
    function serve(dirx) { ball = { x: W / 2, y: H / 2, r: 12, vx: 0, vy: 0, sp: 520 }; serveT = 0.9; ball.dir = dirx; }
    function clamp(p) { p.y = Math.max(50, Math.min(H - p.h - 10, p.y)); }
    init();
    return {
      action: function (a) {
        if (!choosing) return;
        if (a === 'left') mode = 1; if (a === 'right') mode = 2;
        if (a === 'ok') { choosing = false; init(); api.sound(660, 0.08); }
      },
      update: function (dt) {
        if (choosing) { api.hud('Escolha o modo', ''); return; }
        if (mode === 1) {
          L.y += api.dir(0, true).y * 640 * dt;
          var target = ball.y - R.h / 2 + Math.sin(Date.now() / 300) * 30;
          var sp = 420 + Math.min(200, (sl + sr) * 20);
          R.y += Math.max(-sp * dt, Math.min(sp * dt, target - R.y));
        } else {
          // J1 (esquerda): W/S ou controle 1 · J2 (direita): setas/controle remoto ou controle 2
          var h = api.held, p0 = api.pad(0), p1 = api.pad(1);
          var ly = (h.w ? -1 : 0) + (h.s ? 1 : 0) + (p0 ? (p0.up ? -1 : 0) + (p0.down ? 1 : 0) : 0);
          var ry = (h.up ? -1 : 0) + (h.down ? 1 : 0) + (p1 ? (p1.up ? -1 : 0) + (p1.down ? 1 : 0) : 0);
          L.y += Math.max(-1, Math.min(1, ly)) * 640 * dt;
          R.y += Math.max(-1, Math.min(1, ry)) * 640 * dt;
        }
        clamp(L); clamp(R);
        if (serveT > 0) { serveT -= dt; if (serveT <= 0) { var a = api.rand(-0.4, 0.4); ball.vx = Math.cos(a) * ball.sp * ball.dir; ball.vy = Math.sin(a) * ball.sp; } }
        else {
          ball.x += ball.vx * dt; ball.y += ball.vy * dt;
          if (ball.y < 50 + ball.r || ball.y > H - 10 - ball.r) { ball.vy *= -1; ball.y = Math.max(50 + ball.r, Math.min(H - 10 - ball.r, ball.y)); api.sound(300, 0.03); }
          [L, R].forEach(function (p, i) {
            if (ball.x - ball.r < p.x + p.w && ball.x + ball.r > p.x && ball.y > p.y - 6 && ball.y < p.y + p.h + 6) {
              var hit = (ball.y - (p.y + p.h / 2)) / (p.h / 2);
              ball.sp = Math.min(1100, ball.sp + 35);
              var ang = hit * 0.9;
              ball.vx = Math.cos(ang) * ball.sp * (i === 0 ? 1 : -1); ball.vy = Math.sin(ang) * ball.sp;
              ball.x = i === 0 ? p.x + p.w + ball.r : p.x - ball.r;
              api.sound(i === 0 ? 520 : 440, 0.05);
            }
          });
          if (ball.x < -30) { sr++; api.sound(160, 0.2); serve(-1); }
          if (ball.x > W + 30) { sl++; api.sound(880, 0.2, 'triangle'); serve(1); }
          if (!done && (sl >= 7 || sr >= 7)) {
            done = true;
            var title = mode === 1 ? (sl > sr ? 'Você venceu! 🏆' : 'A TV venceu 😅') : (sl > sr ? 'Jogador 1 venceu!' : 'Jogador 2 venceu!');
            api.gameOver(mode === 1 ? Math.max(0, sl * 10 - sr * 3) : Math.max(sl, sr) * 10, title);
          }
        }
        api.hud(mode === 1 ? 'Você ' + sl : 'J1 ' + sl, (mode === 1 ? 'TV ' : 'J2 ') + sr);
      },
      draw: function (ctx) {
        D.clear(ctx, '#03141a', '#010508');
        ctx.setLineDash([14, 18]); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(W / 2, 50); ctx.lineTo(W / 2, H - 10); ctx.stroke(); ctx.setLineDash([]);
        if (choosing) {
          D.text(ctx, 'PINGUE-PONGUE', W / 2, 190, 64, '#67e8f9');
          D.text(ctx, (mode === 1 ? '▶ ' : '') + '1 Jogador (contra a TV)', W / 2 - 260, 360, 34, mode === 1 ? '#fff' : '#64748b');
          D.text(ctx, (mode === 2 ? '▶ ' : '') + '2 Jogadores', W / 2 + 300, 360, 34, mode === 2 ? '#fff' : '#64748b');
          D.text(ctx, '◀ ▶ escolhe · OK começa', W / 2, 470, 26, '#94a3b8');
          return;
        }
        D.text(ctx, String(sl), W / 2 - 90, 110, 72, 'rgba(255,255,255,.25)');
        D.text(ctx, String(sr), W / 2 + 90, 110, 72, 'rgba(255,255,255,.25)');
        D.glow(ctx, '#22d3ee', 20); ctx.fillStyle = '#67e8f9'; D.roundRect(ctx, L.x, L.y, L.w, L.h, 8); ctx.fill();
        D.glow(ctx, '#f472b6', 20); ctx.fillStyle = '#f9a8d4'; D.roundRect(ctx, R.x, R.y, R.w, R.h, 8); ctx.fill();
        D.glow(ctx, '#fff', 22); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
      }
    };
  }
});

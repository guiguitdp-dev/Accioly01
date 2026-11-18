/* Chuva de Meteoros — desvie dos meteoros e pegue as estrelas. */
GameHub.register({
  id: 'meteoros', name: 'Chuva de Meteoros', emoji: '☄️', color: '#7c3aed', premium: true,
  desc: 'Pilote a nave, desvie dos meteoros e colete estrelas.',
  help: 'Setas / direcional movem a nave',
  create: function (api) {
    var D = GameHub.draw, W = api.W, H = api.H;
    var ship = { x: W / 2, y: H - 90, r: 22 }, rocks = [], stars = [], bg = [], t = 0, spawn = 0, sspawn = 1.5, score = 0, lives = 3, inv = 0, acc = 0;
    for (var i = 0; i < 90; i++) bg.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 0.5 });
    return {
      update: function (dt) {
        t += dt; spawn -= dt; sspawn -= dt; inv = Math.max(0, inv - dt);
        var d = api.dir(0, true);
        ship.x = Math.max(30, Math.min(W - 30, ship.x + d.x * 620 * dt));
        ship.y = Math.max(120, Math.min(H - 40, ship.y + d.y * 480 * dt));
        var diff = 1 + t / 25;
        if (spawn <= 0) { spawn = Math.max(0.18, 0.75 / diff); rocks.push({ x: api.rand(20, W - 20), y: -40, r: api.rand(16, 40), vy: api.rand(180, 300) * diff, vx: api.rand(-60, 60), a: 0 }); }
        if (sspawn <= 0) { sspawn = api.rand(1.2, 2.4); stars.push({ x: api.rand(40, W - 40), y: -20, vy: 200 }); }
        bg.forEach(function (s) { s.y += s.s * 60 * dt * diff; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
        rocks.forEach(function (r) { r.y += r.vy * dt; r.x += r.vx * dt; r.a += dt; });
        stars.forEach(function (s) { s.y += s.vy * dt; });
        rocks = rocks.filter(function (r) {
          var hit = Math.hypot(r.x - ship.x, r.y - ship.y) < r.r + ship.r * 0.7;
          if (hit && inv <= 0) { lives--; inv = 1.5; api.sound(140, 0.3, 'sawtooth'); if (lives <= 0) api.gameOver(score); return false; }
          return r.y < H + 60;
        });
        stars = stars.filter(function (s) {
          if (Math.hypot(s.x - ship.x, s.y - ship.y) < 40) { score += 50; api.sound(990, 0.08, 'triangle'); return false; }
          return s.y < H + 30;
        });
        acc += dt * 10 * diff;
        while (acc >= 1) { score++; acc--; }
        api.hud('Pontos: ' + score, '❤'.repeat(Math.max(0, lives)) + '   Recorde: ' + api.best());
      },
      draw: function (ctx) {
        D.clear(ctx, '#0a0520', '#020108');
        ctx.fillStyle = '#fff';
        bg.forEach(function (s) { ctx.globalAlpha = s.s / 3; ctx.fillRect(s.x, s.y, s.s, s.s * 2); });
        ctx.globalAlpha = 1;
        stars.forEach(function (s) { D.text(ctx, '⭐', s.x, s.y, 40); });
        rocks.forEach(function (r) {
          D.glow(ctx, '#fb923c', 18); ctx.fillStyle = '#7c2d12';
          ctx.beginPath();
          for (var k = 0; k < 9; k++) { var ang = r.a + k / 9 * Math.PI * 2, rr = r.r * (0.8 + ((k * 37) % 5) / 12); ctx.lineTo(r.x + Math.cos(ang) * rr, r.y + Math.sin(ang) * rr); }
          ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 2; ctx.stroke();
        });
        if (inv <= 0 || Math.floor(inv * 10) % 2 === 0) {
          D.glow(ctx, '#60a5fa', 24); ctx.fillStyle = '#dbeafe';
          ctx.beginPath(); ctx.moveTo(ship.x, ship.y - 28); ctx.lineTo(ship.x + 22, ship.y + 22); ctx.lineTo(ship.x, ship.y + 12); ctx.lineTo(ship.x - 22, ship.y + 22); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(ship.x, ship.y + 22 + Math.random() * 6, 6, 0, Math.PI * 2); ctx.fill();
        }
      }
    };
  }
});

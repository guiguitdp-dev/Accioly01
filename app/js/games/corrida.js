/* Corrida Neon — troque de faixa, desvie dos carros e pegue moedas. */
GameHub.register({
  id: 'corrida', name: 'Corrida Neon', emoji: '🏎️', color: '#dc2626', premium: true,
  desc: 'Desvie no trânsito em alta velocidade e junte moedas.',
  help: '◀ ▶ trocam de faixa',
  create: function (api) {
    var D = GameHub.draw, W = api.W, H = api.H;
    var ROAD_W = 560, RX = (W - ROAD_W) / 2, LANES = 3, LW = ROAD_W / LANES;
    var lane = 1, carX = laneX(1), cars = [], coins = [], dist = 0, speed = 420, spawn = 0, cspawn = 1, score = 0, stripe = 0, alive = true;
    var COLORS = ['#f59e0b', '#22c55e', '#06b6d4', '#a855f7', '#f43f5e'];
    function laneX(l) { return RX + LW * l + LW / 2; }
    return {
      action: function (a) {
        if (a === 'left' && lane > 0) { lane--; api.sound(400, 0.03); }
        if (a === 'right' && lane < LANES - 1) { lane++; api.sound(400, 0.03); }
      },
      update: function (dt) {
        if (!alive) return;
        speed = Math.min(1100, speed + dt * 12);
        dist += speed * dt; stripe = (stripe + speed * dt) % 80;
        carX += (laneX(lane) - carX) * Math.min(1, dt * 14);
        spawn -= dt; cspawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.35, 1.1 - speed / 1500);
          var l = api.randInt(0, LANES - 1);
          cars.push({ l: l, y: -120, c: COLORS[api.randInt(0, COLORS.length - 1)], v: api.rand(0.3, 0.55) });
          if (speed > 650 && Math.random() < 0.35) cars.push({ l: (l + api.randInt(1, 2)) % LANES, y: -320, c: COLORS[api.randInt(0, COLORS.length - 1)], v: 0.4 });
        }
        if (cspawn <= 0) { cspawn = api.rand(0.8, 1.6); coins.push({ l: api.randInt(0, LANES - 1), y: -40 }); }
        var py = H - 130;
        cars.forEach(function (c) { c.y += speed * (1 - c.v) * dt; });
        coins.forEach(function (c) { c.y += speed * dt; });
        for (var i = 0; i < cars.length; i++) {
          var c = cars[i];
          if (Math.abs(laneX(c.l) - carX) < LW * 0.6 && Math.abs(c.y - py) < 110) { alive = false; api.sound(110, 0.5, 'sawtooth'); return api.gameOver(score + Math.floor(dist / 100), 'Bateu! 💥'); }
        }
        coins = coins.filter(function (c) { if (Math.abs(laneX(c.l) - carX) < LW * 0.5 && Math.abs(c.y - py) < 70) { score += 25; api.sound(1200, 0.05, 'triangle'); return false; } return c.y < H + 40; });
        cars = cars.filter(function (c) { return c.y < H + 150; });
        var total = score + Math.floor(dist / 100);
        api.hud('Pontos: ' + total + '   ' + Math.round(speed / 5) + ' km/h', 'Recorde: ' + api.best());
      },
      draw: function (ctx) {
        D.clear(ctx, '#12040a', '#050104');
        ctx.fillStyle = '#16161f'; ctx.fillRect(RX, 0, ROAD_W, H);
        D.glow(ctx, '#f43f5e', 20); ctx.fillStyle = '#f43f5e'; ctx.fillRect(RX - 8, 0, 8, H); ctx.fillRect(RX + ROAD_W, 0, 8, H);
        ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.35)';
        for (var l = 1; l < LANES; l++) for (var y = -80 + stripe; y < H; y += 80) ctx.fillRect(RX + LW * l - 3, y, 6, 40);
        coins.forEach(function (c) { D.text(ctx, '🪙', laneX(c.l), c.y, 44); });
        cars.forEach(function (c) { car(ctx, laneX(c.l), c.y, c.c, true); });
        car(ctx, carX, H - 130, '#e0e7ff', false);
      }
    };
    function car(ctx, x, y, color, enemy) {
      D.glow(ctx, color, 22); ctx.fillStyle = color;
      D.roundRect(ctx, x - 40, y - 70, 80, 140, 18); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,.55)';
      D.roundRect(ctx, x - 30, enemy ? y + 10 : y - 45, 60, 36, 8); ctx.fill();
      ctx.fillStyle = enemy ? '#fecaca' : '#fef9c3';
      ctx.fillRect(x - 32, enemy ? y + 60 : y - 72, 16, 8); ctx.fillRect(x + 16, enemy ? y + 60 : y - 72, 16, 8);
    }
  }
});

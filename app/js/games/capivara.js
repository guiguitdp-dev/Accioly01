/* Corre Capivara — corrida infinita: pule as pedras, abaixe dos pássaros e pegue laranjas. */
GameHub.register({
  id: 'capivara', name: 'Corre Capivara', emoji: '🦫', color: '#b45309', premium: false, trending: true,
  desc: 'A capivara mais tranquila do Brasil virou atleta! Pule, abaixe e junte laranjas.',
  help: 'OK ou ▲ pula (2x = pulo duplo) · ▼ abaixa',
  create: function (api) {
    var D = GameHub.draw, W = api.W, H = api.H, GROUND = 560;
    var cap = { x: 210, y: GROUND, vy: 0, jumps: 0, duck: false, run: 0 };
    var obs = [], fruits = [], speed = 430, dist = 0, bonus = 0, spawn = 1.2, fspawn = 2, t = 0, alive = true, hills = 0, puffs = [];
    function jump() {
      if (!alive) return;
      if (cap.jumps < 2) { cap.vy = cap.jumps ? -760 : -900; cap.jumps++; api.sound(cap.jumps === 1 ? 520 : 700, 0.06, 'triangle'); }
    }
    function box() {
      return cap.duck && cap.y >= GROUND ? { x: cap.x - 60, y: cap.y - 46, w: 130, h: 46 } : { x: cap.x - 52, y: cap.y - 88, w: 110, h: 84 };
    }
    function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
    return {
      action: function (a) { if (a === 'ok' || a === 'up') jump(); },
      update: function (dt) {
        if (!alive) return;
        t += dt;
        speed = Math.min(1150, 430 + t * 9);
        dist += speed * dt; hills = (hills + speed * dt * 0.25) % W;
        var d = api.dir(0, true);
        cap.duck = d.y > 0;
        cap.vy += (cap.duck ? 4200 : 2400) * dt;
        cap.y += cap.vy * dt;
        if (cap.y >= GROUND) { cap.y = GROUND; cap.vy = 0; cap.jumps = 0; }
        cap.run += dt * speed / 60;
        spawn -= dt; fspawn -= dt;
        if (spawn <= 0) {
          var bird = dist > 2500 && Math.random() < 0.35;
          if (bird) obs.push({ kind: 'bird', x: W + 40, y: GROUND - api.rand(110, 150), w: 70, h: 34, f: 0 });
          else { var big = Math.random() < 0.4; obs.push({ kind: big ? 'log' : 'rock', x: W + 40, y: GROUND - (big ? 62 : 44), w: big ? 90 : 56, h: big ? 62 : 44 }); }
          spawn = api.rand(0.75, 1.5) * Math.max(0.55, 430 / speed * 1.2);
        }
        if (fspawn <= 0) { fruits.push({ x: W + 40, y: GROUND - api.rand(60, 230) }); fspawn = api.rand(1.2, 2.6); }
        obs.forEach(function (o) { o.x -= speed * dt * (o.kind === 'bird' ? 1.15 : 1); o.f += dt; });
        fruits.forEach(function (f) { f.x -= speed * dt; });
        var b = box();
        for (var i = 0; i < obs.length; i++) {
          var o = obs[i], ob = { x: o.x + 6, y: o.y + 6, w: o.w - 12, h: o.h - 10 };
          if (hit(b, ob)) { alive = false; api.sound(110, 0.5, 'sawtooth'); return api.gameOver(Math.floor(dist / 10) + bonus, 'Ops! A capivara tropeçou'); }
        }
        fruits = fruits.filter(function (f) {
          if (hit(b, { x: f.x - 22, y: f.y - 22, w: 44, h: 44 })) { bonus += 50; puffs.push({ x: f.x, y: f.y, t: 0.5 }); api.sound(1100, 0.06, 'triangle'); return false; }
          return f.x > -60;
        });
        obs = obs.filter(function (o) { return o.x > -120; });
        puffs = puffs.filter(function (p) { p.t -= dt; p.y -= dt * 60; return p.t > 0; });
        api.hud('Pontos: ' + (Math.floor(dist / 10) + bonus) + '   🍊 +' + bonus, 'Recorde: ' + api.best());
      },
      draw: function (ctx) {
        var sky = ctx.createLinearGradient(0, 0, 0, GROUND); sky.addColorStop(0, '#1e1b4b'); sky.addColorStop(0.6, '#c2410c'); sky.addColorStop(1, '#fdba74');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        ctx.shadowBlur = 40; ctx.shadowColor = '#fde68a'; ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(980, 250, 70, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#7c2d12';
        for (var k = -1; k < 3; k++) { var hx = k * W / 2 - hills % (W / 2); ctx.beginPath(); ctx.moveTo(hx, GROUND); ctx.quadraticCurveTo(hx + 160, GROUND - 170, hx + 320, GROUND); ctx.quadraticCurveTo(hx + 480, GROUND - 110, hx + 640, GROUND); ctx.fill(); }
        ctx.fillStyle = '#14532d'; ctx.fillRect(0, GROUND, W, H - GROUND);
        ctx.fillStyle = '#166534'; for (var g = 0; g < 30; g++) { var gx = ((g * 97) - dist * 0.9) % W; if (gx < 0) gx += W; ctx.fillRect(gx, GROUND + 18 + (g % 4) * 30, 40, 6); }
        fruits.forEach(function (f) { D.text(ctx, '🍊', f.x, f.y, 42); });
        obs.forEach(function (o) {
          if (o.kind === 'rock') { ctx.fillStyle = '#57534e'; D.roundRect(ctx, o.x, o.y, o.w, o.h, 14); ctx.fill(); ctx.fillStyle = '#78716c'; D.roundRect(ctx, o.x + 8, o.y + 6, o.w - 30, 12, 6); ctx.fill(); }
          else if (o.kind === 'log') { ctx.fillStyle = '#78350f'; D.roundRect(ctx, o.x, o.y, o.w, o.h, 10); ctx.fill(); ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.arc(o.x + 14, o.y + o.h / 2, 18, 0, Math.PI * 2); ctx.fill(); }
          else { ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(o.x + 35, o.y + 17, 28, 12, 0, 0, Math.PI * 2); ctx.fill(); var wy = Math.sin(o.f * 14) * 16; ctx.beginPath(); ctx.moveTo(o.x + 25, o.y + 14); ctx.lineTo(o.x + 40, o.y - wy); ctx.lineTo(o.x + 50, o.y + 14); ctx.fill(); ctx.fillStyle = '#f59e0b'; ctx.fillRect(o.x, o.y + 14, 10, 4); }
        });
        // capivara
        var x = cap.x, y = cap.y, ducking = cap.duck && cap.y >= GROUND, bob = cap.y >= GROUND ? Math.sin(cap.run) * 3 : 0;
        ctx.save(); ctx.translate(x, y + bob);
        if (ducking) ctx.scale(1.15, 0.6);
        ctx.fillStyle = '#92400e';
        D.roundRect(ctx, -55, -80, 105, 70, 32); ctx.fill();
        D.roundRect(ctx, 20, -96, 52, 50, 20); ctx.fill();
        ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.arc(30, -96, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(48, -80, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(64, -66, 8, 6);
        var leg = cap.y >= GROUND ? Math.sin(cap.run * 1.4) * 8 : 6;
        ctx.fillStyle = '#78350f'; ctx.fillRect(-40, -16, 16, 16 + leg); ctx.fillRect(20, -16, 16, 16 - leg);
        ctx.restore();
        if (!ducking) D.text(ctx, '🍊', x + 44, y - 108 + bob, 30);
        puffs.forEach(function (p) { ctx.globalAlpha = p.t * 2; D.text(ctx, '+50', p.x, p.y, 28, '#fde68a'); });
        ctx.globalAlpha = 1;
      }
    };
  }
});

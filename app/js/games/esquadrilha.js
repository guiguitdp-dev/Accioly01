/* Esquadrilha 2000 — tiro vertical de fliperama. Tiro automático, OK solta bomba. */
GameHub.register({
  id: 'esquadrilha', name: 'Esquadrilha 2000', emoji: '✈️', color: '#0369a1', premium: true, trending: true, shooter: true,
  fireLabel: '💣', desc: 'Pilote o caça, derrote esquadrões e enfrente chefões em 4 céus.',
  help: 'Setas movem · tiro automático · OK solta bomba',
  create: function (api) {
    var D = GameHub.draw, W = api.W, H = api.H, PI2 = Math.PI * 2;
    var SKY = [['#38bdf8', '#e0f2fe'], ['#7c2d12', '#fb923c'], ['#0b1026', '#1e1b4b'], ['#020108', '#1a0b3a']];
    var ply = { x: W / 2, y: H - 100, r: 16 };
    var pb = [], eb = [], en = [], pu = [], pa = [], cl = [], st = [];
    var score = 0, lives = 3, bombs = 3, power = 1, shield = 0, inv = 0, fire = 0, combo = 0, comboT = 0;
    var stage = 0, stageT = 0, wave = 0, waveT = 2, boss = null, shake = 0, flash = 0, banner = 2.5, bannerTxt = 'FASE 1', t = 0, over = false;
    var i;
    for (i = 0; i < 14; i++) cl.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() * 1.2 });
    for (i = 0; i < 70; i++) st.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() * 2 });

    function boom(x, y, n, col, big) {
      for (var k = 0; k < n && pa.length < 220; k++) {
        var a = Math.random() * PI2, v = api.rand(40, big ? 420 : 260);
        pa.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: api.rand(0.3, 0.8), m: 0.8, c: Math.random() < 0.4 ? '#fde047' : col, r: api.rand(2, big ? 6 : 4) });
      }
      if (big) { shake = Math.max(shake, 0.4); api.sound(80, 0.35, 'sawtooth', 0.12); } else api.sound(220, 0.08, 'square', 0.05);
    }
    function addScore(n) { combo++; comboT = 2.5; score += n * (1 + Math.min(4, Math.floor(combo / 8))); }
    function drop(x, y, force) {
      if (!force && Math.random() > 0.13) return;
      var r = Math.random(), k = r < 0.4 ? 'p' : r < 0.6 ? 's' : r < 0.85 ? 'b' : 'l';
      if (k === 'l' && lives >= 5) k = 'p';
      pu.push({ x: x, y: y, k: k });
    }
    function enemy(k, x, y, o) {
      var e = { k: k, x: x, y: y, hp: 1, r: 22, t: 0, cd: api.rand(0.8, 2), p: 0, sc: 100, vx: 0, vy: 110 };
      if (k === 't') { e.hp = 5; e.r = 28; e.sc = 300; e.vy = 70; }
      if (k === 'k') { e.hp = 1; e.r = 20; e.sc = 150; e.vy = 0; e.cd = 99; }
      for (var q in o) e[q] = o[q];
      e.max = e.hp; en.push(e);
      return e;
    }
    function spawnWave() {
      var n = wave++ % 5, k, d = 1 + stage * 0.15;
      if (n === 0) { for (k = 0; k < 7; k++) enemy('v', W / 2 + (k - 3) * 70, -40 - Math.abs(k - 3) * 55, { p: 0, ox: W / 2 + (k - 3) * 70, vy: 130 * d }); }
      else if (n === 1) { for (k = 0; k < 5; k++) enemy('s', 140 + (k % 2) * 40, -40 - k * 70, { dirx: 1, vy: 150 * d, vx: 230 }); }
      else if (n === 2) { for (k = 0; k < 4 + stage; k++) enemy('k', api.rand(80, W - 80), -40 - k * 90, { vy: 0 }); }
      else if (n === 3) { enemy('t', api.rand(200, 450), -40); enemy('t', api.rand(800, 1080), -40); for (k = 0; k < 4; k++) enemy('v', W - 140 - k * 50, -40 - k * 60, { ox: W - 140 - k * 50, vy: 140 * d }); }
      else { for (k = 0; k < 6; k++) enemy('s', W - 140, -40 - k * 60, { dirx: -1, vy: 150 * d, vx: -230 }); }
      waveT = Math.max(2.2, 5 - stage * 0.5);
    }
    function spawnBoss() {
      boss = enemy('B', W / 2, -120, { hp: 60 + stage * 30, r: 70, sc: 5000, vy: 90, cd: 1.5 });
      bannerTxt = 'ALERTA: CHEFÃO'; banner = 2.5;
    }
    function efire(e, ang, sp) { if (eb.length < 120) eb.push({ x: e.x, y: e.y + e.r * 0.5, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp }); }
    function aim(e) { return Math.atan2(ply.y - e.y, ply.x - e.x); }
    function hurt() {
      if (inv > 0) return;
      if (shield > 0) { shield = 0; inv = 1; boom(ply.x, ply.y, 14, '#67e8f9'); return; }
      lives--; combo = 0; power = Math.max(1, power - 1); inv = 2.2; boom(ply.x, ply.y, 30, '#fb923c', true);
      if (lives <= 0) { over = true; api.gameOver(score, 'Abatido!'); }
    }
    function bomb() {
      if (bombs <= 0 || over) return;
      bombs--; flash = 0.6; shake = 0.6; eb.length = 0; api.sound(60, 0.6, 'sawtooth', 0.15);
      en.forEach(function (e) {
        if (e.k === 'B') { e.hp -= 15; boom(e.x, e.y, 20, '#fde047', true); } else { e.hp = 0; }
      });
    }
    function killed(e) {
      boom(e.x, e.y, e.k === 'B' ? 90 : 16, e.k === 't' ? '#94a3b8' : '#f87171', e.k === 'B' || e.k === 't');
      addScore(e.sc); drop(e.x, e.y, e.k === 'B' || e.k === 't' && Math.random() < 0.5);
      if (e.k === 'B') {
        boss = null; eb.length = 0; stage++; stageT = 0; wave = 0; waveT = 3; lives = Math.min(5, lives + 1); bombs = Math.min(9, bombs + 1);
        bannerTxt = 'FASE ' + (stage + 1); banner = 3; shake = 1; flash = 0.5;
      }
    }

    function update(dt) {
      t += dt; stageT += dt; inv = Math.max(0, inv - dt); shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt); banner = Math.max(0, banner - dt);
      shield = Math.max(0, shield - dt); comboT -= dt; if (comboT <= 0) combo = 0;
      var d = api.dir(0, true), i, j, e, b, p;
      ply.x = Math.max(30, Math.min(W - 30, ply.x + d.x * 520 * dt));
      ply.y = Math.max(80, Math.min(H - 40, ply.y + d.y * 420 * dt));
      // tiro automático
      fire -= dt;
      if (fire <= 0 && pb.length < 80) {
        fire = 0.16; api.sound(900, 0.03, 'square', 0.02);
        if (power === 1) pb.push({ x: ply.x, y: ply.y - 24, vx: 0 });
        else if (power === 2) { pb.push({ x: ply.x - 12, y: ply.y - 20, vx: 0 }); pb.push({ x: ply.x + 12, y: ply.y - 20, vx: 0 }); }
        else if (power === 3) { pb.push({ x: ply.x, y: ply.y - 26, vx: 0 }); pb.push({ x: ply.x - 16, y: ply.y - 18, vx: -60 }); pb.push({ x: ply.x + 16, y: ply.y - 18, vx: 60 }); }
        else { for (j = -2; j <= 2; j++) pb.push({ x: ply.x + j * 8, y: ply.y - 20, vx: j * 110 }); }
      }
      // fundo
      cl.forEach(function (c) { c.y += 50 * c.s * dt; if (c.y > H + 60) { c.y = -60; c.x = Math.random() * W; } });
      st.forEach(function (s) { s.y += 90 * s.s * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
      // ondas
      if (!boss) {
        if (stageT > 70 + stage * 5 && en.length === 0) spawnBoss();
        else if (stageT <= 70 + stage * 5) { waveT -= dt; if (waveT <= 0) spawnWave(); }
      }
      // balas do jogador
      for (i = 0; i < pb.length; i++) { pb[i].y -= 900 * dt; pb[i].x += pb[i].vx * dt; }
      pb = pb.filter(function (x) { return x.y > -20 && x.x > -20 && x.x < W + 20; });
      // inimigos
      for (i = 0; i < en.length; i++) {
        e = en[i]; e.t += dt; e.cd -= dt;
        if (e.k === 'v') { e.y += e.vy * dt; e.x = e.ox + Math.sin(e.t * 2.2) * 120; if (e.cd <= 0) { e.cd = api.rand(1.5, 3); efire(e, Math.PI / 2, 260); } }
        else if (e.k === 's') { e.y += e.vy * dt * 0.5; e.x += e.vx * dt * Math.cos(e.t * 1.6); if (e.cd <= 0) { e.cd = api.rand(1.5, 3); efire(e, aim(e), 240); } }
        else if (e.k === 'k') {
          if (e.t < 0.6) e.y += 200 * dt; else { var a = aim(e), sp = 150 + Math.min(250, (e.t - 0.6) * 150); e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.x += e.vx * dt; e.y += e.vy * dt; }
        }
        else if (e.k === 't') { e.y += e.vy * dt; if (e.cd <= 0) { e.cd = 1.4; for (j = -1; j <= 1; j++) efire(e, aim(e) + j * 0.25, 280); } }
        else if (e.k === 'B') {
          if (e.y < 150) e.y += e.vy * dt;
          e.x = W / 2 + Math.sin(e.t * 0.7) * 420;
          if (e.cd <= 0) {
            var ph = e.hp < e.max / 2 ? 1 : 0;
            e.cd = ph ? 0.9 : 1.3; e.p++;
            if (e.p % 3 === 0) { for (j = 0; j < 14; j++) efire(e, j / 14 * PI2 + e.t, 220); }
            else if (e.p % 3 === 1) { for (j = -3; j <= 3; j++) efire(e, Math.PI / 2 + j * 0.2, 260); }
            else { for (j = 0; j < (ph ? 5 : 3); j++) efire(e, aim(e) + (j - 2) * 0.12, 330); }
            api.sound(150, 0.12, 'sawtooth', 0.05);
          }
        }
        // colisão com balas
        for (j = 0; j < pb.length; j++) {
          b = pb[j];
          if (Math.abs(b.x - e.x) < e.r + 4 && Math.abs(b.y - e.y) < e.r + 8) { b.y = -99; e.hp--; e.hit = 0.08; if (e.hp > 0) boom(b.x, b.y + 99 < 0 ? e.y : e.y, 1, '#fde047'); }
        }
        if (e.hp > 0 && Math.hypot(e.x - ply.x, e.y - ply.y) < e.r + ply.r * 0.7) { if (e.k !== 'B') e.hp = 0; hurt(); }
        if (e.hit > 0) e.hit -= dt;
      }
      en = en.filter(function (x) {
        if (x.hp <= 0) { killed(x); return false; }
        return x.y < H + 60 && x.x > -120 && x.x < W + 120;
      });
      // balas inimigas
      for (i = 0; i < eb.length; i++) {
        p = eb[i]; p.x += p.vx * dt; p.y += p.vy * dt;
        if (Math.hypot(p.x - ply.x, p.y - ply.y) < 14) { p.y = H + 99; hurt(); }
      }
      eb = eb.filter(function (x) { return x.y < H + 20 && x.y > -20 && x.x > -20 && x.x < W + 20; });
      // power-ups
      pu = pu.filter(function (u) {
        u.y += 110 * dt;
        if (Math.hypot(u.x - ply.x, u.y - ply.y) < 38) {
          api.sound(990, 0.12, 'triangle', 0.06); score += 200;
          if (u.k === 'p') power = Math.min(4, power + 1); else if (u.k === 's') shield = 10;
          else if (u.k === 'b') bombs = Math.min(9, bombs + 1); else lives = Math.min(5, lives + 1);
          return false;
        }
        return u.y < H + 30;
      });
      pa.forEach(function (q) { q.x += q.vx * dt; q.y += q.vy * dt; q.l -= dt; });
      pa = pa.filter(function (q) { return q.l > 0; });
      api.hud('Pontos: ' + score + (combo > 7 ? '  x' + (1 + Math.min(4, Math.floor(combo / 8))) : ''),
        '✈'.repeat(Math.max(0, lives)) + '  💣' + bombs + '  Recorde: ' + api.best());
    }

    function plane(ctx, x, y, s, c1, c2, down) {
      ctx.save(); ctx.translate(x, y); if (down) ctx.scale(1, -1); ctx.scale(s, s);
      D.glow(ctx, c1, 14);
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(7, -8); ctx.lineTo(36, 14); ctx.lineTo(36, 22); ctx.lineTo(8, 14); ctx.lineTo(8, 26); ctx.lineTo(18, 32); ctx.lineTo(18, 36); ctx.lineTo(0, 32);
      ctx.lineTo(-18, 36); ctx.lineTo(-18, 32); ctx.lineTo(-8, 26); ctx.lineTo(-8, 14); ctx.lineTo(-36, 22); ctx.lineTo(-36, 14); ctx.lineTo(-7, -8); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(0, -4, 5, 11, 0, 0, PI2); ctx.fill();
      ctx.restore();
    }
    function drawEnemy(ctx, e) {
      var c = e.hit > 0 ? '#ffffff' : null;
      if (e.k === 'v') plane(ctx, e.x, e.y, 0.7, c || '#ef4444', '#fef08a', true);
      else if (e.k === 's') plane(ctx, e.x, e.y, 0.7, c || '#a855f7', '#fef08a', true);
      else if (e.k === 'k') {
        D.glow(ctx, '#f97316', 16); ctx.fillStyle = c || '#f59e0b';
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.atan2(e.vy, e.vx) - Math.PI / 2 + Math.PI);
        ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(18, 16); ctx.lineTo(0, 8); ctx.lineTo(-18, 16); ctx.closePath(); ctx.fill(); ctx.restore();
      } else if (e.k === 't') {
        D.glow(ctx, '#38bdf8', 12); ctx.fillStyle = c || '#475569'; ctx.beginPath(); ctx.arc(e.x, e.y, 28, 0, PI2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(e.x, e.y, 14, 0, PI2); ctx.fill();
        var a = aim(e); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 34); ctx.stroke();
      } else {
        plane(ctx, e.x, e.y, 2.1, c || '#7f1d1d', '#fde047', true);
        ctx.shadowBlur = 0; ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(e.x, e.y, 14 + Math.sin(e.t * 6) * 3, 0, PI2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    function draw(ctx) {
      var sk = SKY[stage % 4], k, i;
      ctx.save();
      if (shake > 0) ctx.translate(api.rand(-1, 1) * shake * 18, api.rand(-1, 1) * shake * 18);
      D.clear(ctx, sk[0], sk[1]);
      if (stage % 4 === 1) { ctx.fillStyle = 'rgba(253,224,71,0.7)'; ctx.beginPath(); ctx.arc(W * 0.75, H * 0.8, 90, 0, PI2); ctx.fill(); }
      if (stage % 4 >= 2) { ctx.fillStyle = '#fff'; st.forEach(function (s) { ctx.globalAlpha = 0.3 + s.s / 3; ctx.fillRect(s.x, s.y, s.s, s.s * (stage % 4 === 3 ? 4 : 1.5)); }); ctx.globalAlpha = 1; }
      ctx.fillStyle = stage % 4 === 0 ? 'rgba(255,255,255,0.85)' : stage % 4 === 1 ? 'rgba(254,215,170,0.35)' : 'rgba(148,163,184,0.12)';
      cl.forEach(function (c) {
        if (stage % 4 === 3) return;
        for (var q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(c.x + q * 30 * c.s, c.y + (q % 2) * -10 * c.s, 30 * c.s, 0, PI2); ctx.fill(); }
      });
      pu.forEach(function (u) {
        var col = { p: '#facc15', s: '#22d3ee', b: '#f97316', l: '#f43f5e' }[u.k], ch = { p: 'P', s: 'S', b: 'B', l: '♥' }[u.k];
        D.glow(ctx, col, 20); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(u.x, u.y, 20 + Math.sin(t * 8) * 2, 0, PI2); ctx.fill();
        D.text(ctx, ch, u.x, u.y + 1, 22, '#111');
      });
      en.forEach(function (e) { drawEnemy(ctx, e); });
      D.glow(ctx, '#f43f5e', 12); ctx.fillStyle = '#fecdd3';
      eb.forEach(function (b) { ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, PI2); ctx.fill(); });
      D.glow(ctx, '#f59e0b', 10); ctx.fillStyle = '#fbbf24';
      pb.forEach(function (b) { ctx.fillRect(b.x - 3, b.y - 12, 6, 24); });
      ctx.shadowBlur = 0;
      if (!over && (inv <= 0 || Math.floor(inv * 12) % 2 === 0)) {
        plane(ctx, ply.x, ply.y, 0.75, '#1d4ed8', '#67e8f9', false);
        ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.moveTo(ply.x - 6, ply.y + 26); ctx.lineTo(ply.x + 6, ply.y + 26); ctx.lineTo(ply.x, ply.y + 34 + Math.random() * 14); ctx.fill();
        if (shield > 0) { D.glow(ctx, '#22d3ee', 20); ctx.strokeStyle = shield < 2 && Math.floor(t * 8) % 2 ? 'rgba(34,211,238,0.2)' : '#22d3ee'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ply.x, ply.y, 42, 0, PI2); ctx.stroke(); }
      }
      for (i = 0; i < pa.length; i++) { k = pa[i]; ctx.globalAlpha = Math.max(0, k.l / k.m); ctx.fillStyle = k.c; ctx.fillRect(k.x, k.y, k.r, k.r); }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      if (boss) {
        D.roundRect(ctx, W / 2 - 250, 60, 500, 18, 8); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
        D.roundRect(ctx, W / 2 - 248, 62, Math.max(0, 496 * boss.hp / boss.max), 14, 6); ctx.fillStyle = boss.hp < boss.max / 2 ? '#ef4444' : '#f59e0b'; ctx.fill();
      }
      if (banner > 0) { ctx.globalAlpha = Math.min(1, banner); D.text(ctx, bannerTxt, W / 2, H * 0.35, 72, '#fff'); ctx.globalAlpha = 1; }
      if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash * 1.2 + ')'; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
    }

    return { update: update, draw: draw, action: function (a) { if (a === 'ok') bomb(); } };
  }
});

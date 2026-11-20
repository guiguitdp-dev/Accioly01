/* Mira Certeira — tiro de mira "sobre trilhos": robôs invadem a cidade. Poupe os civis! */
GameHub.register({
  id: 'mira', name: 'Mira Certeira', emoji: '🎯', color: '#b91c1c', premium: true, trending: true, shooter: true,
  fireLabel: '🎯', desc: 'Defenda a cidade dos robôs invasores. Mire, atire, recarregue e poupe os civis!',
  help: 'Direcional mira · OK atira · ▼ recarrega · no celular toque no alvo',
  create: function (api) {
    var D = GameHub.draw, W = api.W, H = api.H, R = api.rand, MAXAMMO = 6;
    var aimP = { x: W / 2, y: 340 }, ammo = MAXAMMO, reload = 0, score = 0, lives = 3, combo = 0, shots = 0, hits = 0;
    var stage = 0, phase = 'banner', ptimer = 2, toSpawn = 0, spawnT = 0, civHit = false, shake = 0, redFlash = 0, flash = 0, msg = '', msgT = 0;
    var slots = [], foes = [], bonus = [], sparks = [], holes = [], boss = null, bonusT = 4, bg = null, pal = null, tt = 0;

    function say(m, t) { msg = m; msgT = t || 1.2; }
    function snd(f, d, t, v) { api.sound(f, d, t, v); }

    // ---------- cenário (desenhado uma vez por parada num canvas à parte) ----------
    function buildScene() {
      var pals = [['#1e3a8a', '#f59e0b', '#334155'], ['#4c1d95', '#fb7185', '#3b2f4f'], ['#064e3b', '#fde68a', '#1f3b3a'], ['#7c2d12', '#fdba74', '#44302a']];
      pal = pals[stage % pals.length];
      bg = bg || document.createElement('canvas'); bg.width = W; bg.height = H;
      var c = bg.getContext('2d'), i, j, x, g;
      g = c.createLinearGradient(0, 0, 0, 420); g.addColorStop(0, '#05060f'); g.addColorStop(0.55, pal[0]); g.addColorStop(1, pal[1]);
      c.fillStyle = g; c.fillRect(0, 0, W, 430);
      c.fillStyle = 'rgba(255,255,255,.7)';
      for (i = 0; i < 40; i++) c.fillRect(R(0, W), R(0, 160), 2, 2);
      for (var row = 0; row < 2; row++) {
        x = -20;
        while (x < W) {
          var bw = R(110, 210), bh = row ? R(170, 300) : R(240, 400), top = 430 - bh;
          c.fillStyle = row ? pal[2] : '#0f172a'; c.fillRect(x, top, bw, bh + 10);
          c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(x, top, 8, bh);
          for (j = 0; j < (bh / 34 | 0); j++) for (var k = 0; k < (bw / 30 | 0); k++) {
            c.fillStyle = Math.random() < 0.35 ? '#fde68a' : (row ? '#1e293b' : '#0b1220');
            c.fillRect(x + 14 + k * 30, top + 14 + j * 34, 16, 20);
          }
          x += bw + R(0, 14);
        }
      }
      c.fillStyle = '#475569'; c.fillRect(0, 425, W, 30);            // calçada
      g = c.createLinearGradient(0, 455, 0, H); g.addColorStop(0, '#1f2937'); g.addColorStop(1, '#0b0f17');
      c.fillStyle = g; c.fillRect(0, 455, W, H - 455);
      c.strokeStyle = 'rgba(250,250,250,.35)'; c.lineWidth = 6;
      for (i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(640 + i * 14, 455); c.lineTo(640 + i * 330, H); c.stroke(); }
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 3;
      for (i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0, 480 + i * i * 14); c.lineTo(W, 480 + i * i * 14); c.stroke(); }
    }

    function makeSlots() {
      slots = [];
      var wx = [170, 640, 1110], gx = [140, 420, 700, 980, 1180], i;
      for (i = 0; i < 3; i++) slots.push({ x: wx[i] + R(-60, 60), y: R(255, 300), s: 0.62, ch: 14, kind: 'win', busy: false });
      for (i = 0; i < 5; i++) { var s = R(0.85, 1.15); slots.push({ x: gx[i] + R(-40, 40), y: 470 + s * 110 + R(-20, 20), s: s, ch: 74 * s, kind: 'box', busy: false }); }
      slots.sort(function (a, b) { return a.y - b.y; });
    }

    function nextStage() {
      stage++; civHit = false; foes = []; bonus = []; holes = []; boss = null;
      buildScene(); makeSlots();
      if (stage % 3 === 0) {
        boss = { p: 0, t: 0, fire: 2.5, warn: 0, parts: [{ dx: -190, dy: -215, hp: 5 }, { dx: 0, dy: -200, hp: 6 }, { dx: 190, dy: -215, hp: 5 }], dead: false };
        toSpawn = 0; say('CHEFÃO!', 1.6);
      } else toSpawn = 5 + stage * 2;
      phase = 'banner'; ptimer = 2; spawnT = 1; ammo = MAXAMMO; reload = 0;
    }

    // ---------- geometria dos inimigos ----------
    function geom(e) {
      var s = e.slot, k = s.s, by = s.y - s.ch + 20 * k + (1 - e.p) * 125 * k;
      return { hx: s.x, hy: by - 100 * k, hr: 17 * k, x0: s.x - 26 * k, x1: s.x + 26 * k, y0: by - 82 * k, y1: Math.min(by, s.y - s.ch), cut: s.y - s.ch };
    }
    function spark(x, y, n, col) {
      for (var i = 0; i < n && sparks.length < 90; i++) { var a = R(0, 6.28), v = R(80, 380); sparks.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, l: R(0.3, 0.7), c: col || (Math.random() < 0.5 ? '#fde047' : '#fb923c') }); }
    }
    function scorePts(base) { var m = Math.min(4, 1 + Math.floor(combo / 5) * 0.5); score += Math.round(base * m); }
    function hurt() { lives--; shake = 0.45; redFlash = 0.35; combo = 0; snd(110, 0.35, 'sawtooth', 0.4); if (lives <= 0) { phase = 'dead'; ptimer = 1; } }

    // ---------- tiro ----------
    function shoot(x, y) {
      if (phase === 'dead' || reload > 0) return;
      if (y > 650) { doReload(); return; }
      if (ammo <= 0) { snd(200, 0.05, 'square', 0.2); say('RECARREGUE! (▼)', 0.8); return; }
      ammo--; shots++; flash = 0.08; snd(520, 0.09, 'square', 0.3);
      var i, did = false;
      for (i = bonus.length - 1; i >= 0 && !did; i--) {
        var b = bonus[i];
        if (Math.hypot(b.x - x, b.y - y) < b.r + 8) { bonus.splice(i, 1); did = true; hits++; combo++; scorePts(250); spark(b.x, b.y, 14, '#67e8f9'); snd(1100, 0.12, 'triangle', 0.3); say('BÔNUS +250', 0.7); }
      }
      if (!did && boss && boss.p >= 1) {
        var bx = W / 2, by = 600, j;
        for (j = 0; j < 3 && !did; j++) {
          var pt = boss.parts[j];
          if (pt.hp > 0 && Math.hypot(bx + pt.dx - x, by + pt.dy - y) < 40) {
            pt.hp--; did = true; hits++; combo++; scorePts(80); spark(x, y, 8); snd(300, 0.08, 'sawtooth', 0.3);
            if (pt.hp <= 0) { scorePts(500); spark(x, y, 30); snd(160, 0.4, 'sawtooth', 0.4); say('PONTO FRACO DESTRUÍDO!', 1); }
          }
        }
        if (!did && x > bx - 190 && x < bx + 190 && y > by - 340 && y < by - 40) { did = true; snd(900, 0.05, 'square', 0.2); spark(x, y, 4, '#cbd5e1'); combo = 0; }
        if (boss.parts[0].hp <= 0 && boss.parts[1].hp <= 0 && boss.parts[2].hp <= 0) { boss.dead = true; score += 2000; spark(W / 2, 400, 60); say('CHEFÃO DERROTADO +2000', 1.8); snd(80, 0.8, 'sawtooth', 0.5); boss = null; endStage(); }
      }
      if (!did) {
        for (i = foes.length - 1; i >= 0 && !did; i--) {          // da frente para trás
          var e = foes[i]; if (e.state === 'leave' && e.p < 0.3) continue;
          var g = geom(e), head = Math.hypot(g.hx - x, g.hy - y) < g.hr + 6 && y < g.cut;
          var body = x > g.x0 && x < g.x1 && y > g.y0 && y < g.y1;
          if (head || body) {
            did = true; e.slot.busy = false; foes.splice(i, 1); spark(x, y, 16);
            if (e.kind === 'civ') { score = Math.max(0, score - 300); civHit = true; combo = 0; hurt(); say('CIVIL ATINGIDO! -300', 1.2); }
            else { hits++; combo++; scorePts(head ? 150 : 100); snd(head ? 880 : 700, 0.1, 'triangle', 0.3); if (head) say('NA CABEÇA!', 0.5); }
          }
        }
      }
      if (!did) { combo = 0; holes.push({ x: x, y: y, l: 6 }); if (holes.length > 18) holes.shift(); }
      if (ammo === 0) say('RECARREGUE! (▼)', 1);
    }
    function doReload() { if (ammo < MAXAMMO && reload <= 0) { reload = 0.7; snd(300, 0.1, 'square', 0.25); setTimeout(function () { snd(420, 0.08, 'square', 0.25); }, 350); } }
    function endStage() { phase = 'clear'; ptimer = 2.2; if (!civHit && !boss && stage % 3 !== 0) { score += 500; say('SEM CIVIS FERIDOS +500', 1.8); } else if (!msgT) say('PARADA CONCLUÍDA!', 1.5); }

    // ---------- atualização ----------
    function update(dt) {
      var i, d = api.dir(0, true);
      tt += dt; shake = Math.max(0, shake - dt); redFlash = Math.max(0, redFlash - dt); flash = Math.max(0, flash - dt); msgT = Math.max(0, msgT - dt);
      aimP.x = Math.max(10, Math.min(W - 10, aimP.x + d.x * 760 * dt));
      aimP.y = Math.max(50, Math.min(H - 10, aimP.y + d.y * 760 * dt));
      if (reload > 0) { reload -= dt; if (reload <= 0) { ammo = MAXAMMO; reload = 0; } }
      for (i = sparks.length - 1; i >= 0; i--) { var s = sparks[i]; s.l -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 600 * dt; if (s.l <= 0) sparks.splice(i, 1); }
      for (i = holes.length - 1; i >= 0; i--) { holes[i].l -= dt; if (holes[i].l <= 0) holes.splice(i, 1); }
      if (phase === 'dead') { ptimer -= dt; if (ptimer <= 0) { phase = 'over'; api.gameOver(score, 'Precisão: ' + (shots ? Math.round(hits / shots * 100) : 0) + '%'); } }
      else if (phase === 'banner') { ptimer -= dt; if (ptimer <= 0) phase = 'play'; }
      else if (phase === 'clear') { ptimer -= dt; if (ptimer <= 0) nextStage(); }
      else if (phase === 'play') {
        spawnT -= dt;
        if (!boss && toSpawn > 0 && spawnT <= 0 && foes.length < 3) {
          var free = slots.filter(function (z) { return !z.busy; });
          if (free.length) {
            var z = free[Math.floor(Math.random() * free.length)], civ = Math.random() < 0.2 && stage > 0;
            z.busy = true; toSpawn--; spawnT = Math.max(0.5, 1.4 - stage * 0.08);
            foes.push({ slot: z, kind: civ ? 'civ' : 'bot', t: 0, p: 0, state: 'rise', life: civ ? 2.6 : Math.max(1.5, 2.8 - stage * 0.12), fired: false });
          }
        }
        for (i = foes.length - 1; i >= 0; i--) {
          var e = foes[i]; e.t += dt;
          if (e.state === 'rise') { e.p = Math.min(1, e.p + dt / 0.35); if (e.p >= 1) e.state = 'stay'; }
          else if (e.state === 'stay') {
            e.life -= dt;
            if (e.life <= 0) { if (e.kind === 'bot') { hurt(); snd(90, 0.2, 'sawtooth', 0.4); } e.state = 'leave'; }
          } else { e.p -= dt / 0.3; if (e.p <= 0) { e.slot.busy = false; foes.splice(i, 1); } }
        }
        if (boss) {
          boss.t += dt;
          if (boss.p < 1) boss.p = Math.min(1, boss.p + dt / 1.2);
          else {
            boss.fire -= dt;
            if (boss.fire < 1 && boss.fire > 0) boss.warn = 1;
            if (boss.fire <= 0) { boss.warn = 0; boss.fire = R(2.4, 3.4); hurt(); }
          }
        }
        bonusT -= dt;
        if (bonusT <= 0) { bonusT = R(4, 8); var dirx = Math.random() < 0.5 ? 1 : -1; bonus.push({ x: dirx > 0 ? -40 : W + 40, y: R(110, 230), vx: dirx * R(260, 380), r: 28 }); }
        for (i = bonus.length - 1; i >= 0; i--) { var b = bonus[i]; b.x += b.vx * dt; if (b.x < -80 || b.x > W + 80) bonus.splice(i, 1); }
        if (!boss && toSpawn <= 0 && foes.length === 0) endStage();
      }
      var pc = shots ? Math.round(hits / shots * 100) : 0;
      api.hud('Pontos: ' + score + '   Combo x' + Math.min(4, 1 + Math.floor(combo / 5) * 0.5) + '   Parada ' + stage, 'Precisão ' + pc + '%   Recorde: ' + api.best());
    }

    // ---------- desenho ----------
    function drawBot(ctx, e) {
      var g = geom(e), k = e.slot.s, warn = e.state === 'stay' && e.life < 0.9 && e.kind === 'bot', civ = e.kind === 'civ';
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, g.cut); ctx.clip();
      var by = g.y0 + 82 * k;
      ctx.fillStyle = civ ? '#f97316' : (warn ? '#7f1d1d' : '#64748b'); ctx.fillRect(g.x0, g.y0, 52 * k, 82 * k + 30);
      ctx.fillStyle = civ ? '#fcd9b0' : '#94a3b8'; ctx.beginPath(); ctx.arc(g.hx, g.hy, g.hr, 0, 6.3); ctx.fill();
      if (civ) { ctx.fillStyle = '#7c2d12'; ctx.fillRect(g.hx - g.hr, g.hy - g.hr - 3 * k, g.hr * 2, 8 * k); ctx.fillStyle = '#fcd9b0'; ctx.fillRect(g.x0 - 8 * k, g.y0 - 30 * k, 8 * k, 40 * k); ctx.fillRect(g.x1, g.y0 - 30 * k, 8 * k, 40 * k); }
      else {
        ctx.fillStyle = warn ? '#ef4444' : '#22d3ee'; ctx.fillRect(g.hx - g.hr * 0.7, g.hy - 4 * k, g.hr * 1.4, 7 * k);
        ctx.fillStyle = '#334155'; ctx.fillRect(g.hx - 2 * k, g.hy - g.hr - 12 * k, 4 * k, 12 * k); ctx.fillRect(g.x0 + 8 * k, g.y0 + 14 * k, 36 * k, 6 * k);
        ctx.fillStyle = warn ? '#fca5a5' : '#fbbf24'; ctx.beginPath(); ctx.arc(g.hx, g.hy - g.hr - 13 * k, 4 * k, 0, 6.3); ctx.fill();
      }
      ctx.restore();
      if (warn && e.p >= 1) { var on = Math.floor(tt * 10) % 2 === 0; ctx.fillStyle = on ? '#ef4444' : '#fecaca'; ctx.beginPath(); ctx.arc(g.hx, g.hy - 52 * k, 20 * k + 2, 0, 6.3); ctx.fill(); D.text(ctx, '!', g.hx, g.hy - 51 * k, 30 * k + 4, '#fff'); }
    }
    function drawCover(ctx, z) {
      if (z.kind === 'win') {
        ctx.fillStyle = '#020617'; ctx.fillRect(z.x - 44, z.y - 90, 88, 90 - z.ch + 14);
        ctx.fillStyle = '#334155'; ctx.fillRect(z.x - 52, z.y - z.ch, 104, 16); ctx.fillRect(z.x - 52, z.y - 100, 8, 100); ctx.fillRect(z.x + 44, z.y - 100, 8, 100);
      } else {
        var w = 150 * z.s, h = z.ch, x = z.x - w / 2, y = z.y - h;
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#5b3a17'; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y + h, w, 8);
      }
    }
    function drawBoss(ctx) {
      var b = boss, bx = W / 2, by = 600 + (1 - b.p) * 420, i, warn = b.warn > 0;
      ctx.fillStyle = '#1e293b'; ctx.fillRect(bx - 170, by - 340, 340, 300); ctx.fillStyle = '#334155'; ctx.fillRect(bx - 130, by - 40, 90, 90); ctx.fillRect(bx + 40, by - 40, 90, 90);
      ctx.fillStyle = '#475569'; ctx.fillRect(bx - 110, by - 400, 220, 80);
      ctx.fillStyle = warn && Math.floor(tt * 12) % 2 ? '#ff2a2a' : (warn ? '#7f1d1d' : '#22d3ee'); ctx.fillRect(bx - 80, by - 380, 160, 22);
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 4; ctx.strokeRect(bx - 150, by - 320, 300, 260);
      if (warn) D.text(ctx, '!', bx, by - 450, 80, '#ef4444');
      for (i = 0; i < 3; i++) {
        var p = b.parts[i], x = bx + p.dx, y = by + p.dy;
        if (p.hp > 0) { D.glow(ctx, '#f97316', 22); ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(x, y, 22 + p.hp * 2.5, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.3); ctx.fill(); }
        else { ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(x, y, 24, 0, 6.3); ctx.fill(); }
      }
    }
    function draw(ctx) {
      var i;
      ctx.save();
      if (shake > 0) ctx.translate(R(-10, 10) * shake * 2, R(-10, 10) * shake * 2);
      if (bg) ctx.drawImage(bg, 0, 0); else D.clear(ctx);
      for (i = 0; i < bonus.length; i++) { var bn = bonus[i]; D.glow(ctx, '#67e8f9', 16); ctx.fillStyle = '#67e8f9'; ctx.beginPath(); ctx.ellipse(bn.x, bn.y, bn.r, bn.r * 0.45, 0, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#0e7490'; ctx.beginPath(); ctx.arc(bn.x, bn.y - 6, 12, 0, 6.3); ctx.fill(); }
      for (i = 0; i < holes.length; i++) { ctx.globalAlpha = Math.min(1, holes[i].l); ctx.fillStyle = '#0b0b10'; ctx.beginPath(); ctx.arc(holes[i].x, holes[i].y, 6, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.globalAlpha = 1;
      for (i = 0; i < slots.length; i++) {
        var z = slots[i];
        for (var j = 0; j < foes.length; j++) if (foes[j].slot === z) drawBot(ctx, foes[j]);
        drawCover(ctx, z);
      }
      if (boss) drawBoss(ctx);
      for (i = 0; i < sparks.length; i++) { var s = sparks[i]; ctx.fillStyle = s.c; ctx.globalAlpha = Math.min(1, s.l * 2.5); ctx.fillRect(s.x - 2, s.y - 2, 5, 5); }
      ctx.globalAlpha = 1;
      if (flash > 0) { ctx.fillStyle = 'rgba(255,240,180,.25)'; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
      if (redFlash > 0) { ctx.fillStyle = 'rgba(220,0,0,' + (redFlash * 1.2) + ')'; ctx.fillRect(0, 0, W, H); }
      // rodapé: munição e vidas
      ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(0, 650, W, 70);
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 650); ctx.lineTo(W, 650); ctx.stroke();
      for (i = 0; i < MAXAMMO; i++) { ctx.fillStyle = i < ammo ? '#fbbf24' : '#3f3f46'; ctx.fillRect(40 + i * 34, 668, 18, 36); ctx.fillStyle = i < ammo ? '#b45309' : '#27272a'; ctx.fillRect(40 + i * 34, 662, 18, 8); }
      D.text(ctx, reload > 0 ? 'RECARREGANDO...' : (ammo < 3 ? '▼ RECARREGAR (ou atire aqui embaixo)' : 'Recarregar: ▼'), 640, 668, 26, ammo < 3 ? '#fca5a5' : '#e5e7eb');
      D.text(ctx, '❤'.repeat(Math.max(0, lives)), 1140, 686, 36, '#ef4444', 'center');
      if (msgT > 0) D.text(ctx, msg, W / 2, 120, 46, '#fde047');
      if (phase === 'banner') { D.text(ctx, boss ? 'PARADA ' + stage + ' · CHEFÃO' : 'PARADA ' + stage, W / 2, 330, 84, '#fff'); D.text(ctx, 'Não atire nos civis!', W / 2, 410, 34, '#fde68a'); }
      if (phase === 'clear') D.text(ctx, 'PARADA CONCLUÍDA', W / 2, 330, 70, '#86efac');
      if (api.touch === false || true) {
        var x = aimP.x, y = aimP.y;
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; D.glow(ctx, '#ef4444', 10);
        ctx.beginPath(); ctx.arc(x, y, 26, 0, 6.3); ctx.moveTo(x - 40, y); ctx.lineTo(x - 10, y); ctx.moveTo(x + 10, y); ctx.lineTo(x + 40, y); ctx.moveTo(x, y - 40); ctx.lineTo(x, y - 10); ctx.moveTo(x, y + 10); ctx.lineTo(x, y + 40); ctx.stroke();
        ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    }

    nextStage();
    return {
      update: update, draw: draw,
      action: function (a) {
        if (a === 'ok') shoot(aimP.x, aimP.y);
        else if (a === 'down' && (ammo <= 2 || aimP.y > 600)) doReload();
      },
      tap: function (x, y) { aimP.x = x; aimP.y = y; shoot(x, y); },
      aim: function (x, y) { aimP.x = x; aimP.y = y; }
    };
  }
});

/* Comando Retrô — corre-e-atira com rolagem lateral: 3 fases, chefões, power-ups e checkpoints. */
GameHub.register({
  id: 'comando', name: 'Comando Retrô', emoji: '🪖', color: '#4d7c0f', premium: true, trending: true, shooter: true,
  fireLabel: '🔫',
  desc: 'Corra, pule e atire! Atravesse selva, cidade e deserto e derrube o chefão de cada fase.',
  help: '◀ ▶ anda · ▲ pula (2x = pulo duplo) · ▼ agacha · OK atira (segure) · ▲ + OK atira pra cima',
  create: function (api) {
    var W = api.W, H = api.H, GY = 600;
    var LV = [
      { name: 'Selva', len: 5400, sky: ['#0c2a1a', '#1f6b3a', '#a7d98a'], far: '#14532d', mid: '#166534', gnd: '#3f2d14', top: '#4d7c0f', kind: 'tri', boss: 0 },
      { name: 'Cidade à noite', len: 5800, sky: ['#050816', '#1e1b4b', '#6d28d9'], far: '#1e1b4b', mid: '#312e81', gnd: '#1f2937', top: '#475569', kind: 'rect', boss: 1 },
      { name: 'Base no deserto', len: 6200, sky: ['#7c2d12', '#ea580c', '#fde68a'], far: '#b45309', mid: '#9a3412', gnd: '#92400e', top: '#d97706', kind: 'dune', boss: 2 }
    ];
    var WEAP = { normal: 0.26, mg: 0.085, spread: 0.3, laser: 0.4, gren: 0.55 };
    var WNAME = { normal: 'Pistola', mg: 'Metralhadora', spread: 'Espalhado', laser: 'Laser', gren: 'Granada' };
    var ETYPE = {
      bot: { w: 40, h: 70, hp: 2, pts: 100 }, drone: { w: 56, h: 30, hp: 1, pts: 150 },
      turret: { w: 52, h: 52, hp: 3, pts: 200 }, tank: { w: 130, h: 62, hp: 6, pts: 400 }
    };
    var lvl = 0, L, plats, spawns, crates, cps, cpIdx, cpX;
    var hero, cam = 0, shake = 0, score = 0, kills = 0, t = 0, over = false, flash = 0;
    var en = [], pb = [], eb = [], parts = [], items = [], boss = null, bossOn = false, clearT = 0, banner = 0;
    hero = { x: 150, y: GY, vx: 0, vy: 0, face: 1, hp: 100, lives: 3, inv: 0, cd: 0, jumps: 0, ground: true, crouch: false, up: false, w: 'normal', ammo: 0, run: 0, shoot: 0 };

    function ov(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
    function box(e) { return { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h }; }
    function hbox() { var h = hero.crouch ? 40 : 76; return { x: hero.x - 17, y: hero.y - h, w: 34, h: h }; }
    function snd(f, d, ty, v) { api.sound(f, d, ty || 'square', v); }

    function spark(x, y, n, col, sp) {
      for (var i = 0; i < n && parts.length < 220; i++) {
        var a = Math.random() * 6.28, s = (sp || 300) * (0.3 + Math.random());
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, t: 0.4 + Math.random() * 0.5, c: col || (Math.random() < 0.5 ? '#fde047' : '#fb923c'), s: 3 + Math.random() * 5 });
      }
    }
    function boom(x, y, big) { spark(x, y, big ? 40 : 14, null, big ? 520 : 300); spark(x, y, big ? 12 : 4, '#fff', 200); shake = Math.max(shake, big ? 16 : 5); snd(big ? 70 : 140, big ? 0.6 : 0.22, 'sawtooth', 0.08); }

    function loadLevel(n) {
      lvl = n; var c = LV[n]; L = c.len; plats = []; spawns = []; crates = []; cps = [Math.floor(L * 0.35), Math.floor(L * 0.66)]; cpIdx = -1; cpX = 150;
      var x, k, r, ty;
      for (x = 500; x < L - 1000; x += api.rand(420, 700)) plats.push({ x: x, y: GY - api.rand(110, 190), w: api.rand(160, 280) });
      for (x = 800; x < L - 900; x += api.rand(250, 400)) {
        r = Math.random(); k = n + 1;
        ty = r < 0.35 ? 'bot' : r < 0.6 ? 'drone' : r < 0.8 ? 'turret' : (k > 1 || x > 2500 ? 'tank' : 'bot');
        spawns.push({ x: x + 700, type: ty, dead: false, live: false });
      }
      for (x = 1100; x < L - 1000; x += api.rand(850, 1150)) {
        var ws = ['mg', 'spread', 'laser', 'gren', 'life'];
        crates.push({ x: x, y: GY, w: 42, h: 42, item: ws[api.randInt(0, 4)], hp: 1 });
      }
      en = []; pb = []; eb = []; items = []; boss = null; bossOn = false; clearT = 0; cam = 0; banner = 2.5;
      hero.x = 150; hero.y = GY; hero.vx = hero.vy = 0; hero.hp = 100; hero.inv = 1.5;
    }

    function addEn(s) {
      var d = ETYPE[s.type], e = { s: s, type: s.type, x: s.x, y: s.type === 'drone' ? GY - api.rand(190, 330) : GY, w: d.w, h: d.h, hp: d.hp, t: Math.random() * 3, cd: api.rand(0.8, 2), fl: 0, y0: 0 };
      e.y0 = e.y; s.live = true; en.push(e);
    }
    function eshot(x, y, tx, ty, sp, g, big) {
      if (eb.length > 90) return;
      var dx = tx - x, dy = ty - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      eb.push({ x: x, y: y, vx: dx / d * sp, vy: dy / d * sp, g: g || 0, r: big ? 11 : 7 });
      snd(220, 0.06, 'square', 0.03);
    }

    function fire() {
      if (over || hero.cd > 0 || clearT > 0) return;
      var w = hero.w, up = hero.up && hero.ground, f = hero.face, x = hero.x + (up ? 8 * f : 36 * f), y = hero.y - (up ? 96 : hero.crouch ? 26 : 50);
      var vx = up ? 0 : 900 * f, vy = up ? -900 : 0;
      hero.cd = WEAP[w]; hero.shoot = 0.12;
      if (w === 'spread') { for (var i = -1; i <= 1; i++) pb.push({ x: x, y: y, vx: up ? i * 260 : vx, vy: up ? vy : i * 260, t: 0.8, dmg: 1, r: 6, c: '#fb923c' }); snd(300, 0.08, 'square', 0.05); }
      else if (w === 'laser') { pb.push({ x: x, y: y, vx: vx * 1.5, vy: vy * 1.5, t: 0.7, dmg: 1, r: 6, c: '#67e8f9', laser: true, hit: [] }); snd(900, 0.1, 'sawtooth', 0.04); }
      else if (w === 'gren') { pb.push({ x: x, y: y, vx: up ? 0 : 480 * f, vy: up ? -700 : -420, g: 1300, t: 3, dmg: 0, r: 9, c: '#a3e635', gren: true }); snd(180, 0.1, 'triangle', 0.06); }
      else { pb.push({ x: x, y: y, vx: vx, vy: vy, t: 0.8, dmg: 1, r: w === 'mg' ? 5 : 7, c: '#fef08a' }); snd(w === 'mg' ? 420 : 340, 0.05, 'square', 0.04); }
      if (w !== 'normal') { hero.ammo--; if (hero.ammo <= 0) hero.w = 'normal'; }
      if (pb.length > 80) pb.shift();
    }
    function explodeG(g) {
      boom(g.x, g.y, false); g.t = 0;
      var b = { x: g.x - 110, y: g.y - 110, w: 220, h: 220 };
      en.forEach(function (e) { if (ov(b, box(e))) dmgEn(e, 4); });
      if (boss && ov(b, box(boss))) dmgBoss(5);
    }
    function dmgEn(e, n) {
      e.hp -= n; e.fl = 0.1;
      if (e.hp <= 0 && !e.dead) { e.dead = true; e.s.dead = true; kills++; score += ETYPE[e.type].pts; boom(e.x, e.y - e.h / 2, e.type === 'tank'); }
      else snd(600, 0.04, 'square', 0.03);
    }
    function dmgBoss(n) {
      if (!boss || boss.hp <= 0) return;
      boss.hp -= n; boss.fl = 0.08; score += 5; snd(500, 0.03, 'square', 0.03); spark(boss.x, boss.y - boss.h / 2, 2, '#fff', 200);
      if (boss.hp <= 0) {
        boss.hp = 0; score += 3000; clearT = 3.2; hero.inv = 99; eb = [];
        for (var i = 0; i < 6; i++) boom(boss.x + api.rand(-boss.w / 2, boss.w / 2), boss.y - api.rand(0, boss.h), true);
      }
    }
    function hurt(n) {
      if (hero.inv > 0 || over) return;
      hero.hp -= n; hero.inv = 1.3; shake = 10; flash = 0.15; snd(120, 0.25, 'sawtooth', 0.07); spark(hero.x, hero.y - 40, 10, '#fff', 250);
      if (hero.hp <= 0) {
        hero.lives--; boom(hero.x, hero.y - 40, true);
        if (hero.lives <= 0) { over = true; return api.gameOver(score, 'Fim de missão!'); }
        hero.hp = 100; hero.x = Math.max(150, cpX); hero.y = GY; hero.vx = hero.vy = 0; hero.inv = 2.5; hero.w = 'normal';
        cam = Math.max(0, hero.x - 300); eb = []; en = [];
        spawns.forEach(function (s) { s.live = false; });
        if (bossOn && boss) { boss.x = cam + W - 220; }
      }
    }

    function spawnBoss() {
      var k = LV[lvl].boss, hp = [60, 75, 95][k], dm = [[150, 230], [210, 90], [270, 120]][k];
      boss = { k: k, x: cam + W + 200, y: k === 1 ? GY - 320 : GY, w: dm[0], h: dm[1], hp: hp, max: hp, t: 0, cd: 2, n: 0, fl: 0, tx: cam + W - 260 };
      bossOn = true; banner = 2; snd(90, 0.8, 'sawtooth', 0.08);
    }
    function bossAI(dt) {
      var b = boss, rage = b.hp < b.max / 2 ? 0.7 : 1, hx = hero.x, hy = hero.y - 40;
      b.t += dt; b.cd -= dt * (1 / rage); if (b.fl > 0) b.fl -= dt;
      var tgt = b.k === 1 ? Math.min(cam + W - 150, Math.max(cam + 450, hx + 80)) : cam + W - 260 - (Math.sin(b.t * 0.7) + 1) * 180;
      b.x += (tgt - b.x) * Math.min(1, dt * (b.k === 1 ? 1.2 : 1.5));
      if (b.k === 1) b.y = GY - 320 + Math.sin(b.t * 1.5) * 40;
      if (b.cd > 0) return;
      b.n++; var sx = b.x - b.w / 2, sy = b.y - b.h * 0.7, i;
      if (b.k === 0) {
        b.cd = 1.5;
        if (b.n % 4 === 0) { eshot(sx, GY - 14, 0, GY - 14, 320, 0, true); eshot(sx, GY - 14, 0, GY - 14, 220, 0, true); }
        else for (i = -1; i <= 1; i++) eshot(sx, sy, hx, hy + i * 70, 400);
      } else if (b.k === 1) {
        b.cd = 1.3;
        if (b.n % 3 === 0) { for (i = 0; i < 4; i++) eb.push({ x: b.x - 120 + i * 80, y: b.y + 40, vx: -60, vy: 0, g: 650, r: 11 }); snd(150, 0.3, 'triangle', 0.05); }
        else for (i = -1; i <= 1; i++) eshot(b.x, b.y + 20, hx + i * 90, hy, 380);
      } else {
        b.cd = 1.4;
        if (b.n % 2 === 0) { eshot(sx, GY - 62, 0, GY - 62, 480, 0, true); }
        else { eb.push({ x: sx, y: GY - 120, vx: -(b.x - hx) * 0.55, vy: -650, g: 1000, r: 13 }); snd(120, 0.3, 'sawtooth', 0.05); }
        if (rage < 1 && b.n % 3 === 0) eshot(sx, GY - 90, hx, hy, 420);
      }
    }

    function enAI(e, dt) {
      var d = e.x - hero.x; e.t += dt; e.cd -= dt; if (e.fl > 0) e.fl -= dt;
      if (e.type === 'bot') {
        if (Math.abs(d) > 260) e.x -= Math.sign(d) * 75 * dt;
        if (e.cd <= 0 && Math.abs(d) < 750) { e.cd = api.rand(1.6, 2.6); var hi = Math.random() < 0.6; eshot(e.x - Math.sign(d) * 26, GY - (hi ? 52 : 22), e.x - Math.sign(d) * 500, GY - (hi ? 52 : 22), 380); }
      } else if (e.type === 'drone') {
        e.x -= 110 * dt; e.y = e.y0 + Math.sin(e.t * 2.4) * 45;
        if (e.cd <= 0 && Math.abs(d) < 600) { e.cd = api.rand(1.4, 2.2); eshot(e.x, e.y, hero.x, hero.y - 40, 300); }
      } else if (e.type === 'turret') {
        if (e.cd <= 0 && Math.abs(d) < 700) { e.cd = 1.8; eshot(e.x, e.y - 34, hero.x, hero.y - 40, 360); }
      } else {
        e.x -= 40 * dt;
        if (e.cd <= 0 && d < 800) { e.cd = 2.4; eshot(e.x - 66, GY - 58, e.x - 500, GY - 58, 340, 0, true); }
      }
    }

    function drop(c) {
      items.push({ x: c.x, y: c.y - 60, k: c.item, t: 0 });
      boom(c.x, c.y - 20, false);
    }
    function grab(it) {
      if (it.k === 'life') { hero.lives = Math.min(5, hero.lives + 1); hero.hp = 100; snd(880, 0.3, 'triangle', 0.06); }
      else { hero.w = it.k; hero.ammo = it.k === 'mg' ? 90 : it.k === 'gren' ? 14 : 40; hero.hp = Math.min(100, hero.hp + 20); snd(700, 0.15, 'triangle', 0.06); }
      score += 50; spark(it.x, it.y, 10, '#fde047', 250);
    }

    function update(dt) {
      if (over) return;
      t += dt; var d = api.dir(0, true), i;
      if (hero.inv > 0 && hero.inv < 90) hero.inv -= dt; if (hero.cd > 0) hero.cd -= dt; if (hero.shoot > 0) hero.shoot -= dt;
      if (flash > 0) flash -= dt; if (banner > 0) banner -= dt; if (shake > 0) shake = Math.max(0, shake - dt * 30);
      // herói
      hero.crouch = d.y > 0.4 && hero.ground; hero.up = d.y < -0.4;
      var mv = clearT > 0 ? 0 : hero.crouch ? 0 : d.x;
      if (d.x > 0.3 && !hero.crouch) hero.face = 1; if (d.x < -0.3 && !hero.crouch) hero.face = -1;
      hero.vx = mv * 300; hero.x += hero.vx * dt; hero.run += Math.abs(hero.vx) * dt / 40;
      var py = hero.y; hero.vy += 2300 * dt; hero.y += hero.vy * dt; hero.ground = false;
      if (hero.y >= GY) { hero.y = GY; hero.vy = 0; hero.ground = true; }
      else if (hero.vy >= 0) for (i = 0; i < plats.length; i++) { var p = plats[i]; if (hero.x > p.x - 10 && hero.x < p.x + p.w + 10 && py <= p.y + 2 && hero.y >= p.y) { hero.y = p.y; hero.vy = 0; hero.ground = true; } }
      if (hero.ground) hero.jumps = 0;
      var maxX = bossOn ? cam + W - 30 : L - 40;
      hero.x = Math.max(cam + 30, Math.min(maxX, hero.x));
      if (api.firing()) fire();
      // câmera
      var camMax = L - W, want = Math.min(camMax, Math.max(cam, hero.x - 480));
      cam += (want - cam) * Math.min(1, dt * 8); if (cam > camMax) cam = camMax;
      if (!boss && !bossOn && cam >= camMax - 2 && hero.x > camMax + 250) spawnBoss();
      // checkpoints
      for (i = cpIdx + 1; i < cps.length; i++) if (hero.x > cps[i]) { cpIdx = i; cpX = cps[i]; banner = 1.2; snd(1000, 0.2, 'triangle', 0.06); }
      // spawns
      if (!bossOn) spawns.forEach(function (s) { if (!s.dead && !s.live && s.x < cam + W + 120 && s.x > cam + W - 300 && s.x > hero.x + 300) addEn(s); });
      // inimigos
      for (i = 0; i < en.length; i++) {
        var e = en[i]; enAI(e, dt);
        if (!e.dead && ov(hbox(), box(e)) && (e.type === 'bot' || e.type === 'tank')) hurt(25);
        if (e.x < cam - 200) { e.dead = true; e.s.live = false; }
      }
      en = en.filter(function (e) { return !e.dead; });
      if (boss && boss.hp > 0) { bossAI(dt); var bb = { x: boss.x - boss.w / 2, y: boss.y - boss.h, w: boss.w, h: boss.h }; if (ov(hbox(), bb) && boss.k !== 1) hurt(30); }
      if (clearT > 0) { clearT -= dt; if (Math.random() < 0.3) boom(boss.x + api.rand(-90, 90), boss.y - api.rand(0, boss.h), false); if (clearT <= 0) { if (lvl >= 2) { over = true; return api.gameOver(score + hero.lives * 1000, 'Missão cumprida!'); } loadLevel(lvl + 1); score += 1000; } }
      // tiros do jogador
      pb.forEach(function (b) {
        b.t -= dt; if (b.g) b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        var bx = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2 + (b.laser ? 90 : 0), h: b.r * 2 };
        if (b.laser) bx.x -= 90;
        if (b.gren) { if (b.y >= GY - 8) explodeG(b); }
        var j, hitIt = false;
        for (j = 0; j < en.length && b.t > 0; j++) { var e2 = en[j]; if (!e2.dead && ov(bx, box(e2))) { if (b.gren) { explodeG(b); break; } if (b.laser) { if (b.hit.indexOf(e2) < 0) { b.hit.push(e2); dmgEn(e2, 2); } } else { dmgEn(e2, b.dmg); b.t = 0; spark(b.x, b.y, 4, '#fde047', 150); } } }
        if (b.t > 0 && boss && boss.hp > 0 && ov(bx, { x: boss.x - boss.w / 2, y: boss.y - boss.h, w: boss.w, h: boss.h })) { if (b.gren) explodeG(b); else if (b.laser) { if (b.hit.indexOf(boss) < 0) { b.hit.push(boss); dmgBoss(3); } } else { dmgBoss(b.dmg); b.t = 0; } }
        for (j = 0; j < crates.length && b.t > 0 && !hitIt; j++) { var c = crates[j]; if (c.hp > 0 && ov(bx, { x: c.x - 21, y: c.y - 42, w: 42, h: 42 })) { c.hp = 0; drop(c); if (!b.laser) b.t = 0; } }
        if (b.x < cam - 100 || b.x > cam + W + 100 || b.y < -80) b.t = 0;
      });
      pb = pb.filter(function (b) { return b.t > 0; });
      // tiros inimigos
      var hb = hbox();
      eb = eb.filter(function (b) {
        b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.y > GY - 4 && b.g) { spark(b.x, GY, 8, '#f87171', 200); if (b.r > 10 && Math.abs(b.x - hero.x) < 60) hurt(25); return false; }
        if (ov(hb, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) { hurt(b.r > 10 ? 25 : 18); return false; }
        return b.x > cam - 150 && b.x < cam + W + 150 && b.y > -100 && b.y < H;
      });
      // itens
      items = items.filter(function (it) { it.t += dt; if (ov(hb, { x: it.x - 22, y: it.y - 22 + Math.sin(it.t * 4) * 5, w: 44, h: 44 })) { grab(it); return false; } return true; });
      parts = parts.filter(function (p) { p.t -= dt; p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.t > 0; });
      api.hud('Pontos: ' + score + '   Inimigos: ' + kills, 'Fase ' + (lvl + 1) + ' · ❤ x' + hero.lives);
    }

    // ---------- desenho ----------
    function rc(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
    function layer(ctx, f, step, col, hmax, base) {
      var kind = LV[lvl].kind, i0 = Math.floor(cam * f / step), i, x, h, n;
      ctx.fillStyle = col;
      for (i = i0 - 1; i < i0 + W / step + 2; i++) {
        n = Math.abs(Math.sin(i * 91.7)); h = 40 + n * hmax; x = i * step - cam * f;
        if (kind === 'rect') { ctx.fillRect(x, base - h, step * 0.8, h); if (f > 0.3) { ctx.fillStyle = '#fde047'; for (var wy = base - h + 10; wy < base - 12; wy += 22) if (Math.sin(i * 7 + wy) > 0) ctx.fillRect(x + 8, wy, 8, 10); ctx.fillStyle = col; } }
        else if (kind === 'dune') { ctx.beginPath(); ctx.ellipse(x + step / 2, base, step * 0.7, h, 0, Math.PI, 0); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(x - step * 0.2, base); ctx.lineTo(x + step * 0.5, base - h * (f > 0.3 ? 1.1 : 1.6)); ctx.lineTo(x + step * 1.2, base); ctx.fill(); if (f > 0.3) ctx.fillRect(x + step * 0.45, base - 20, 10, 20); }
      }
    }
    function drawHero(ctx) {
      var x = hero.x - cam, y = hero.y, f = hero.face, run = hero.ground && Math.abs(hero.vx) > 10, lg = run ? Math.sin(hero.run) * 9 : 0;
      if (hero.inv > 0 && hero.inv < 90 && Math.floor(t * 20) % 2) return;
      ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
      var cr = hero.crouch, o = cr ? 34 : 0;
      rc(ctx, '#1e293b', -12 + lg, -26 + o * 0.4, 11, 26 - o * 0.4); rc(ctx, '#1e293b', 2 - lg, -26 + o * 0.4, 11, 26 - o * 0.4);
      rc(ctx, '#365314', -15, -58 + o, 30, 34); rc(ctx, '#a3a3a3', -15, -38 + o, 30, 5);
      rc(ctx, '#fcd9b0', -9, -74 + o, 20, 17); rc(ctx, '#3f6212', -12, -80 + o, 26, 10); rc(ctx, '#dc2626', -14, -66 + o, 8, 5);
      rc(ctx, '#111', 5, -68 + o, 4, 4);
      if (hero.up && hero.ground) { rc(ctx, '#27272a', 4, -102, 8, 46); rc(ctx, '#fcd9b0', 4, -58, 9, 9); }
      else { rc(ctx, '#27272a', 6, -52 + o, 34, 9); rc(ctx, '#fcd9b0', 4, -52 + o, 9, 9); if (hero.shoot > 0) { ctx.fillStyle = '#fde047'; ctx.fillRect(40, -56 + o, 12, 17); } }
      ctx.restore();
    }
    function drawEn(ctx, e) {
      var x = e.x - cam, y = e.y, wh = e.fl > 0, d = Math.sign(hero.x - e.x) || 1;
      ctx.save(); ctx.translate(x, y);
      if (e.type === 'bot') { ctx.scale(-d, 1); var l = Math.sin(e.t * 8) * 6; rc(ctx, wh ? '#fff' : '#64748b', -14, -50, 28, 34); rc(ctx, wh ? '#fff' : '#475569', -12 + l, -18, 10, 18); rc(ctx, wh ? '#fff' : '#475569', 3 - l, -18, 10, 18); rc(ctx, wh ? '#fff' : '#94a3b8', -12, -70, 24, 20); rc(ctx, '#ef4444', 2, -64, 12, 6); rc(ctx, '#27272a', 12, -42, 26, 7); }
      else if (e.type === 'drone') { rc(ctx, wh ? '#fff' : '#7c3aed', -26, -22, 52, 18); rc(ctx, '#ef4444', -6, -16, 12, 8); rc(ctx, '#e5e7eb', -34 + Math.sin(e.t * 50) * 6, -30, 68 - Math.abs(Math.sin(e.t * 50)) * 12, 4); rc(ctx, '#27272a', -3, -30, 6, 8); }
      else if (e.type === 'turret') { rc(ctx, wh ? '#fff' : '#57534e', -26, -22, 52, 22); rc(ctx, wh ? '#fff' : '#78716c', -18, -42, 36, 22); ctx.save(); ctx.translate(0, -32); ctx.rotate(Math.atan2(hero.y - 40 - (y - 32), hero.x - e.x)); rc(ctx, '#27272a', 0, -4, 36, 8); ctx.restore(); }
      else { rc(ctx, '#1c1917', -64, -16, 128, 16); rc(ctx, wh ? '#fff' : '#65a30d', -56, -42, 112, 28); rc(ctx, wh ? '#fff' : '#4d7c0f', -30, -62, 60, 22); rc(ctx, '#27272a', -96, -50, 56, 9); ctx.fillStyle = '#44403c'; for (var k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(-46 + k * 31, -8, 9, 0, 6.3); ctx.fill(); } }
      ctx.restore();
    }
    function drawBoss(ctx) {
      var b = boss, x = b.x - cam, y = b.y, c = b.fl > 0 ? '#fff' : null;
      if (b.hp <= 0 && Math.floor(t * 20) % 2) return;
      ctx.save(); ctx.translate(x, y);
      if (b.k === 0) { var s = Math.sin(b.t * 6) * 8; rc(ctx, c || '#475569', -40, -80, 30, 80 + s * 0.3); rc(ctx, c || '#475569', 10, -80, 30, 80 - s * 0.3); rc(ctx, c || '#64748b', -70, -190, 140, 120); rc(ctx, c || '#334155', -90, -180, 24, 80); rc(ctx, c || '#334155', 66, -180, 24, 80); rc(ctx, '#27272a', -105, -120, 50, 16); rc(ctx, c || '#94a3b8', -35, -240, 70, 50); rc(ctx, '#ef4444', -30, -222, 60, 12); rc(ctx, '#fde047', -30, -170, 60, 10); }
      else if (b.k === 1) { rc(ctx, c || '#334155', -100, -70, 200, 50); rc(ctx, c || '#475569', -70, -90, 90, 30); rc(ctx, '#7dd3fc', -62, -84, 40, 20); rc(ctx, c || '#334155', 90, -60, 110, 12); rc(ctx, '#27272a', -120, -30, 40, 9); rc(ctx, '#e5e7eb', -150 + Math.sin(b.t * 40) * 40, -96, 300 - Math.abs(Math.sin(b.t * 40)) * 100, 6); rc(ctx, '#ef4444', -30, -30, 14, 10); }
      else { rc(ctx, '#1c1917', -130, -30, 260, 30); rc(ctx, c || '#78350f', -120, -80, 240, 50); rc(ctx, c || '#92400e', -80, -120, 150, 42); rc(ctx, '#27272a', -190, -100, 120, 16); rc(ctx, '#ef4444', 10, -108, 36, 14); ctx.fillStyle = '#44403c'; for (var k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(-100 + k * 40, -14, 14, 0, 6.3); ctx.fill(); } }
      ctx.restore();
    }
    function bar(ctx, x, y, w, h, v, col) { rc(ctx, '#000', x - 3, y - 3, w + 6, h + 6); rc(ctx, '#3f3f46', x, y, w, h); rc(ctx, col, x, y, w * Math.max(0, v), h); }

    function draw(ctx) {
      var c = LV[lvl], g = ctx.createLinearGradient(0, 0, 0, GY);
      g.addColorStop(0, c.sky[0]); g.addColorStop(0.6, c.sky[1]); g.addColorStop(1, c.sky[2]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (c.kind === 'rect') { ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(1000, 120, 40, 0, 6.3); ctx.fill(); }
      if (c.kind === 'dune') { ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(300, 170, 70, 0, 6.3); ctx.fill(); }
      ctx.save();
      layer(ctx, 0.15, 220, c.far, 230, GY - 20); layer(ctx, 0.4, 150, c.mid, 130, GY);
      if (shake > 0) ctx.translate(api.rand(-shake, shake), api.rand(-shake, shake));
      rc(ctx, c.gnd, 0, GY, W, H - GY); rc(ctx, c.top, 0, GY, W, 14);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (var q = 0; q < 24; q++) { var gx = ((q * 97 - cam) % W + W) % W; ctx.fillRect(gx, GY + 30 + (q % 4) * 22, 36, 6); }
      plats.forEach(function (p) { var px = p.x - cam; if (px > -400 && px < W) { rc(ctx, c.top, px, p.y, p.w, 12); rc(ctx, '#27272a', px, p.y + 12, p.w, 10); } });
      cps.forEach(function (cx, i) { var px = cx - cam; if (px > -50 && px < W + 50) { rc(ctx, '#d4d4d8', px, GY - 110, 6, 110); rc(ctx, i <= cpIdx ? '#22c55e' : '#ef4444', px + 6, GY - 110, 44, 26); } });
      crates.forEach(function (k) { if (k.hp > 0) { var px = k.x - 21 - cam; rc(ctx, '#a16207', px, GY - 42, 42, 42); rc(ctx, '#fde047', px + 4, GY - 38, 34, 4); rc(ctx, '#fde047', px + 4, GY - 8, 34, 4); ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', px + 21, GY - 14); } });
      items.forEach(function (it) {
        var px = it.x - cam, py = it.y + Math.sin(it.t * 4) * 5; ctx.fillStyle = it.k === 'life' ? '#ec4899' : '#2563eb'; ctx.beginPath(); ctx.arc(px, py, 22, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText({ mg: 'M', spread: 'S', laser: 'L', gren: 'G', life: '+1' }[it.k], px, py + 7);
      });
      en.forEach(function (e) { drawEn(ctx, e); });
      if (boss) drawBoss(ctx);
      drawHero(ctx);
      pb.forEach(function (b) { ctx.fillStyle = b.c; if (b.laser) { ctx.shadowBlur = 12; ctx.shadowColor = b.c; ctx.fillRect(b.x - cam - 45, b.y - 3, 90, 6); ctx.shadowBlur = 0; } else { ctx.beginPath(); ctx.arc(b.x - cam, b.y, b.r, 0, 6.3); ctx.fill(); } });
      ctx.fillStyle = '#f87171'; eb.forEach(function (b) { ctx.beginPath(); ctx.arc(b.x - cam, b.y, b.r, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fecaca'; ctx.beginPath(); ctx.arc(b.x - cam, b.y, b.r * 0.45, 0, 6.3); ctx.fill(); ctx.fillStyle = '#f87171'; });
      parts.forEach(function (p) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x - cam, p.y, p.s, p.s); });
      ctx.globalAlpha = 1; ctx.restore();
      // interface
      bar(ctx, 30, 62, 220, 16, hero.hp / 100, hero.hp > 35 ? '#22c55e' : '#ef4444');
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
      ctx.fillText('ENERGIA   ' + WNAME[hero.w] + (hero.w === 'normal' ? '' : ' x' + hero.ammo), 30, 104);
      if (boss && boss.hp > 0) { bar(ctx, 340, 650, 600, 20, boss.hp / boss.max, '#f97316'); ctx.textAlign = 'center'; ctx.fillText('CHEFÃO', W / 2, 640); }
      if (banner > 0) { ctx.textAlign = 'center'; ctx.font = 'bold 54px sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.fillText(boss && bossOn && clearT <= 0 && banner < 2 ? 'CUIDADO: CHEFÃO!' : clearT > 0 ? '' : cpIdx >= 0 && banner < 1.3 ? 'CHECKPOINT!' : 'FASE ' + (lvl + 1) + ': ' + c.name.toUpperCase(), W / 2, 220); ctx.shadowBlur = 0; }
      if (clearT > 0) { ctx.textAlign = 'center'; ctx.font = 'bold 60px sans-serif'; ctx.fillStyle = '#fde047'; ctx.fillText('FASE CONCLUÍDA!', W / 2, 260); }
      if (flash > 0) { ctx.fillStyle = 'rgba(255,0,0,' + flash * 2 + ')'; ctx.fillRect(0, 0, W, H); }
    }

    loadLevel(0);
    return {
      update: update, draw: draw,
      action: function (a) {
        if (over) return;
        if (a === 'ok') fire();
        else if (a === 'up' && !api.firing() && hero.jumps < 2 && clearT <= 0) { hero.vy = hero.jumps ? -780 : -900; hero.jumps++; hero.ground = false; snd(hero.jumps === 1 ? 520 : 700, 0.06, 'triangle', 0.05); }
      }
    };
  }
});

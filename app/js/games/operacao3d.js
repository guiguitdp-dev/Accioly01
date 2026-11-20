/* Operação 3D — tiro em primeira pessoa com 3D retrô (raycasting), visual pixelado de época.
 * Ache a saída de cada base, derrube os robôs e junte munição e kits médicos.
 * Controle remoto: ▲▼ andam, ◀▶ viram, OK atira (segure para rajada). */
GameHub.register({
  id: 'operacao3d', name: 'Operação 3D', emoji: '🕹️', color: '#7f1d1d', premium: true, trending: true, shooter: true,
  fireLabel: '🔫',
  desc: 'Tiro em primeira pessoa com 3D retrô: invada as bases, derrube os robôs e ache a saída.',
  help: '▲▼ andam · ◀▶ viram · OK atira (segure) · ache a porta amarela',
  create: function (api) {
    var W = api.W, H = api.H, RW = 320, RH = 180, TEX = 32;
    var off = document.createElement('canvas'); off.width = RW; off.height = RH;
    var octx = off.getContext('2d');
    var img = octx.createImageData(RW, RH);
    var buf = new Uint32Array(img.data.buffer);
    var zbuf = new Float32Array(RW);

    // ---------- texturas feitas por código ----------
    function rgb(r, g, b) { return (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255); }
    function noise(x, y, s) { var n = Math.sin(x * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453; return n - Math.floor(n); }
    function makeTex(fn) { var t = new Uint32Array(TEX * TEX); for (var y = 0; y < TEX; y++) for (var x = 0; x < TEX; x++) t[y * TEX + x] = fn(x, y); return t; }
    var TX = {
      1: makeTex(function (x, y) { // tijolo
        var row = Math.floor(y / 8), ox = (row % 2) * 8, mortar = y % 8 === 0 || (x + ox) % 16 === 0, n = noise(x, y, 1) * 30;
        return mortar ? rgb(70, 60, 55) : rgb(150 + n, 62 + n * .5, 42);
      }),
      2: makeTex(function (x, y) { // painel metálico com rebites
        var edge = x === 0 || y === 0 || x === 31 || y === 31 || x === 16, rivet = (x % 16 === 3 || x % 16 === 12) && (y === 3 || y === 28), n = noise(x, y, 2) * 18;
        return rivet ? rgb(210, 215, 225) : edge ? rgb(55, 62, 78) : rgb(92 + n, 102 + n, 122 + n);
      }),
      3: makeTex(function (x, y) { // parede tecnológica
        var line = y % 10 === 5 || x === 8 || x === 24, led = (y === 15 || y === 16) && x > 10 && x < 22, n = noise(x, y, 3) * 15;
        return led ? rgb(80, 255, 170) : line ? rgb(30, 140, 90) : rgb(18 + n, 48 + n, 40 + n);
      }),
      9: makeTex(function (x, y) { // porta de saída (amarela listrada)
        var stripe = Math.floor((x + y) / 6) % 2 === 0, light = y > 4 && y < 9 && x > 11 && x < 21;
        return light ? rgb(60, 255, 90) : stripe ? rgb(245, 200, 20) : rgb(30, 30, 30);
      })
    };
    function makeSprite(fn) { var t = new Uint32Array(TEX * TEX); for (var y = 0; y < TEX; y++) for (var x = 0; x < TEX; x++) t[y * TEX + x] = fn(x, y) || 0; return t; }
    function robot(flash, hurt) {
      return makeSprite(function (x, y) {
        var cx = x - 15.5;
        if (y >= 3 && y <= 11 && Math.abs(cx) <= 6) { // cabeça
          if (y >= 6 && y <= 8 && Math.abs(cx) <= 4) return hurt ? rgb(255, 255, 255) : rgb(255, 40, 40); // visor
          return hurt ? rgb(255, 255, 255) : rgb(120, 130, 150);
        }
        if (y >= 12 && y <= 22 && Math.abs(cx) <= 8) return hurt ? rgb(255, 255, 255) : (Math.abs(cx) <= 2 && y > 14 && y < 19 ? rgb(255, 170, 0) : rgb(70, 82, 105));
        if (y >= 13 && y <= 19 && (Math.abs(cx) >= 9 && Math.abs(cx) <= 11)) return rgb(60, 70, 90); // braços
        if (flash && y >= 14 && y <= 18 && cx >= 11 && cx <= 15) return rgb(255, 240, 120); // clarão do tiro
        if (y >= 23 && y <= 30 && (Math.abs(cx + 4) <= 2 || Math.abs(cx - 4) <= 2)) return rgb(50, 58, 75); // pernas
        return 0;
      });
    }
    var SPR = {
      robot: robot(false, false), robotShoot: robot(true, false), robotHurt: robot(false, true),
      med: makeSprite(function (x, y) {
        if (x < 8 || x > 23 || y < 16 || y > 29) return 0;
        var cross = (x >= 14 && x <= 17 && y >= 18 && y <= 27) || (y >= 21 && y <= 24 && x >= 11 && x <= 20);
        return cross ? rgb(220, 30, 40) : rgb(240, 240, 240);
      }),
      ammo: makeSprite(function (x, y) {
        if (x < 7 || x > 24 || y < 18 || y > 29) return 0;
        if (y < 22 && x % 4 !== 0) return rgb(230, 190, 40);
        return rgb(85, 100, 45);
      })
    };

    // ---------- mapas ('#' tijolo, 'M' metal, 'T' tecno, 'D' saída, 'S' início) ----------
    var MAPS = [
      ['################',
       '#S....#........#',
       '#.###.#.######.#',
       '#.#.........#..#',
       '#.#.#####.#.#.##',
       '#...#...#.#....#',
       '###.#.#.#.####.#',
       '#...#.#...#....#',
       '#.###.#####.####',
       '#.....#........#',
       '#.#####.######.#',
       '#.......#......#',
       '######.##.######',
       '#........#.....D',
       '#.######...###.#',
       '################'],
      ['MMMMMMMMMMMMMMMM',
       'M......M.......M',
       'M.MMMM.M.MMMMM.M',
       'M.M..........M.M',
       'M.M.MMMMMMMM.M.M',
       'MSM.M......M...M',
       'M.M.M.MMMM.MMM.M',
       'M...M.M..M.....M',
       'MMM.M.M..MMMMM.M',
       'M...M.M........M',
       'M.MMM.MMMMMM.MMM',
       'M.....M......M.M',
       'M.MMMMM.MMMMMM.M',
       'M.......M......M',
       'MMMMMMM...MMMM.M',
       'MMMMMMMMMMMMMMDM'],
      ['TTTTTTTTTTTTTTTT',
       'T.......T......T',
       'T.TTTTT.T.TTTT.T',
       'T.T...T...T..T.T',
       'T.T.T.TTTTT.TT.T',
       'T...T.......T..T',
       'TTTTT.TTTTT.T.TT',
       'T.....T...T.T..T',
       'T.TTTTT.T.T.TT.T',
       'T.T.....T.T....T',
       'T.T.TTTTT.TTTT.T',
       'T...T.........ST',
       'T.TTT.TTTTTTT.TT',
       'T.....T.....T..T',
       'T.TTT.T.TTT.TT.T',
       'TDTTTTTTTTTTTTTT']
    ];
    var CODE = { '#': 1, 'M': 2, 'T': 3, 'D': 9 };

    var map, MW, MH, px, py, dirX, dirY, planeX, planeY;
    var level = 1, score = 0, hp = 100, ammo = 60, kills = 0, sprites = [], flash = 0, recoil = 0, hurt = 0, shake = 0, bob = 0, fireCd = 0, msg = '', msgT = 0, won = 0, dead = false;

    function cell(x, y) { if (x < 0 || y < 0 || x >= MW || y >= MH) return 1; return map[y][x]; }
    function load(n) {
      var src = MAPS[(n - 1) % MAPS.length];
      MH = src.length; MW = src[0].length; map = [];
      var empty = [];
      for (var y = 0; y < MH; y++) {
        map.push([]);
        for (var x = 0; x < MW; x++) {
          var ch = src[y][x];
          map[y].push(CODE[ch] || 0);
          if (ch === 'S') { px = x + 0.5; py = y + 0.5; }
          else if (ch === '.') empty.push({ x: x, y: y });
        }
      }
      // olhando para a direção mais livre
      var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      for (var d = 0; d < 4; d++) if (!cell(Math.floor(px + dirs[d][0]), Math.floor(py + dirs[d][1]))) { dirX = dirs[d][0]; dirY = dirs[d][1]; break; }
      planeX = -dirY * 0.66; planeY = dirX * 0.66;
      // inimigos e itens em lugares longe do início
      empty = empty.filter(function (c) { return Math.abs(c.x + 0.5 - px) + Math.abs(c.y + 0.5 - py) > 4; }).sort(function () { return Math.random() - 0.5; });
      sprites = [];
      var nEnemy = Math.min(empty.length - 6, 4 + n * 2);
      for (var i = 0; i < nEnemy; i++) sprites.push({ kind: 'robot', x: empty[i].x + 0.5, y: empty[i].y + 0.5, hp: 2 + Math.floor(n / 2), cd: 1 + Math.random() * 2, hit: 0, shoot: 0 });
      for (var j = 0; j < 3; j++) { var c = empty[nEnemy + j]; if (c) sprites.push({ kind: 'med', x: c.x + 0.5, y: c.y + 0.5 }); }
      for (var k = 0; k < 3; k++) { var c2 = empty[nEnemy + 3 + k]; if (c2) sprites.push({ kind: 'ammo', x: c2.x + 0.5, y: c2.y + 0.5 }); }
      msg = 'FASE ' + n + ' — ache a porta amarela'; msgT = 2.5; won = 0;
    }
    load(1);

    function enemiesLeft() { var c = 0; sprites.forEach(function (s) { if (s.kind === 'robot') c++; }); return c; }
    function lineOfSight(ax, ay, bx, by) {
      var dx = bx - ax, dy = by - ay, d = Math.sqrt(dx * dx + dy * dy), steps = Math.ceil(d / 0.1);
      for (var i = 1; i < steps; i++) { var t = i / steps; if (cell(Math.floor(ax + dx * t), Math.floor(ay + dy * t))) return false; }
      return true;
    }
    function tryMove(nx, ny) {
      var r = 0.22;
      var hit = function (x, y) { var c = cell(Math.floor(x), Math.floor(y)); if (c === 9) won = won || 0.01; return c; };
      if (!hit(nx + (nx > px ? r : -r), py)) px = nx;
      if (!hit(px, ny + (ny > py ? r : -r))) py = ny;
    }
    function fire() {
      if (fireCd > 0 || dead || won) return;
      if (ammo <= 0) { api.sound(120, 0.05, 'square', 0.04); fireCd = 0.25; msg = 'SEM MUNIÇÃO'; msgT = 0.8; return; }
      ammo--; fireCd = 0.16; flash = 0.07; recoil = 1;
      api.sound(160, 0.07, 'sawtooth', 0.07);
      // tiro instantâneo no centro da tela: robô mais próximo na mira e na frente da parede
      var best = null, bestD = zbuf[RW >> 1];
      sprites.forEach(function (s) {
        if (s.kind !== 'robot') return;
        var p = project(s);
        if (!p || p.depth >= bestD) return;
        if (Math.abs(p.sx - RW / 2) < p.size * 0.28) { best = s; bestD = p.depth; }
      });
      if (best) {
        best.hp--; best.hit = 0.15; api.sound(900, 0.04, 'square', 0.05);
        if (best.hp <= 0) { sprites.splice(sprites.indexOf(best), 1); kills++; score += 100 + level * 20; shake = 0.25; api.sound(90, 0.25, 'sawtooth', 0.08); if (Math.random() < 0.35) sprites.push({ kind: 'ammo', x: best.x, y: best.y }); }
      }
    }
    function project(s) {
      var sx = s.x - px, sy = s.y - py, inv = 1 / (planeX * dirY - dirX * planeY);
      var tx = inv * (dirY * sx - dirX * sy), ty = inv * (-planeY * sx + planeX * sy);
      if (ty <= 0.1) return null;
      return { sx: (RW / 2) * (1 + tx / ty), depth: ty, size: Math.abs(RH / ty) };
    }

    // ---------- render ----------
    var rowColors = new Uint32Array(RH);
    function skyFloor() {
      var theme = [[24, 22, 34, 58, 44, 38], [14, 22, 40, 38, 44, 58], [8, 26, 24, 26, 48, 38]][(level - 1) % 3];
      for (var y = 0; y < RH; y++) {
        var t;
        if (y < RH / 2) { t = y / (RH / 2); rowColors[y] = rgb(theme[0] + t * 20, theme[1] + t * 18, theme[2] + t * 22); }
        else { t = (y - RH / 2) / (RH / 2); rowColors[y] = rgb(theme[3] * (0.4 + t), theme[4] * (0.4 + t), theme[5] * (0.4 + t)); }
      }
    }
    skyFloor();
    function shadeColor(c, f) {
      var r = (c & 255) * f, g = ((c >> 8) & 255) * f, b = ((c >> 16) & 255) * f;
      return (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
    }
    function render() {
      for (var y = 0; y < RH; y++) { var rc = rowColors[y], o = y * RW; for (var x0 = 0; x0 < RW; x0++) buf[o + x0] = rc; }
      var bobY = Math.sin(bob) * 2;
      for (var x = 0; x < RW; x++) {
        var camX = 2 * x / RW - 1, rdx = dirX + planeX * camX, rdy = dirY + planeY * camX;
        var mx = Math.floor(px), my = Math.floor(py);
        var ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy), stepX, stepY, sdx, sdy, side = 0, c = 0, guard = 0;
        if (rdx < 0) { stepX = -1; sdx = (px - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - px) * ddx; }
        if (rdy < 0) { stepY = -1; sdy = (py - my) * ddy; } else { stepY = 1; sdy = (my + 1 - py) * ddy; }
        while (!c && guard++ < 64) {
          if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
          c = cell(mx, my);
        }
        var dist = side === 0 ? sdx - ddx : sdy - ddy;
        if (dist < 0.05) dist = 0.05;
        zbuf[x] = dist;
        var lh = Math.floor(RH / dist), top = Math.floor(RH / 2 - lh / 2 + bobY), bot = top + lh;
        var wallX = side === 0 ? py + dist * rdy : px + dist * rdx; wallX -= Math.floor(wallX);
        var tx = Math.floor(wallX * TEX); if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = TEX - tx - 1;
        var tex = TX[c] || TX[1], f = Math.max(0.18, 1 - dist / 14) * (side ? 0.78 : 1);
        var y0 = Math.max(0, top), y1 = Math.min(RH - 1, bot);
        for (var yy = y0; yy <= y1; yy++) {
          var ty = Math.floor((yy - top) / lh * TEX) & 31;
          buf[yy * RW + x] = shadeColor(tex[ty * TEX + tx], f);
        }
      }
      // sprites do mais longe ao mais perto
      var list = sprites.map(function (s) { return { s: s, p: project(s) }; }).filter(function (o) { return o.p; })
        .sort(function (a, b) { return b.p.depth - a.p.depth; });
      list.forEach(function (o) {
        var s = o.s, p = o.p, size = p.size, half = size / 2;
        var t = s.kind === 'robot' ? (s.hit > 0 ? SPR.robotHurt : s.shoot > 0 ? SPR.robotShoot : SPR.robot) : SPR[s.kind];
        var top = RH / 2 - half + bobY, left = p.sx - half, f = Math.max(0.25, 1 - p.depth / 14);
        var x0 = Math.max(0, Math.floor(left)), x1 = Math.min(RW - 1, Math.floor(left + size));
        for (var x = x0; x <= x1; x++) {
          if (p.depth >= zbuf[x]) continue;
          var tx = Math.floor((x - left) / size * TEX); if (tx < 0 || tx > 31) continue;
          var y0 = Math.max(0, Math.floor(top)), y1 = Math.min(RH - 1, Math.floor(top + size));
          for (var y = y0; y <= y1; y++) {
            var ty = Math.floor((y - top) / size * TEX); if (ty < 0 || ty > 31) continue;
            var col = t[ty * TEX + tx];
            if (col) buf[y * RW + x] = shadeColor(col, f);
          }
        }
      });
      octx.putImageData(img, 0, 0);
    }

    return {
      action: function (a) { if (a === 'ok') fire(); },
      update: function (dt) {
        if (dead) return;
        fireCd = Math.max(0, fireCd - dt); flash = Math.max(0, flash - dt); recoil = Math.max(0, recoil - dt * 6);
        hurt = Math.max(0, hurt - dt); shake = Math.max(0, shake - dt); if (msgT > 0) msgT -= dt;
        if (won) {
          won += dt;
          if (won > 1.6) { score += 500 + hp * 2; level++; skyFloor(); load(level); ammo += 15; }
          api.hud('Fase ' + level + '   Pontos: ' + score, '❤ ' + hp + '   🔫 ' + ammo);
          return;
        }
        var d = api.dir(0, true), mv = -d.y * 3.0 * dt, rot = d.x * 2.4 * dt;
        if (rot) {
          var odx = dirX; dirX = dirX * Math.cos(rot) - dirY * Math.sin(rot); dirY = odx * Math.sin(rot) + dirY * Math.cos(rot);
          var opx = planeX; planeX = planeX * Math.cos(rot) - planeY * Math.sin(rot); planeY = opx * Math.sin(rot) + planeY * Math.cos(rot);
        }
        if (mv) { tryMove(px + dirX * mv, py + dirY * mv); bob += dt * 10; }
        if (api.firing()) fire();
        // inimigos
        for (var i = 0; i < sprites.length; i++) {
          var s = sprites[i];
          var dx = px - s.x, dy = py - s.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (s.kind !== 'robot') {
            if (dist < 0.6) {
              if (s.kind === 'med' && hp < 100) { hp = Math.min(100, hp + 30); sprites.splice(i--, 1); api.sound(660, 0.12, 'triangle'); msg = '+30 vida'; msgT = 1; }
              else if (s.kind === 'ammo') { ammo += 20; sprites.splice(i--, 1); api.sound(520, 0.1, 'triangle'); msg = '+20 balas'; msgT = 1; }
            }
            continue;
          }
          s.hit = Math.max(0, s.hit - dt); s.shoot = Math.max(0, s.shoot - dt);
          if (dist < 11 && lineOfSight(s.x, s.y, px, py)) {
            if (dist > 1.4) { var sp = (0.9 + level * 0.08) * dt; var nx = s.x + dx / dist * sp, ny = s.y + dy / dist * sp; if (!cell(Math.floor(nx), Math.floor(s.y))) s.x = nx; if (!cell(Math.floor(s.x), Math.floor(ny))) s.y = ny; }
            s.cd -= dt;
            if (s.cd <= 0) {
              s.cd = Math.max(0.8, 2.2 - level * 0.12) + Math.random(); s.shoot = 0.15;
              api.sound(260, 0.06, 'square', 0.04);
              if (Math.random() < Math.max(0.25, 0.85 - dist * 0.07)) { var dmg = 6 + Math.floor(Math.random() * 6) + level; hp -= dmg; hurt = 0.3; shake = 0.2; api.sound(110, 0.15, 'sawtooth', 0.06); }
            }
          }
        }
        if (hp <= 0) { hp = 0; dead = true; api.gameOver(score, 'Você caiu na fase ' + level); }
        if (won) { msg = 'SAÍDA ENCONTRADA!'; msgT = 2; api.sound(880, 0.3, 'triangle'); }
        api.hud('Fase ' + level + '   Pontos: ' + score + '   Robôs: ' + enemiesLeft(), '❤ ' + hp + '   🔫 ' + ammo + '   Recorde: ' + api.best());
      },
      draw: function (ctx) {
        render();
        var sx = shake > 0 ? (Math.random() - 0.5) * 16 : 0, sy = shake > 0 ? (Math.random() - 0.5) * 16 : 0;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, sx, sy, W, H);
        // arma
        var gx = W / 2 + Math.cos(bob * 0.5) * 14, gy = H - 40 + Math.abs(Math.sin(bob)) * 10 + recoil * 26;
        if (flash > 0) { ctx.fillStyle = 'rgba(255,220,120,.9)'; ctx.beginPath(); ctx.arc(gx, gy - 190, 46 + Math.random() * 14, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,240,180,.15)'; ctx.fillRect(0, 0, W, H); }
        ctx.fillStyle = '#1f2937'; ctx.fillRect(gx - 34, gy - 180, 68, 150);
        ctx.fillStyle = '#374151'; ctx.fillRect(gx - 22, gy - 200, 44, 40);
        ctx.fillStyle = '#4b5563'; ctx.fillRect(gx - 50, gy - 60, 100, 70);
        ctx.fillStyle = '#9ca3af'; ctx.fillRect(gx - 6, gy - 196, 12, 120);
        // mira
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(W / 2 - 18, H / 2); ctx.lineTo(W / 2 - 6, H / 2); ctx.moveTo(W / 2 + 6, H / 2); ctx.lineTo(W / 2 + 18, H / 2);
        ctx.moveTo(W / 2, H / 2 - 18); ctx.lineTo(W / 2, H / 2 - 6); ctx.moveTo(W / 2, H / 2 + 6); ctx.lineTo(W / 2, H / 2 + 18); ctx.stroke();
        // dano
        if (hurt > 0) { ctx.fillStyle = 'rgba(220,20,20,' + (hurt * 1.2) + ')'; ctx.fillRect(0, 0, W, H); }
        // minimapa
        var cs = 9, mx0 = W - MW * cs - 24, my0 = 56;
        ctx.globalAlpha = 0.8;
        for (var y = 0; y < MH; y++) for (var x = 0; x < MW; x++) {
          var c = map[y][x]; if (!c) continue;
          ctx.fillStyle = c === 9 ? '#facc15' : '#64748b'; ctx.fillRect(mx0 + x * cs, my0 + y * cs, cs - 1, cs - 1);
        }
        sprites.forEach(function (s) { if (s.kind === 'robot') { ctx.fillStyle = '#ef4444'; ctx.fillRect(mx0 + s.x * cs - 2, my0 + s.y * cs - 2, 4, 4); } });
        ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(mx0 + px * cs, my0 + py * cs, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx0 + px * cs, my0 + py * cs); ctx.lineTo(mx0 + (px + dirX) * cs, my0 + (py + dirY) * cs); ctx.stroke();
        ctx.globalAlpha = 1;
        if (msgT > 0) GameHub.draw.text(ctx, msg, W / 2, 150, 40, '#fde68a');
        if (ammo === 0) GameHub.draw.text(ctx, 'SEM MUNIÇÃO — procure caixas verdes', W / 2, H / 2 + 70, 28, '#fca5a5');
      }
    };
  }
});

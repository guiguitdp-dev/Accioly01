/* Pênaltis — disputa de pênaltis contra a TV: você bate e você defende. */
GameHub.register({
  id: 'penaltis', name: 'Disputa de Pênaltis', emoji: '⚽', color: '#16a34a', premium: true, trending: true,
  desc: 'Bata e defenda pênaltis contra a TV. 5 cobranças para cada lado e morte súbita!',
  help: 'Batendo: OK trava a mira (lado e altura) · Defendendo: ◀ ▲ ▶ na hora do chute',
  create: function (api) {
    var D = GameHub.draw, W = api.W, H = api.H;
    var GL = 340, GR = 940, GT = 170, GB = 470, SPOT = { x: 640, y: 640 };
    var phase, t, aim, ball, keeper, round = 0, me = 0, cpu = 0, myShots = 0, cpuShots = 0, saves = 0, msg = '', msgColor = '#fff', dive = null, cpuTarget = null;
    var history = [];

    function speed() { return 1 + Math.min(1.5, round * 0.12); }
    function startShoot() { phase = 'aimX'; t = 0; aim = { x: 640, y: 320 }; ball = { x: SPOT.x, y: SPOT.y, r: 18 }; keeper = { x: 640, y: 380, tx: 640, ty: 380 }; msg = 'Sua vez de bater! OK trava o lado'; msgColor = '#fff'; }
    function startDefend() { phase = 'cpuRun'; t = 0; ball = { x: SPOT.x, y: SPOT.y, r: 18 }; keeper = { x: 640, y: 380, tx: 640, ty: 380 }; dive = null; msg = 'Defenda! ◀ ▲ ▶ quando ele chutar'; msgColor = '#fff';
      var zones = [430, 640, 850]; var z = api.randInt(0, 2);
      cpuTarget = { x: zones[z] + api.rand(-60, 60), y: api.rand(GT + 30, GB - 30), zone: z };
      if (Math.random() < 0.08) cpuTarget.x = Math.random() < 0.5 ? GL - 30 : GR + 30; // às vezes a TV erra
    }
    function next() {
      if (phase === 'result') { myShots++; startDefend(); return; }
      cpuShots++; round++;
      var left = Math.max(0, 5 - myShots);
      // decidido antes das 5, diferença no fim das 5, morte súbita, ou limite de 10
      var done = (me > cpu + left || cpu > me + left) || (myShots >= 5 && me !== cpu) || myShots >= 10;
      if (done) return finish();
      startShoot();
    }
    function finish() {
      phase = 'end';
      var win = me > cpu;
      api.gameOver(me * 100 + saves * 80 + (win ? 300 : 0), win ? 'Você venceu! 🏆 ' + me + ' x ' + cpu : (me === cpu ? 'Empate ' : 'A TV venceu ') + me + ' x ' + cpu);
    }
    startShoot();
    return {
      action: function (a) {
        if (phase === 'aimX' && a === 'ok') { phase = 'aimY'; t = 0; msg = 'Agora a altura! OK trava'; api.sound(520, 0.05); }
        else if (phase === 'aimY' && a === 'ok') {
          phase = 'shot'; t = 0; api.sound(300, 0.1, 'triangle');
          // goleiro escolhe um canto (mais esperto a cada rodada)
          var guessRight = Math.random() < 0.25 + Math.min(0.25, round * 0.04);
          keeper.tx = guessRight ? aim.x + api.rand(-40, 40) : [440, 640, 840][api.randInt(0, 2)];
          keeper.ty = Math.max(GT + 60, Math.min(GB - 60, aim.y + api.rand(-40, 40)));
        } else if (phase === 'cpuShot' && !dive) {
          if (a === 'left') dive = 0; else if (a === 'up' || a === 'ok') dive = 1; else if (a === 'right') dive = 2;
          if (dive !== null) { keeper.tx = [430, 640, 850][dive]; keeper.ty = 330; }
        } else if (phase === 'cpuRun' && (a === 'left' || a === 'right' || a === 'up')) {
          msg = 'Calma! Espere o chute 😅'; msgColor = '#fca5a5';
        }
      },
      update: function (dt) {
        t += dt;
        var sp = speed();
        if (phase === 'aimX') aim.x = 640 + Math.sin(t * 2.6 * sp) * 320;
        else if (phase === 'aimY') aim.y = 310 + Math.sin(t * 2.4 * sp) * 165;
        else if (phase === 'shot' || phase === 'cpuShot') {
          var target = phase === 'shot' ? aim : cpuTarget, dur = phase === 'shot' ? 0.55 : 0.75;
          var k = Math.min(1, t / dur);
          ball.x = SPOT.x + (target.x - SPOT.x) * k;
          ball.y = SPOT.y + (target.y - SPOT.y) * k - Math.sin(k * Math.PI) * 60;
          ball.r = 18 - k * 6;
          var kd = phase === 'shot' ? Math.min(1, t / 0.4) : (dive !== null ? Math.min(1, (t - (dur * 0.2)) / 0.3) : 0);
          keeper.x += (keeper.tx - keeper.x) * Math.min(1, dt * 9 * Math.max(0.3, kd));
          keeper.y += (keeper.ty - keeper.y) * Math.min(1, dt * 9 * Math.max(0.3, kd));
          if (k >= 1) {
            var inGoal = target.x > GL + 12 && target.x < GR - 12 && target.y > GT + 12 && target.y < GB;
            var saved;
            if (phase === 'shot') {
              saved = inGoal && Math.abs(target.x - keeper.x) < 95 && Math.abs(target.y - keeper.y) < 120;
              if (!inGoal) { msg = target.y <= GT + 12 ? 'Por cima! 😩' : 'Pra fora! 😩'; msgColor = '#fca5a5'; api.sound(160, 0.3, 'sawtooth'); }
              else if (saved) { msg = 'O goleiro pegou! 🧤'; msgColor = '#fca5a5'; api.sound(160, 0.3, 'sawtooth'); }
              else { me++; msg = 'GOOOL! ⚽'; msgColor = '#86efac'; api.sound(880, 0.4, 'triangle'); }
              history.push(inGoal && !saved ? 'g' : 'x');
              phase = 'result';
            } else {
              saved = inGoal && dive === cpuTarget.zone;
              if (!inGoal) { msg = 'A TV chutou pra fora! 😅'; msgColor = '#86efac'; api.sound(660, 0.2); }
              else if (saved) { saves++; msg = 'QUE DEFESA! 🧤'; msgColor = '#86efac'; api.sound(880, 0.4, 'triangle'); }
              else { cpu++; msg = 'Gol da TV…'; msgColor = '#fca5a5'; api.sound(160, 0.3, 'sawtooth'); }
              phase = 'cpuResult';
            }
            t = 0;
          }
        } else if (phase === 'cpuRun') {
          if (t > 1.1) { phase = 'cpuShot'; t = 0; api.sound(300, 0.1, 'triangle'); }
        } else if (phase === 'result' || phase === 'cpuResult') {
          if (t > 1.5) next();
        }
        api.hud('Você ' + me + ' x ' + cpu + ' TV', 'Cobrança ' + Math.min(round + 1, 10) + (round >= 5 ? ' (morte súbita)' : '/5'));
      },
      draw: function (ctx) {
        var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05210f'); g.addColorStop(1, '#0b3d1c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for (var i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.05)'; ctx.fillRect(0, GB + i * 32, W, 32); }
        // torcida
        for (var j = 0; j < 140; j++) { ctx.fillStyle = ['#facc15', '#22c55e', '#3b82f6', '#fff'][j % 4]; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc((j * 97) % W, 70 + ((j * 53) % 70), 5, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
        // rede
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
        for (var x = GL; x <= GR; x += 24) { ctx.beginPath(); ctx.moveTo(x, GT); ctx.lineTo(x, GB); ctx.stroke(); }
        for (var y = GT; y <= GB; y += 24) { ctx.beginPath(); ctx.moveTo(GL, y); ctx.lineTo(GR, y); ctx.stroke(); }
        // traves
        D.glow(ctx, '#fff', 16); ctx.strokeStyle = '#fff'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(GL, GB); ctx.lineTo(GL, GT); ctx.lineTo(GR, GT); ctx.lineTo(GR, GB); ctx.stroke();
        ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(SPOT.x - 4, SPOT.y + 16, 8, 4);
        // goleiro
        var kx = keeper.x, ky = keeper.y;
        D.glow(ctx, '#f97316', 18); ctx.fillStyle = '#f97316'; D.roundRect(ctx, kx - 34, ky - 50, 68, 100, 20); ctx.fill();
        ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(kx, ky - 72, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f97316'; ctx.fillRect(kx - 80, ky - 44, 46, 16); ctx.fillRect(kx + 34, ky - 44, 46, 16);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(kx - 84, ky - 36, 12, 0, Math.PI * 2); ctx.arc(kx + 84, ky - 36, 12, 0, Math.PI * 2); ctx.fill();
        // mira
        if (phase === 'aimX' || phase === 'aimY') {
          ctx.shadowBlur = 0; ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4;
          if (phase === 'aimX') { ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.moveTo(aim.x, GT - 30); ctx.lineTo(aim.x, GB); ctx.stroke(); ctx.setLineDash([]); }
          else { ctx.beginPath(); ctx.moveTo(aim.x - 40, aim.y); ctx.lineTo(aim.x + 40, aim.y); ctx.moveTo(aim.x, aim.y - 40); ctx.lineTo(aim.x, aim.y + 40); ctx.stroke(); ctx.beginPath(); ctx.arc(aim.x, aim.y, 26, 0, Math.PI * 2); ctx.stroke(); }
        }
        // bola
        D.glow(ctx, '#fff', 14); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r * 0.35, 0, Math.PI * 2); ctx.fill();
        // placar de cobranças
        history.forEach(function (h, i) { D.text(ctx, h === 'g' ? '●' : '○', 60 + i * 30, 690, 26, h === 'g' ? '#86efac' : '#fca5a5', 'left'); });
        if (phase === 'cpuRun') D.text(ctx, '…', SPOT.x, SPOT.y - 50, 40, '#fff');
        D.text(ctx, msg, W / 2, 530, 40, msgColor);
      }
    };
  }
});

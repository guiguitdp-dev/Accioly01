/* Cobrinha Neon — coma as frutas, cresça e não bata em você mesmo. */
GameHub.register({
  id: 'cobrinha', name: 'Cobrinha Neon', emoji: '🐍', color: '#16a34a', premium: false,
  desc: 'O clássico da cobrinha com visual neon. Fica mais rápido a cada fruta.',
  help: 'Setas / direcional movem',
  create: function (api) {
    var D = GameHub.draw, C = 40, COLS = 32, ROWS = 17, OY = 40;
    var snake, dirv, queue, food, timer, step, score, alive;
    function reset() {
      snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
      dirv = { x: 1, y: 0 }; queue = []; score = 0; step = 0.14; timer = 0; alive = true;
      place();
    }
    function place() {
      do { food = { x: api.randInt(0, COLS - 1), y: api.randInt(0, ROWS - 1) }; }
      while (snake.some(function (s) { return s.x === food.x && s.y === food.y; }));
    }
    reset();
    return {
      action: function (a) {
        var m = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[a];
        if (!m) return;
        var last = queue.length ? queue[queue.length - 1] : dirv;
        if (m.x === -last.x && m.y === -last.y) return;
        if (queue.length < 3) queue.push(m);
      },
      update: function (dt) {
        if (!alive) return;
        timer += dt;
        while (timer >= step) {
          timer -= step;
          if (queue.length) dirv = queue.shift();
          var h = { x: snake[0].x + dirv.x, y: snake[0].y + dirv.y };
          if (h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS || snake.some(function (s) { return s.x === h.x && s.y === h.y; })) {
            alive = false; api.sound(120, 0.3, 'sawtooth'); api.gameOver(score); return;
          }
          snake.unshift(h);
          if (h.x === food.x && h.y === food.y) { score += 10; step = Math.max(0.06, step - 0.004); api.sound(660, 0.06); place(); }
          else snake.pop();
        }
        api.hud('Pontos: ' + score, 'Recorde: ' + api.best());
      },
      draw: function (ctx) {
        D.clear(ctx, '#03140b', '#010604');
        ctx.strokeStyle = 'rgba(34,197,94,.08)';
        for (var x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * C, OY); ctx.lineTo(x * C, OY + ROWS * C); ctx.stroke(); }
        for (var y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, OY + y * C); ctx.lineTo(COLS * C, OY + y * C); ctx.stroke(); }
        D.glow(ctx, '#f43f5e', 25); ctx.fillStyle = '#f43f5e';
        ctx.beginPath(); ctx.arc(food.x * C + C / 2, OY + food.y * C + C / 2, C * 0.36, 0, Math.PI * 2); ctx.fill();
        D.glow(ctx, '#22c55e', 20);
        snake.forEach(function (s, i) {
          ctx.fillStyle = i === 0 ? '#bbf7d0' : 'hsl(' + (140 - i * 2) + ',80%,' + Math.max(35, 60 - i) + '%)';
          D.roundRect(ctx, s.x * C + 3, OY + s.y * C + 3, C - 6, C - 6, 9); ctx.fill();
        });
      }
    };
  }
});

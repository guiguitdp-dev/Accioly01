/* Palavra Secreta — descubra a palavra de 5 letras em 6 tentativas. Teclado na tela (controle remoto) ou teclado físico. */
GameHub.register({
  id: 'palavra', name: 'Palavra Secreta', emoji: '🔤', color: '#0f766e', premium: true, trending: true,
  desc: 'Descubra a palavra de 5 letras em até 6 tentativas. Verde-água = letra no lugar certo, laranja = letra existe em outro lugar.',
  help: 'Setas + OK no teclado da tela · VOLTAR apaga · ✓ confirma',
  create: function (api) {
    var D = GameHub.draw, W = api.W, H = api.H;
    var WORDS = ('AMIGO PRAIA FESTA NOITE LIVRO MUNDO PEDRA PORTA CARRO VERDE SONHO FORTE PLANO TEMPO CAMPO PRATO FRUTA MANGA LIMAO BANCO ' +
      'PAPEL NUVEM CHUVA CALOR FOLHA PEIXE PORCO TIGRE ZEBRA COBRA SAMBA FORRO VIOLA PIANO RADIO VIDEO FILME CANAL PLACA CORPO ' +
      'OLHAR FALAR ANDAR SORTE JOGAR TORTA DOCES COUVE ARROZ CARNE LEITE PIZZA SALSA MILHO MELAO CAQUI CRAVO PLUMA GRAMA FLORA ' +
      'FAUNA SELVA LAGOA PRACA AVIAO BARCO MOTOR PONTE TORRE FAROL AREIA ONDAS BRISA VENTO FOGAO GARFO TELHA CHAVE CINTO BLUSA ' +
      'CALCA TENIS PULSO DENTE BARBA NARIZ PERNA SAUDE NORTE LESTE OESTE TARDE MANHA VERAO NATAL JUNHO JULHO MARCO MAIOR MENOR ' +
      'VELHO JOVEM FELIZ CALMO LENTO CERTO FALSO CLARO LIMPO PRETO CINZA PRATA METAL VIDRO TINTA LAPIS PROVA NOTAS LETRA TEXTO ' +
      'POEMA DANCA CIRCO PALCO CHUTE PASSE CLUBE NADAR PULAR SALTO IDEIA FILHO PRIMO GENTE HUMOR PIADA CARTA CAIXA BOLSA CESTA ' +
      'FEIRA PRECO TROCO CONTA VALOR REAIS MOEDA SALDO FICHA GRUPO TURMA NAVIO MAGIA BRUXA HEROI LENDA ARARA POMBO GARCA PANDA ' +
      'CABRA POLVO OSTRA CORAL MORRO SERRA FONTE').split(' ');
    var KEYS = ['QWERTYUIOP'.split(''), 'ASDFGHJKL'.split(''), ['⌫'].concat('ZXCVBNM'.split('')).concat(['✓'])];
    var C_OK = '#14b8a6', C_IN = '#f97316', C_NO = '#334155';
    var secret = WORDS[api.randInt(0, WORDS.length - 1)], rows = [], cur = '', kr = 0, kc = 0, keyState = {}, msg = '', msgT = 0, done = false, typed = false, shake = 0, reveal = 0;

    function evaluate(g) {
      var res = ['no', 'no', 'no', 'no', 'no'], pool = {}, i;
      for (i = 0; i < 5; i++) { if (g[i] === secret[i]) res[i] = 'ok'; else pool[secret[i]] = (pool[secret[i]] || 0) + 1; }
      for (i = 0; i < 5; i++) if (res[i] !== 'ok' && pool[g[i]]) { res[i] = 'in'; pool[g[i]]--; }
      return res;
    }
    function rank(s) { return { ok: 3, in: 2, no: 1 }[s] || 0; }
    function press(k) {
      if (done) return;
      if (k === '⌫') { cur = cur.slice(0, -1); api.sound(300, 0.03); return; }
      if (k === '✓') return submit();
      if (cur.length < 5) { cur += k; api.sound(520, 0.03); }
    }
    function submit() {
      if (cur.length < 5) { msg = 'Faltam letras'; msgT = 1.2; shake = 0.4; api.sound(150, 0.1); return; }
      var res = evaluate(cur);
      rows.push({ w: cur, r: res });
      for (var i = 0; i < 5; i++) if (rank(res[i]) > rank(keyState[cur[i]])) keyState[cur[i]] = res[i];
      reveal = 0.6;
      var won = cur === secret;
      cur = '';
      if (won) { done = true; api.sound(880, 0.3, 'triangle'); var pts = (7 - rows.length) * 100; setTimeout(function () { api.gameOver(pts, 'Acertou: ' + secret + '! 🎉'); }, 1100); }
      else if (rows.length >= 6) { done = true; api.sound(160, 0.3, 'sawtooth'); setTimeout(function () { api.gameOver(0, 'A palavra era ' + secret); }, 1100); }
      else api.sound(440, 0.06);
    }
    function onKey(e) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      var k = (e.key || '').toUpperCase();
      if (/^[A-Z]$/.test(k)) { typed = true; press(k); e.preventDefault(); }
    }
    document.addEventListener('keydown', onKey);
    return {
      destroy: function () { document.removeEventListener('keydown', onKey); },
      back: function () { if (cur.length && !done) { press('⌫'); return true; } return false; },
      action: function (a) {
        if (a === 'w' || a === 'a' || a === 's' || a === 'd') return; // letras vêm do teclado físico
        if (a === 'ok') { if (typed) { typed = false; return submit(); } return press(KEYS[kr][kc]); }
        typed = false;
        if (a === 'left') kc = (kc + KEYS[kr].length - 1) % KEYS[kr].length;
        if (a === 'right') kc = (kc + 1) % KEYS[kr].length;
        if (a === 'up' || a === 'down') { kr = (kr + (a === 'up' ? 2 : 1)) % 3; kc = Math.min(kc, KEYS[kr].length - 1); }
      },
      update: function (dt) {
        if (msgT > 0) msgT -= dt; if (shake > 0) shake -= dt; if (reveal > 0) reveal -= dt;
        api.hud('Tentativa ' + Math.min(rows.length + 1, 6) + '/6', 'Recorde: ' + api.best());
      },
      draw: function (ctx) {
        D.clear(ctx, '#03211f', '#010908');
        var T = 76, G = 10, gx = 140, gy = 78;
        for (var r = 0; r < 6; r++) {
          var row = rows[r], word = row ? row.w : (r === rows.length ? cur : '');
          var sx = r === rows.length && shake > 0 ? Math.sin(shake * 60) * 10 : 0;
          for (var c = 0; c < 5; c++) {
            var x = gx + c * (T + G) + sx, y = gy + r * (T + G), st = row ? row.r[c] : null;
            var lastRow = r === rows.length - 1 && reveal > 0;
            var col = st ? (lastRow && reveal > 0.6 - c * 0.1 ? '#1e293b' : { ok: C_OK, in: C_IN, no: C_NO }[st]) : 'rgba(255,255,255,.06)';
            ctx.shadowBlur = st === 'ok' ? 18 : 0; ctx.shadowColor = C_OK;
            ctx.fillStyle = col; D.roundRect(ctx, x, y, T, T, 12); ctx.fill();
            if (!st) { ctx.lineWidth = 3; ctx.strokeStyle = word[c] ? '#94a3b8' : 'rgba(255,255,255,.15)'; ctx.stroke(); }
            if (word[c]) D.text(ctx, word[c], x + T / 2, y + T / 2 + 2, 44);
          }
        }
        var kx0 = 620, kw = 56, kg = 6;
        D.text(ctx, msgT > 0 ? msg : 'Digite com o teclado da tela', kx0 + 290, 190, 28, msgT > 0 ? '#fca5a5' : '#99f6e4');
        for (var i = 0; i < 3; i++) {
          var keys = KEYS[i], off = (10 - keys.length) * (kw + kg) / 2;
          for (var j = 0; j < keys.length; j++) {
            var k = keys[j], x2 = kx0 + off + j * (kw + kg), y2 = 250 + i * 86, sel = i === kr && j === kc;
            var ks = keyState[k];
            ctx.shadowBlur = sel ? 24 : 0; ctx.shadowColor = '#fff';
            ctx.fillStyle = ks ? { ok: C_OK, in: C_IN, no: '#1e293b' }[ks] : (k === '✓' ? '#0d9488' : k === '⌫' ? '#7f1d1d' : '#475569');
            D.roundRect(ctx, x2, y2, kw, 74, 10); ctx.fill();
            if (sel) { ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke(); }
            D.text(ctx, k, x2 + kw / 2, y2 + 38, 30, ks === 'no' ? '#64748b' : '#fff');
          }
        }
        D.text(ctx, '■ lugar certo', kx0 + 90, 545, 22, C_OK, 'left');
        D.text(ctx, '■ existe em outro lugar', kx0 + 270, 545, 22, C_IN, 'left');
      }
    };
  }
});

/* Quiz Brasil — perguntas sobre o Brasil. 10 perguntas por rodada. */
GameHub.register({
  id: 'quiz', name: 'Quiz Brasil', emoji: '🧠', color: '#0d9488', premium: true,
  desc: '10 perguntas sobre geografia, história, cultura e esporte do Brasil.',
  help: 'Setas escolhem · OK responde',
  create: function (api) {
    var D = GameHub.draw, W = api.W, H = api.H;
    // [pergunta, resposta certa, errada, errada, errada]
    var Q = [
      ['Qual é a capital do Brasil?', 'Brasília', 'Rio de Janeiro', 'Salvador', 'São Paulo'],
      ['Qual é o maior estado do Brasil em área?', 'Amazonas', 'Pará', 'Mato Grosso', 'Minas Gerais'],
      ['Quantos estados tem o Brasil (sem contar o DF)?', '26', '25', '27', '24'],
      ['Em que ano a frota de Cabral chegou ao Brasil?', '1500', '1492', '1530', '1822'],
      ['Em que ano foi a Independência do Brasil?', '1822', '1889', '1808', '1500'],
      ['Em que ano foi proclamada a República?', '1889', '1822', '1930', '1888'],
      ['Em que ano foi assinada a Lei Áurea?', '1888', '1889', '1850', '1871'],
      ['Em que ano o Brasil conquistou o "Penta" (5º título mundial)?', '2002', '1994', '1998', '2006'],
      ['Qual rio é conhecido como "Velho Chico"?', 'São Francisco', 'Amazonas', 'Paraná', 'Tocantins'],
      ['Qual é a maior floresta tropical do mundo?', 'Amazônia', 'Mata Atlântica', 'Taiga', 'Floresta do Congo'],
      ['Quem pintou o quadro "Abaporu"?', 'Tarsila do Amaral', 'Anita Malfatti', 'Candido Portinari', 'Di Cavalcanti'],
      ['Quem escreveu "Dom Casmurro"?', 'Machado de Assis', 'José de Alencar', 'Jorge Amado', 'Graciliano Ramos'],
      ['Quem escreveu "O Auto da Compadecida"?', 'Ariano Suassuna', 'Jorge Amado', 'Monteiro Lobato', 'Érico Veríssimo'],
      ['Qual brasileiro é chamado de "Pai da Aviação"?', 'Santos Dumont', 'Bartolomeu de Gusmão', 'Oscar Niemeyer', 'Rui Barbosa'],
      ['Em que ano foi lançado o Plano Real?', '1994', '1986', '2000', '1990'],
      ['As Cataratas do Iguaçu ficam em qual estado brasileiro?', 'Paraná', 'Santa Catarina', 'Mato Grosso do Sul', 'São Paulo'],
      ['O Festival do Boi-Bumbá de Parintins acontece em qual estado?', 'Amazonas', 'Pará', 'Maranhão', 'Bahia'],
      ['Qual prato baiano é feito de feijão-fradinho frito no dendê?', 'Acarajé', 'Vatapá', 'Moqueca', 'Tapioca'],
      ['Qual instrumento é o símbolo da capoeira?', 'Berimbau', 'Pandeiro', 'Cavaquinho', 'Zabumba'],
      ['Qual é o estado mais populoso do Brasil?', 'São Paulo', 'Minas Gerais', 'Rio de Janeiro', 'Bahia'],
      ['Qual é a capital de Minas Gerais?', 'Belo Horizonte', 'Uberlândia', 'Juiz de Fora', 'Ouro Preto'],
      ['Qual é a capital do Pará?', 'Belém', 'Santarém', 'Marabá', 'Macapá'],
      ['Qual é a capital do Rio Grande do Sul?', 'Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Florianópolis'],
      ['Qual é a capital da Bahia?', 'Salvador', 'Feira de Santana', 'Ilhéus', 'Aracaju'],
      ['Qual é a capital do Amazonas?', 'Manaus', 'Belém', 'Porto Velho', 'Boa Vista'],
      ['Qual é a capital de Pernambuco?', 'Recife', 'Olinda', 'Caruaru', 'João Pessoa'],
      ['Qual é a capital do Ceará?', 'Fortaleza', 'Natal', 'Teresina', 'Juazeiro do Norte'],
      ['Qual é a capital do Paraná?', 'Curitiba', 'Londrina', 'Maringá', 'Foz do Iguaçu'],
      ['Qual é a capital de Santa Catarina?', 'Florianópolis', 'Joinville', 'Blumenau', 'Chapecó'],
      ['Qual é a capital de Goiás?', 'Goiânia', 'Anápolis', 'Brasília', 'Palmas'],
      ['Qual jogador é chamado de "Rei do Futebol"?', 'Pelé', 'Garrincha', 'Zico', 'Romário'],
      ['Qual piloto brasileiro foi tricampeão da Fórmula 1?', 'Ayrton Senna', 'Rubens Barrichello', 'Felipe Massa', 'Emerson Fittipaldi'],
      ['Tom Jobim é um dos criadores de qual estilo musical?', 'Bossa Nova', 'Forró', 'Axé', 'Sertanejo'],
      ['Quem é conhecido como o "Rei do Baião"?', 'Luiz Gonzaga', 'Dominguinhos', 'Jackson do Pandeiro', 'Gilberto Gil'],
      ['Qual é o lema escrito na bandeira do Brasil?', 'Ordem e Progresso', 'Paz e Amor', 'Independência ou Morte', 'Brasil Acima de Tudo'],
      ['Quantas estrelas há na bandeira do Brasil?', '27', '26', '25', '22'],
      ['Qual é a maior planície alagável do mundo, no Centro-Oeste?', 'Pantanal', 'Cerrado', 'Caatinga', 'Pampa'],
      ['Qual é o maior felino das Américas?', 'Onça-pintada', 'Puma', 'Jaguatirica', 'Gato-do-mato'],
      ['Qual é o ponto mais alto do Brasil?', 'Pico da Neblina', 'Pico da Bandeira', 'Monte Roraima', 'Pico das Agulhas Negras'],
      ['Qual bioma é exclusivamente brasileiro?', 'Caatinga', 'Amazônia', 'Pantanal', 'Pampa'],
      ['Quem foi o primeiro presidente do Brasil?', 'Deodoro da Fonseca', 'Floriano Peixoto', 'Getúlio Vargas', 'Dom Pedro II'],
      ['Como começa o Hino Nacional Brasileiro?', 'Ouviram do Ipiranga...', 'Já podeis da Pátria filhos...', 'Salve, lindo pendão...', 'Liberdade! Liberdade!...'],
      ['Qual é o maior estado do Nordeste em área?', 'Bahia', 'Maranhão', 'Piauí', 'Ceará'],
      ['Qual região do Brasil tem mais estados?', 'Nordeste', 'Norte', 'Sudeste', 'Sul']
    ];
    var round, qi, sel, answered, feedback, score, timeLeft, correct;
    function shuffle(a) { return a.slice().sort(function () { return Math.random() - 0.5; }); }
    function init() {
      round = shuffle(Q).slice(0, 10).map(function (q) { var opts = shuffle(q.slice(1)); return { q: q[0], opts: opts, ans: opts.indexOf(q[1]) }; });
      qi = 0; score = 0; correct = 0; next(true);
    }
    function next(first) { if (!first) qi++; sel = 0; answered = false; feedback = 0; timeLeft = 20; if (qi >= round.length) api.gameOver(score, correct + ' de 10 certas!'); }
    function answer() {
      if (answered) return;
      answered = true;
      var ok = sel === round[qi].ans;
      if (ok) { correct++; score += 100 + Math.round(timeLeft * 5); api.sound(880, 0.15, 'triangle'); }
      else api.sound(160, 0.25, 'sawtooth');
      feedback = 1.6;
    }
    init();
    return {
      action: function (a) {
        if (answered || qi >= round.length) return;
        var c = sel % 2, r = Math.floor(sel / 2);
        if (a === 'left' || a === 'right') c = 1 - c;
        if (a === 'up' || a === 'down') r = 1 - r;
        sel = r * 2 + c;
        if (a === 'ok') answer();
      },
      update: function (dt) {
        if (qi >= round.length) return;
        if (!answered) { timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; sel = -1; answer(); } }
        else { feedback -= dt; if (feedback <= 0) next(); }
        api.hud('Pergunta ' + Math.min(qi + 1, 10) + '/10   Pontos: ' + score, 'Tempo: ' + Math.ceil(timeLeft) + 's');
      },
      draw: function (ctx) {
        D.clear(ctx, '#03201d', '#010807');
        if (qi >= round.length) return;
        var q = round[qi];
        ctx.fillStyle = 'rgba(255,255,255,.08)'; D.roundRect(ctx, 80, 70, W - 160, 150, 20); ctx.fill();
        wrap(ctx, q.q, W / 2, 145, W - 220, 40);
        ctx.fillStyle = '#134e4a'; ctx.fillRect(80, 235, (W - 160) * (timeLeft / 20), 8);
        for (var i = 0; i < 4; i++) {
          var c = i % 2, r = Math.floor(i / 2), x = 80 + c * ((W - 160) / 2 + 10), y = 280 + r * 190, w = (W - 160) / 2 - 10, h = 165;
          var color = '#0f3d39';
          if (answered) { if (i === q.ans) color = '#15803d'; else if (i === sel) color = '#b91c1c'; }
          else if (i === sel) color = '#0d9488';
          ctx.shadowBlur = i === sel ? 26 : 0; ctx.shadowColor = '#5eead4';
          ctx.fillStyle = color; D.roundRect(ctx, x, y, w, h, 18); ctx.fill();
          if (i === sel && !answered) { ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke(); }
          D.text(ctx, String.fromCharCode(65 + i) + ')  ' + q.opts[i], x + w / 2, y + h / 2, 34);
        }
      }
    };
    function wrap(ctx, text, x, y, maxW, size) {
      ctx.font = '800 ' + size + 'px "Segoe UI", Roboto, Arial, sans-serif';
      var words = text.split(' '), lines = [], line = '';
      words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t; });
      lines.push(line);
      lines.forEach(function (l, i) { D.text(ctx, l, x, y + (i - (lines.length - 1) / 2) * (size + 8), size); });
    }
  }
});

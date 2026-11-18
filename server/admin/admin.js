/* Painel do Dono — Accioly Play */
(function () {
  var app = document.getElementById('app');
  var T = { token: null, me: null, tab: 'painel', pending: 0 };
  try { T.token = localStorage.getItem('ap_admin_token'); T.me = JSON.parse(localStorage.getItem('ap_admin_me') || 'null'); } catch (e) {}

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); }
  function dt(ts) { if (!ts) return '—'; var d = new Date(ts); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function d(ts) { return ts ? new Date(ts).toLocaleDateString('pt-BR') : '—'; }
  var STATUS = { trial: 'Em teste', active: 'Assinante', expired: 'Expirado', blocked: 'Bloqueado', pendente: 'Pendente', aguardando_confirmacao: 'Aguardando confirmação', pago: 'Pago', recusado: 'Recusado' };
  function tag(s) { return '<span class="tag ' + esc(s) + '">' + esc(STATUS[s] || s) + '</span>'; }
  var tt;
  function toast(m) { var t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('show'); }, 2600); }

  function api(method, path, body) {
    return fetch(path, { method: method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (T.token || '') }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 401 && path.indexOf('/login') < 0 && path.indexOf('/setup') < 0) { logout(); throw new Error('Sessão expirada'); }
          if (!r.ok) throw new Error(j.error || ('Erro ' + r.status));
          return j;
        });
      });
  }
  function logout() { T.token = null; try { localStorage.removeItem('ap_admin_token'); } catch (e) {} boot(); }
  function saveSession(r) { T.token = r.token; T.me = r.admin; try { localStorage.setItem('ap_admin_token', r.token); localStorage.setItem('ap_admin_me', JSON.stringify(r.admin)); } catch (e) {} }

  // ---------------- login / primeiro acesso ----------------
  function loginView(needsSetup) {
    app.innerHTML = '<div class="login box"><div class="logo">Painel do Dono<small>Accioly Play</small></div>' +
      (needsSetup
        ? '<h1>Primeiro acesso</h1><p class="sub">Digite o código que apareceu na janela do servidor e crie sua conta de dono.</p>' +
          '<form id="f"><label class="f"><span>Código de primeiro acesso</span><input name="code" required autocomplete="off"></label>' +
          '<label class="f"><span>Seu nome</span><input name="name" required></label>' +
          '<label class="f"><span>E-mail</span><input name="email" type="email" required></label>' +
          '<label class="f"><span>Senha (8+ caracteres)</span><input name="password" type="password" minlength="8" required></label>'
        : '<h1>Entrar</h1><p class="sub">Acesso restrito ao dono e à equipe.</p><form id="f">' +
          '<label class="f"><span>E-mail</span><input name="email" type="email" required autocomplete="username"></label>' +
          '<label class="f"><span>Senha</span><input name="password" type="password" required autocomplete="current-password"></label>') +
      '<div class="err" id="err"></div><button class="btn p" type="submit">' + (needsSetup ? 'Criar conta de dono' : 'Entrar') + '</button></form></div>';
    var f = document.getElementById('f');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {}; new FormData(f).forEach(function (v, k) { data[k] = v; });
      api('POST', needsSetup ? '/api/admin/setup' : '/api/admin/login', data).then(function (r) { saveSession(r); shell(); })
        .catch(function (e2) { document.getElementById('err').textContent = e2.message; });
    });
  }

  // ---------------- estrutura ----------------
  var TABS = [['painel', '📊 Painel'], ['acoes', '✅ Ações do dia'], ['clientes', '👥 Clientes'], ['pedidos', '💰 Pedidos'], ['canais', '📺 Canais e Jogos'], ['config', '⚙️ Configurações'], ['equipe', '🛡️ Equipe']];
  function shell() {
    app.innerHTML = '<div class="layout"><aside><div class="logo">Painel do Dono<small>' + esc((T.me && T.me.name) || '') + ' · ' + esc((T.me && T.me.role) || '') + '</small></div><nav id="nav"></nav>' +
      '<div style="margin-top:18px" class="row"><a class="btn" href="/tv/" target="_blank">Abrir app</a><a class="btn" href="/" target="_blank">Página de vendas</a><button class="btn danger" id="out">Sair</button></div></aside><main id="main"></main></div>';
    document.getElementById('out').onclick = logout;
    renderNav();
    go(T.tab);
  }
  function renderNav() {
    var n = document.getElementById('nav');
    if (!n) return;
    n.innerHTML = TABS.map(function (t) { return '<button data-t="' + t[0] + '" class="' + (T.tab === t[0] ? 'on' : '') + '">' + t[1] + (t[0] === 'acoes' && T.pending ? '<span class="count">' + T.pending + '</span>' : '') + '</button>'; }).join('');
    n.querySelectorAll('button').forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-t')); }; });
  }
  function go(tab) {
    T.tab = tab; renderNav();
    var m = document.getElementById('main');
    m.innerHTML = '<p class="sub">Carregando…</p>';
    ({ painel: painel, acoes: acoes, clientes: clientes, pedidos: pedidos, canais: canais, config: config, equipe: equipe })[tab](m);
  }

  // ---------------- Painel ----------------
  function painel(m) {
    api('GET', '/api/admin/stats').then(function (s) {
      T.pending = s.pendingOrders; renderNav();
      var max = Math.max(1, Math.max.apply(null, s.days.map(function (x) { return Math.max(x.cadastros, x.vendas); })));
      var foundersPct = s.promoSlots ? Math.round(s.founders / s.promoSlots * 100) : 0;
      m.innerHTML = '<h1>Visão geral</h1><p class="sub">Tudo o que está acontecendo no seu negócio.</p>' +
        '<div class="cards">' +
          card('Clientes', s.users, 'cadastrados') +
          card('Em teste grátis', s.status.trial, 'agora') +
          card('Assinantes ativos', s.status.active, 'pagando') +
          card('Receita do mês', money(s.revenueMonth), 'total: ' + money(s.revenue)) +
          card('Receita recorrente', money(s.mrr), 'estimada por mês') +
          card('Conversão', (s.conversion * 100).toFixed(1) + '%', 'teste → compra') +
          card('Anúncios (7 dias)', s.adsOn ? s.ads7d : 'desligado', s.adsOn ? 'pedidos ao Google · receita no painel do AdSense' : 'ative em Configurações') +
        '</div>' +
        '<div class="grid2"><div class="box"><h2>🔥 Promoção de fundador</h2><div style="font-size:28px;font-weight:800">' + s.founders + ' / ' + s.promoSlots + '</div>' +
          '<div class="meter"><i style="width:' + foundersPct + '%"></i></div><div class="hint">' + (s.promoRemaining > 0 ? 'Restam ' + s.promoRemaining + ' vagas no preço promocional. Use isso nas divulgações: é escassez real.' : 'Promoção encerrada — novos clientes pagam o preço normal.') + '</div></div>' +
          '<div class="box"><h2>📡 Saúde dos canais</h2><div style="font-size:28px;font-weight:800">' + (s.health.total ? (s.health.total - s.health.broken) + ' / ' + s.health.total + ' OK' : 'ainda não verificado') + '</div>' +
          '<div class="hint">Última verificação: ' + dt(s.health.checkedAt) + ' · automática a cada 6h</div><div class="row" style="margin-top:10px"><button class="btn" id="hrun">Verificar agora</button><button class="btn" id="hsee">Ver detalhes</button></div></div></div>' +
        '<div class="box"><h2>Últimos 14 dias</h2><div class="bars">' + s.days.map(function (x) {
          return '<div class="b" title="' + x.day + ': ' + x.cadastros + ' cadastros, ' + x.vendas + ' vendas"><div style="display:flex;gap:2px;align-items:flex-end;height:100%;width:100%;justify-content:center">' +
            '<i style="height:' + (x.cadastros / max * 100) + '%"></i><i class="s" style="height:' + (x.vendas / max * 100) + '%"></i></div><span>' + x.day.slice(8) + '/' + x.day.slice(5, 7) + '</span></div>';
        }).join('') + '</div><div class="legend"><span><b style="background:var(--accent)"></b>Cadastros</span><span><b style="background:var(--ok)"></b>Vendas</span></div></div>' +
        '<div class="grid2"><div class="box"><h2>Canais mais assistidos</h2>' + topList(s.topChannels) + '</div><div class="box"><h2>Jogos mais jogados</h2>' + topList(s.topGames) + '</div></div>';
      document.getElementById('hrun').onclick = function () { api('POST', '/api/admin/health/run').then(function (r) { toast(r.message); }); };
      document.getElementById('hsee').onclick = function () { go('canais'); };
    }).catch(function (e) { m.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  function card(k, v, h) { return '<div class="card"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div><div class="h">' + esc(h) + '</div></div>'; }
  function topList(list) { return list.length ? '<table>' + list.map(function (x) { return '<tr><td>' + esc(x.id) + '</td><td style="text-align:right">' + x.n + '</td></tr>'; }).join('') + '</table>' : '<div class="empty">Sem dados ainda.</div>'; }

  // ---------------- Ações do dia ----------------
  var KIND = { pix_confirmar: '💰 Confirmar Pix', teste_acabando: '⏳ Teste acabando', renovacao: '🔁 Renovação', teste_expirou: '💬 Recuperar cliente', pedir_indicacao: '🤝 Pedir indicação' };
  function acoes(m) {
    api('GET', '/api/admin/actions').then(function (r) {
      T.pending = r.actions.filter(function (a) { return a.kind === 'pix_confirmar'; }).length; renderNav();
      m.innerHTML = '<h1>Ações do dia</h1><p class="sub">Sua lista de tarefas para vender mais. As mensagens de WhatsApp já vêm prontas: é só clicar, revisar e enviar.</p><div class="box" id="list">' +
        (r.actions.length ? r.actions.map(function (a, i) {
          var u = a.user || {};
          return '<div class="action"><div class="who"><span class="tag warn">' + esc(KIND[a.kind] || a.kind) + '</span> <b>' + esc(u.name || '') + '</b><span class="hint">' + esc(a.text) + ' · ' + esc(u.phone || '') + ' · ' + esc(u.email || '') + '</span></div>' +
            (a.kind === 'pix_confirmar' ? '<button class="btn ok" data-ap="' + a.order.id + '">Aprovar</button><button class="btn danger" data-rj="' + a.order.id + '">Recusar</button>' : '') +
            (a.wa ? '<a class="btn p" target="_blank" rel="noopener" href="' + esc(a.wa) + '" data-wa="' + i + '">WhatsApp</a>' : '') +
            '</div>';
        }).join('') : '<div class="empty">Nada pendente agora. 🎉 Bom momento para postar conteúdo (veja a pasta marketing).</div>') + '</div>';
      m.querySelectorAll('[data-ap]').forEach(function (b) { b.onclick = function () { api('POST', '/api/admin/orders/' + b.getAttribute('data-ap'), { action: 'approve' }).then(function () { toast('Pagamento aprovado e assinatura liberada!'); go('acoes'); }).catch(function (e) { toast(e.message); }); }; });
      m.querySelectorAll('[data-rj]').forEach(function (b) { b.onclick = function () { if (confirm('Recusar este pedido?')) api('POST', '/api/admin/orders/' + b.getAttribute('data-rj'), { action: 'reject' }).then(function () { go('acoes'); }); }; });
      m.querySelectorAll('[data-wa]').forEach(function (b) { b.addEventListener('click', function () { var a = r.actions[+b.getAttribute('data-wa')]; if (a.kind === 'pedir_indicacao') api('POST', '/api/admin/actions/referral-asked', { userId: a.user.id }); }); });
    }).catch(function (e) { m.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  // ---------------- Clientes ----------------
  function clientes(m, q, status) {
    q = q || ''; status = status || '';
    api('GET', '/api/admin/users?q=' + encodeURIComponent(q) + '&status=' + status).then(function (r) {
      m.innerHTML = '<h1>Clientes</h1><p class="sub">' + r.total + ' cadastrados. Clique em uma ação para estender teste, liberar assinatura, bloquear etc.</p>' +
        '<div class="row" style="margin-bottom:12px"><input id="q" placeholder="Buscar nome, e-mail ou WhatsApp" value="' + esc(q) + '" style="min-width:260px">' +
        '<select id="st"><option value="">Todos</option>' + ['trial', 'active', 'expired', 'blocked'].map(function (s) { return '<option value="' + s + '"' + (s === status ? ' selected' : '') + '>' + STATUS[s] + '</option>'; }).join('') + '</select>' +
        '<button class="btn" id="go">Buscar</button><a class="btn" id="csv" href="#">Exportar planilha (CSV)</a></div>' +
        '<div class="box scroll"><table><thead><tr><th>Cliente</th><th>Status</th><th>Teste até</th><th>Assinante até</th><th>Pago</th><th>Ações</th></tr></thead><tbody>' +
        (r.users.length ? r.users.map(function (u) {
          return '<tr><td><b>' + esc(u.name) + '</b>' + (u.founder ? ' <span class="tag ok">Fundador</span>' : '') + '<div class="hint">' + esc(u.email) + ' · ' + esc(u.phone) + '</div>' + (u.notes ? '<div class="hint">📝 ' + esc(u.notes) + '</div>' : '') + '</td>' +
            '<td>' + tag(u.status) + '</td><td>' + d(u.trialEndsAt) + '</td><td>' + d(u.paidUntil) + '</td><td>' + money(u.paidTotal) + '</td>' +
            '<td><select data-u="' + u.id + '"><option value="">Escolher…</option><option value="extend_trial:1">+1 dia de teste</option><option value="extend_trial:3">+3 dias de teste</option>' +
            '<option value="activate:30">Liberar 30 dias (pagou por fora)</option><option value="activate:7">Dar 7 dias de bônus</option><option value="founder">Marcar/desmarcar fundador</option>' +
            '<option value="note">Anotação</option><option value="reset_password">Definir nova senha</option>' + (u.status === 'blocked' ? '<option value="unblock">Desbloquear</option>' : '<option value="block">Bloquear</option>') +
            '<option value="delete">Excluir cliente</option></select></td></tr>';
        }).join('') : '<tr><td colspan="6" class="empty">Nenhum cliente encontrado.</td></tr>') + '</tbody></table></div>';
      var run = function () { clientes(m, document.getElementById('q').value, document.getElementById('st').value); };
      document.getElementById('go').onclick = run;
      document.getElementById('q').onkeydown = function (e) { if (e.key === 'Enter') run(); };
      document.getElementById('csv').onclick = function (e) {
        e.preventDefault();
        fetch('/api/admin/export.csv', { headers: { Authorization: 'Bearer ' + T.token } }).then(function (r2) { return r2.blob(); }).then(function (b) {
          var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'clientes.csv'; a.click();
        });
      };
      m.querySelectorAll('select[data-u]').forEach(function (s) {
        s.onchange = function () {
          var v = s.value.split(':'), body = { action: v[0] };
          if (v[1]) body.days = +v[1];
          if (v[0] === 'note') { var n = prompt('Anotação sobre o cliente:'); if (n == null) return (s.value = ''); body.notes = n; }
          if (v[0] === 'reset_password') { var p = prompt('Nova senha do cliente (6+ caracteres):'); if (!p) return (s.value = ''); body.password = p; }
          if (v[0] === 'delete' && !confirm('Excluir este cliente de vez?')) return (s.value = '');
          api('POST', '/api/admin/users/' + s.getAttribute('data-u'), body).then(function () { toast('Feito!'); run(); }).catch(function (e) { toast(e.message); s.value = ''; });
        };
      });
    }).catch(function (e) { m.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  // ---------------- Pedidos ----------------
  function pedidos(m) {
    api('GET', '/api/admin/orders').then(function (r) {
      m.innerHTML = '<h1>Pedidos</h1><p class="sub">Pix manual: confira o valor no app do banco e clique em Aprovar. Mercado Pago aprova sozinho.</p><div class="box scroll"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Valor</th><th>Forma</th><th>Status</th><th>Data</th><th></th></tr></thead><tbody>' +
        (r.orders.length ? r.orders.map(function (o) {
          return '<tr><td><code>' + esc(o.id) + '</code>' + (o.promo ? ' <span class="tag ok">promo</span>' : '') + '</td><td>' + esc(o.userName) + '<div class="hint">' + esc(o.userPhone) + '</div></td><td>' + money(o.amount) + '</td><td>' + (o.method === 'mp' ? 'Mercado Pago' : 'Pix') + '</td><td>' + tag(o.status) + '</td><td>' + dt(o.createdAt) + '</td>' +
            '<td>' + (o.status !== 'pago' ? '<button class="btn ok" data-ap="' + o.id + '">Aprovar</button> ' : '') + (o.status === 'pendente' || o.status === 'aguardando_confirmacao' ? '<button class="btn danger" data-rj="' + o.id + '">Recusar</button>' : '') + '</td></tr>';
        }).join('') : '<tr><td colspan="7" class="empty">Nenhum pedido ainda.</td></tr>') + '</tbody></table></div>';
      m.querySelectorAll('[data-ap]').forEach(function (b) { b.onclick = function () { if (confirm('Confirmar que o pagamento caiu na sua conta?')) api('POST', '/api/admin/orders/' + b.getAttribute('data-ap'), { action: 'approve' }).then(function () { toast('Aprovado!'); go('pedidos'); }); }; });
      m.querySelectorAll('[data-rj]').forEach(function (b) { b.onclick = function () { if (confirm('Recusar?')) api('POST', '/api/admin/orders/' + b.getAttribute('data-rj'), { action: 'reject' }).then(function () { go('pedidos'); }); }; });
    }).catch(function (e) { m.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  // ---------------- Canais e Jogos ----------------
  var GAMES = [['cobrinha', 'Cobrinha Neon', false], ['quebrablocos', 'Quebra-Blocos', true], ['pingpong', 'Pingue-Pongue 2P', true], ['meteoros', 'Chuva de Meteoros', true], ['memoria', 'Memória Brasil', false], ['quiz', 'Quiz Brasil', true], ['velha', 'Jogo da Velha', false], ['corrida', 'Corrida Neon', true],
    ['frutas', 'Festa das Frutas', true], ['blocos', 'Blocos Encaixe', false], ['penaltis', 'Disputa de Pênaltis', true], ['palavra', 'Palavra Secreta', true], ['capivara', 'Corre Capivara', false]];
  function canais(m) {
    api('GET', '/api/admin/catalog').then(function (r) {
      var items = r.catalog.items, cats = r.catalog.categories, hr = (r.health && r.health.results) || {}, games = r.games || {};
      function rowHtml(it, i) {
        var h = hr[it.id];
        return '<tr data-i="' + i + '"><td><input type="checkbox" data-k="enabled"' + (it.enabled !== false ? ' checked' : '') + '></td>' +
          '<td><input type="text" data-k="name" value="' + esc(it.name) + '"><div class="hint">id: <input type="text" data-k="id" value="' + esc(it.id) + '" style="width:120px;padding:2px 6px"></div></td>' +
          '<td><select data-k="cat">' + cats.map(function (c) { return '<option value="' + c.id + '"' + (c.id === it.cat ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></td>' +
          '<td><select data-k="type">' + [['hls', 'Sinal .m3u8'], ['youtube', 'YouTube'], ['link', 'Link oficial']].map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === it.type ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></td>' +
          '<td><input type="text" data-k="src" value="' + esc(it.type === 'youtube' ? it.handle : it.url) + '" placeholder="https://… ou @canal"><input type="text" data-k="desc" value="' + esc(it.desc || '') + '" placeholder="descrição" style="margin-top:4px"></td>' +
          '<td><input type="color" data-k="color" value="' + esc(/^#[0-9a-f]{6}$/i.test(it.color || '') ? it.color : '#334155') + '"></td>' +
          '<td>' + (h ? '<span class="tag ' + (h.ok ? 'ok' : 'bad') + '">' + (h.ok ? 'OK' : 'Falha') + '</span><div class="hint">' + esc(h.note || '') + '</div>' : '<span class="hint">—</span>') + '</td>' +
          '<td><button class="btn" data-mv="-1">↑</button> <button class="btn" data-mv="1">↓</button> <button class="btn danger" data-del>✕</button></td></tr>';
      }
      function draw() {
        m.innerHTML = '<h1>Canais e Jogos</h1><p class="sub">Use somente fontes oficiais e gratuitas (sinal da emissora, canal oficial no YouTube ou site/app oficial). Nunca adicione listas IPTV piratas.</p>' +
          '<div class="row" style="margin-bottom:12px"><button class="btn p" id="save">Salvar alterações</button><button class="btn" id="add">+ Adicionar canal</button><button class="btn" id="hrun">Verificar canais agora</button><button class="btn danger" id="reset">Restaurar lista padrão</button></div>' +
          '<div class="box scroll"><table><thead><tr><th>Ativo</th><th>Nome</th><th>Categoria</th><th>Tipo</th><th>Endereço</th><th>Cor</th><th>Status</th><th></th></tr></thead><tbody id="tb">' + items.map(rowHtml).join('') + '</tbody></table></div>' +
          '<div class="box"><h2>Jogos</h2><table><thead><tr><th>Jogo</th><th>Ativo</th><th>Premium (só assinante)</th></tr></thead><tbody>' + GAMES.map(function (g) {
            var o = games[g[0]] || {}; var en = o.enabled !== false; var pr = o.premium != null ? o.premium : g[2];
            return '<tr><td>' + esc(g[1]) + '</td><td><input type="checkbox" data-g="' + g[0] + '" data-gk="enabled"' + (en ? ' checked' : '') + '></td><td><input type="checkbox" data-g="' + g[0] + '" data-gk="premium"' + (pr ? ' checked' : '') + '></td></tr>';
          }).join('') + '</tbody></table><p class="hint">Dica: deixar 3 jogos grátis e 5 premium dá gostinho no teste e motivo para assinar.</p></div>';
        bind();
      }
      function collect() {
        m.querySelectorAll('#tb tr').forEach(function (tr) {
          var it = items[+tr.getAttribute('data-i')];
          tr.querySelectorAll('[data-k]').forEach(function (inp) {
            var k = inp.getAttribute('data-k');
            if (k === 'enabled') it.enabled = inp.checked;
            else if (k === 'src') { if (tr.querySelector('[data-k=type]').value === 'youtube') { it.handle = inp.value.trim(); delete it.url; } else { it.url = inp.value.trim(); delete it.handle; } }
            else it[k] = inp.value;
          });
        });
        var g = {};
        m.querySelectorAll('[data-g]').forEach(function (c) { var id = c.getAttribute('data-g'); g[id] = g[id] || {}; g[id][c.getAttribute('data-gk')] = c.checked; });
        return g;
      }
      function bind() {
        document.getElementById('save').onclick = function () { var g = collect(); api('PUT', '/api/admin/catalog', { items: items, games: g }).then(function () { toast('Salvo! Os clientes já veem a nova lista.'); }).catch(function (e) { toast(e.message); }); };
        document.getElementById('add').onclick = function () { collect(); items.push({ id: 'novo' + Date.now().toString(36), name: 'Novo canal', cat: cats[0].id, type: 'link', url: 'https://', color: '#334155', enabled: true }); draw(); };
        document.getElementById('hrun').onclick = function () { api('POST', '/api/admin/health/run').then(function (r2) { toast(r2.message); }); };
        document.getElementById('reset').onclick = function () { if (confirm('Voltar para a lista padrão? Suas edições serão perdidas.')) api('PUT', '/api/admin/catalog', { reset: true }).then(function () { go('canais'); }); };
        m.querySelectorAll('[data-mv]').forEach(function (b) { b.onclick = function () { collect(); var i = +b.closest('tr').getAttribute('data-i'), j = i + +b.getAttribute('data-mv'); if (j < 0 || j >= items.length) return; var t = items[i]; items[i] = items[j]; items[j] = t; draw(); }; });
        m.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { collect(); items.splice(+b.closest('tr').getAttribute('data-i'), 1); draw(); }; });
      }
      draw();
    }).catch(function (e) { m.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  // ---------------- Configurações ----------------
  function config(m) {
    api('GET', '/api/admin/settings').then(function (r) {
      var s = r.settings;
      function f(k, label, type, hint, extra) {
        return '<label class="f"><span>' + esc(label) + '</span><input name="' + k + '" type="' + (type || 'text') + '" value="' + esc(s[k]) + '"' + (extra || '') + '>' + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</label>';
      }
      m.innerHTML = '<h1>Configurações</h1><p class="sub">Preços, teste grátis, Pix, Mercado Pago e textos do app.</p><form id="cf">' +
        '<div class="grid2"><div class="box"><h2>Produto e textos</h2>' + f('productName', 'Nome do produto') + f('heroTitle', 'Título de destaque no app', 'text', 'Deixe vazio para usar o padrão.') + f('heroText', 'Texto de destaque no app') +
          f('announcement', 'Aviso no topo do app', 'text', 'Ex.: "Hoje tem jogo do Brasil na CazéTV às 16h!" (vazio = sem aviso)') + f('supportWhatsapp', 'WhatsApp de suporte (com DDD)', 'tel', 'Aparece no app e na página de vendas.') +
          f('publicUrl', 'Endereço público do site', 'url', 'Ex.: https://acciolyplay.com.br — necessário para o Mercado Pago confirmar sozinho e para links de indicação.') + '</div>' +
        '<div class="box"><h2>Preços e teste grátis</h2>' + f('trialDays', 'Dias de teste grátis', 'number', '', ' min="0" step="1"') + f('promoPrice', 'Preço promocional (fundador) R$', 'number', 'Fica travado para quem comprar dentro das vagas.', ' min="0" step="0.01"') +
          f('promoSlots', 'Vagas no preço promocional', 'number', 'Ex.: 50 primeiros compradores.', ' min="0" step="1"') + f('regularPrice', 'Preço normal R$', 'number', '', ' min="0" step="0.01"') +
          f('planDays', 'Dias por pagamento', 'number', '30 = mensal.', ' min="1" step="1"') + f('referralBonusDays', 'Dias de bônus por indicação', 'number', '', ' min="0" step="1"') +
          '<label class="f"><span>Canais grátis mesmo sem assinatura?</span><select name="freeChannels"><option value="true"' + (s.freeChannels ? ' selected' : '') + '>Sim (recomendado: TV aberta é grátis; você cobra pelos jogos e recursos)</option><option value="false"' + (!s.freeChannels ? ' selected' : '') + '>Não (tudo só para assinantes)</option></select></label></div></div>' +
        '<div class="grid2"><div class="box"><h2>Pix (manual, sem taxa)</h2>' + f('pixKey', 'Sua chave Pix') +
          '<label class="f"><span>Tipo da chave</span><select name="pixKeyType">' + [['cpf', 'CPF'], ['cnpj', 'CNPJ'], ['email', 'E-mail'], ['telefone', 'Celular'], ['aleatoria', 'Chave aleatória']].map(function (t) { return '<option value="' + t[0] + '"' + (s.pixKeyType === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></label>' +
          f('pixName', 'Nome do recebedor (como no banco)') + f('pixCity', 'Cidade do recebedor') + '<div class="hint">O cliente paga pelo QR Code e clica "Já paguei". Você confere no banco e aprova em "Ações do dia".</div></div>' +
        '<div class="box"><h2>Mercado Pago (automático)</h2>' + (r.settings.mpFromEnv ? '<p class="hint">Token definido pela variável MP_ACCESS_TOKEN no servidor.</p>' : f('mpAccessToken', 'Access Token de produção', 'password', 'Mercado Pago > Seu negócio > Configurações > Credenciais. Libera cartão e Pix com confirmação automática (cobra taxa do MP).')) + '</div></div>' +
        '<div class="grid2"><div class="box"><h2>🎵 Música e Vídeos (YouTube)</h2>' +
          (r.settings.ytFromEnv ? '<p class="hint">Chave definida pela variável YOUTUBE_API_KEY no servidor.</p>' : f('youtubeApiKey', 'Chave da API do YouTube (YouTube Data API v3)', 'password',
            'Grátis: console.cloud.google.com → criar projeto → "APIs e serviços" → ativar "YouTube Data API v3" → Credenciais → Criar chave de API. Cota grátis: 10.000 unidades/dia (≈ 90 buscas + "em alta" ilimitado graças ao cache).')) +
          '<div class="hint">Os vídeos tocam no player oficial do YouTube, com os anúncios do próprio YouTube (é proibido bloquear). A "Música livre" (Audius) funciona sem chave e não tem anúncios.</div></div>' +
        '<div class="box"><h2>💰 Anúncios que pagam você (Google AdSense)</h2>' +
          '<label class="f"><span>Mostrar anúncios</span><select name="adsEnabled"><option value="false"' + (!s.adsEnabled ? ' selected' : '') + '>Desligado</option><option value="true"' + (s.adsEnabled ? ' selected' : '') + '>Ligado</option></select></label>' +
          f('adsensePublisherId', 'ID de editor do AdSense', 'text', 'Formato ca-pub-1234567890123456 (AdSense → Conta → Informações da conta). O arquivo ads.txt é gerado sozinho em /ads.txt.') +
          f('adsenseBannerSlot', 'ID do bloco de anúncio do banner (opcional)', 'text', 'AdSense → Anúncios → Por bloco de anúncios → Display → copie o data-ad-slot.') +
          '<label class="f"><span>Quem vê anúncios</span><select name="adsAudience"><option value="expirados"' + (s.adsAudience !== 'nao_assinantes' ? ' selected' : '') + '>Só quem terminou o teste e não assinou (recomendado)</option><option value="nao_assinantes"' + (s.adsAudience === 'nao_assinantes' ? ' selected' : '') + '>Todos que não assinam (inclui teste grátis)</option></select></label>' +
          '<label class="f"><span>Modo de teste (anúncios de exemplo)</span><select name="adsTestMode"><option value="true"' + (s.adsTestMode ? ' selected' : '') + '>Ligado — use até o AdSense aprovar</option><option value="false"' + (!s.adsTestMode ? ' selected' : '') + '>Desligado — anúncios reais (geram dinheiro)</option></select></label>' +
          f('adFrequency', 'Intervalo mínimo entre anúncios (segundos)', 'number', '', ' min="30" step="10"') +
          '<div class="hint">Aparecem só entre partidas, no "ver 1 anúncio e jogar 30 min" e num banner na tela inicial — nunca em cima de vídeos ou canais. Assinantes não veem anúncios. Política de privacidade exigida pelo Google: <a href="/privacidade" target="_blank">/privacidade</a>.</div></div></div>' +
        '<div class="box"><h2>📱 AdMob (anúncios no app Android)</h2>' +
          '<label class="f"><span>Anúncios no app Android</span><select name="admobEnabled"><option value="false"' + (!s.admobEnabled ? ' selected' : '') + '>Desligado</option><option value="true"' + (s.admobEnabled ? ' selected' : '') + '>Ligado</option></select></label>' +
          f('admobAppId', 'ID do app no AdMob', 'text', 'Formato ca-app-pub-1234567890123456~1234567890. Use o MESMO no GitHub → Actions → "Gerar APK Android TV" → campo admob_app_id. Gera o /app-ads.txt automaticamente.') +
          f('admobInterstitialId', 'Bloco de anúncio intersticial (tela cheia)', 'text', 'Formato ca-app-pub-1234567890123456/1234567890 — aparece entre partidas.') +
          f('admobRewardedId', 'Bloco de anúncio premiado (recompensado)', 'text', 'Formato ca-app-pub-1234567890123456/1234567890 — "ver 1 anúncio e jogar 30 min".') +
          '<div class="hint">Com o <b>modo de teste</b> ligado (seção acima), o app usa os anúncios de teste do Google — use assim até o AdMob aprovar o app. Mudar os blocos aqui não exige gerar o APK de novo. Quem segue as regras de "Quem vê anúncios" é o mesmo da web: assinantes nunca veem.</div></div>' +
        '<button class="btn p" type="submit">Salvar configurações</button></form>';
      document.getElementById('cf').addEventListener('submit', function (e) {
        e.preventDefault();
        var data = {}; new FormData(e.target).forEach(function (v, k) { data[k] = v; });
        api('PUT', '/api/admin/settings', data).then(function () { toast('Configurações salvas!'); }).catch(function (e2) { toast(e2.message); });
      });
    }).catch(function (e) { m.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  // ---------------- Equipe ----------------
  function equipe(m) {
    api('GET', '/api/admin/admins').then(function (r) {
      m.innerHTML = '<h1>Equipe e acessos</h1><p class="sub">Quem pode entrar no painel. "Suporte" vê clientes e aprova pagamentos; só o "Dono" muda preços, canais e equipe.</p>' +
        '<div class="box"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Desde</th><th></th></tr></thead><tbody>' + r.admins.map(function (a) {
          return '<tr><td>' + esc(a.name) + '</td><td>' + esc(a.email) + '</td><td>' + esc(a.role) + '</td><td>' + d(a.createdAt) + '</td><td><button class="btn danger" data-rm="' + a.id + '">Remover</button></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="grid2"><form class="box" id="addf"><h2>Adicionar pessoa</h2><label class="f"><span>Nome</span><input name="name" required></label><label class="f"><span>E-mail</span><input name="email" type="email" required></label>' +
          '<label class="f"><span>Senha inicial (8+)</span><input name="password" type="password" minlength="8" required></label><label class="f"><span>Papel</span><select name="role"><option value="suporte">Suporte</option><option value="dono">Dono (acesso total)</option></select></label><button class="btn p">Adicionar</button></form>' +
        '<form class="box" id="pwf"><h2>Trocar minha senha</h2><label class="f"><span>Senha atual</span><input name="current" type="password" required></label><label class="f"><span>Nova senha (8+)</span><input name="password" type="password" minlength="8" required></label><button class="btn p">Trocar senha</button></form></div>' +
        '<div class="box"><h2>Histórico de atividades</h2>' + (r.audit.length ? '<table>' + r.audit.map(function (x) { return '<tr><td style="white-space:nowrap">' + dt(x.at) + '</td><td>' + esc(x.who) + '</td><td>' + esc(x.what) + '</td></tr>'; }).join('') + '</table>' : '<div class="empty">Sem atividades.</div>') + '</div>';
      m.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { if (confirm('Remover acesso?')) api('DELETE', '/api/admin/admins/' + b.getAttribute('data-rm')).then(function () { go('equipe'); }).catch(function (e) { toast(e.message); }); }; });
      form('addf', 'POST', '/api/admin/admins', 'Pessoa adicionada!');
      form('pwf', 'POST', '/api/admin/password', 'Senha trocada!');
    }).catch(function (e) { m.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  function form(id, method, path, ok) {
    document.getElementById(id).addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {}; new FormData(e.target).forEach(function (v, k) { data[k] = v; });
      api(method, path, data).then(function () { toast(ok); go(T.tab); }).catch(function (e2) { toast(e2.message); });
    });
  }

  function boot() {
    api('GET', '/api/admin/setup').then(function (r) {
      if (r.needsSetup) return loginView(true);
      if (!T.token) return loginView(false);
      shell();
    }).catch(function () { app.innerHTML = '<p class="login">Servidor fora do ar.</p>'; });
  }
  boot();
})();

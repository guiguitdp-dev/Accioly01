/*
 * Accioly Play — efeitos 3D leves ligados ao foco (ES5, sem dependências).
 *  - inclina o cartão em foco conforme a posição dele na tela (vira para o centro);
 *  - reflexo/luz do cartão segue essa inclinação (variáveis --rx --ry --lx --ly);
 *  - luz ambiente suave atrás do cartão em foco (#fx-luz);
 *  - parallax suave da imagem do destaque (.hero-bg) ao rolar;
 *  - no computador, a inclinação acompanha o mouse.
 * Nada roda em laço: só reage a foco, rolagem e mouse (com requestAnimationFrame).
 * Desliga tudo em html[data-perf="leve"] e com "reduzir movimento".
 */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
  function mq(q) { try { return window.matchMedia ? window.matchMedia(q) : null; } catch (e) { return null; } }
  var calmo = mq('(prefers-reduced-motion: reduce)');
  var mouseFino = mq('(hover: hover) and (pointer: fine)');
  var toque = mq('(hover: none) and (pointer: coarse)');

  var luz = null, inclinado = null, sobMouse = null, mouse = null, pendente = false, apagado = false;

  function ligado() { return html.getAttribute('data-perf') !== 'leve' && !(calmo && calmo.matches); }
  function limita(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ehCartao(el) { return !!(el && el.classList && el.classList.contains('tile')); }
  function root() { return doc.getElementById('root'); }

  // Posição horizontal final do cartão (-1 = canto esquerdo, 1 = direito).
  // Nas fileiras roláveis prevê onde ele fica depois do scrollIntoView (centralizado).
  function posX(el) {
    var vw = window.innerWidth || html.clientWidth || 1;
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var tr = el.closest ? el.closest('.track') : null;
    if (tr && tr.scrollWidth > tr.clientWidth + 2) {
      var tb = tr.getBoundingClientRect();
      var noConteudo = cx - tb.left - tr.clientLeft + tr.scrollLeft;
      var alvo = limita(noConteudo - tr.clientWidth / 2, 0, tr.scrollWidth - tr.clientWidth);
      cx = tb.left + tr.clientLeft + noConteudo - alvo;
    }
    return limita((cx - vw / 2) / (vw / 2), -1, 1);
  }

  function inclina(el, nx, ny) {
    var s = el.style;
    s.setProperty('--ry', (nx * 6).toFixed(2) + 'deg');
    s.setProperty('--rx', (2.5 - ny * 5).toFixed(2) + 'deg');
    s.setProperty('--lx', (50 - nx * 40).toFixed(1) + '%');
    s.setProperty('--ly', (ny * 45 - 8).toFixed(1) + '%');
  }
  function endireita(el) {
    if (!el || !el.style) return;
    var s = el.style;
    s.removeProperty('--ry'); s.removeProperty('--rx'); s.removeProperty('--lx'); s.removeProperty('--ly');
  }

  // Cor do cartão (--c) vira a cor da luz ambiente
  function rgbDe(el) {
    var c = '';
    try { c = (el.style.getPropertyValue('--c') || '').trim(); } catch (e) {}
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
    if (!m) return '47,230,255';
    var h = m[1];
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var n = parseInt(h, 16);
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  }
  var corAtual = '';
  function posicionaLuz(el) {
    if (!luz) return;
    var rt = root();
    if (!el || !rt || !rt.contains(el) || (toque && toque.matches)) { luz.className = ''; return; }
    var r = el.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > (window.innerHeight || 0)) { luz.className = ''; return; }
    var x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    luz.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    var cor = ehCartao(el) ? rgbDe(el) : '47,230,255';
    if (cor !== corAtual) {
      corAtual = cor;
      luz.style.background = 'radial-gradient(closest-side, rgba(' + cor + ',.3), rgba(' + cor + ',.1) 45%, rgba(47,230,255,.04) 70%, transparent)';
    }
    luz.className = 'on';
  }

  // Parallax da imagem do destaque: desce mais devagar que a página e acompanha o foco nos botões
  function parallaxHero() {
    var h = doc.getElementById('hero');
    var img = h && h.querySelector('.hero-bg');
    var rt = root();
    if (!img || !rt) return;
    var r = h.getBoundingClientRect();
    if (r.bottom < 0) return;
    var my = r.height * 0.05, mx = r.width * 0.05; // a imagem está em scale(1.12): sobra ~6% de cada lado
    var py = limita(rt.scrollTop * 0.22, 0, my);
    var px = 0, a = doc.activeElement;
    if (a && h.contains(a)) px = limita(-posX(a) * mx * 0.6, -mx, mx);
    img.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0) scale(1.12)';
  }

  function quadro() {
    pendente = false;
    if (!ligado()) { desliga(); return; }
    apagado = false;
    if (!luz) {
      luz = doc.createElement('div');
      luz.id = 'fx-luz';
      luz.setAttribute('aria-hidden', 'true');
      doc.body.appendChild(luz);
    }
    if (mouse && mouse.t && mouse.t.isConnected !== false) inclina(mouse.t, mouse.nx, mouse.ny);
    posicionaLuz(doc.activeElement);
    parallaxHero();
  }
  function agenda() { if (!pendente) { pendente = true; raf(quadro); } }

  function desliga() {
    if (apagado) return;
    apagado = true;
    if (luz) luz.className = '';
    endireita(inclinado); inclinado = null;
    endireita(sobMouse); sobMouse = null; mouse = null;
    var img = doc.querySelector('#hero .hero-bg');
    if (img) img.style.transform = '';
  }

  doc.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!ligado()) { desliga(); return; }
    if (inclinado && inclinado !== el && inclinado !== sobMouse) endireita(inclinado);
    inclinado = null;
    if (ehCartao(el) && el !== sobMouse) { inclina(el, posX(el), 0); inclinado = el; }
    agenda();
    setTimeout(agenda, 380); // depois da rolagem suave
  });
  doc.addEventListener('focusout', function (e) {
    if (e.target === inclinado && e.target !== sobMouse) { endireita(inclinado); inclinado = null; }
    agenda();
  });
  // Rolagem do #root e das fileiras (captura: o evento "scroll" não sobe)
  doc.addEventListener('scroll', agenda, true);
  window.addEventListener('resize', agenda);
  // Imagem nova do destaque (troca a cada 8 s): já entra na posição certa
  doc.addEventListener('load', function (e) { var t = e.target; if (t && t.className === 'hero-bg') agenda(); }, true);

  // Computador: inclinação segue o ponteiro
  doc.addEventListener('mousemove', function (e) {
    if (!(mouseFino && mouseFino.matches) || !ligado()) return;
    var t = e.target && e.target.closest ? e.target.closest('.tile') : null;
    if (t !== sobMouse) {
      if (sobMouse) {
        if (sobMouse === doc.activeElement) { inclina(sobMouse, posX(sobMouse), 0); inclinado = sobMouse; }
        else endireita(sobMouse);
      }
      sobMouse = t;
    }
    if (!t) { mouse = null; return; }
    var w = t.offsetWidth || 1, h = t.offsetHeight || 1, r = t.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    mouse = { t: t, nx: limita((e.clientX - cx) / (w / 2), -1, 1), ny: limita((e.clientY - cy) / (h / 2), -1, 1) };
    agenda();
  });
  doc.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget && sobMouse) {
      if (sobMouse === doc.activeElement) inclina(sobMouse, posX(sobMouse), 0); else endireita(sobMouse);
      sobMouse = null; mouse = null;
    }
  });
})();

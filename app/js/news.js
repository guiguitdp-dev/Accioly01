/*
 * Notícias do dia a dia: busca a lista (servidor do dono -> lista publicada de hora em hora
 * no GitHub -> cópia embutida no pendrive/APK) e lê as notícias em voz alta.
 */
(function () {
  var CFG = window.APP_CONFIG || {};
  var RAW = CFG.newsUrl || 'https://raw.githubusercontent.com/guiguitdp-dev/Accioly01/noticias-dados/noticias.json';
  var KEY = 'ap_news';
  var FRESH = 15 * 60e3;
  var mem = null;

  function lsGet() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function lsSet(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function valid(d) { return d && d.sections && d.sections.length && d.updatedAt; }

  function getJson(url, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; reject(new Error('tempo esgotado')); } }, ms || 12000);
      fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) { if (!done) { done = true; clearTimeout(t); resolve(j); } })
        .catch(function (e) { if (!done) { done = true; clearTimeout(t); reject(e); } });
    });
  }

  // apiBase: '' (mesmo servidor), 'https://...' ou null (sem servidor)
  function load(apiBase, force) {
    var best = mem || lsGet();
    var snap = window.NEWS_SNAPSHOT;
    if (valid(snap) && (!valid(best) || snap.updatedAt > best.updatedAt)) best = snap;
    if (!force && valid(best) && Date.now() - (best.fetchedAt || best.updatedAt) < FRESH) return Promise.resolve(best);
    var tries = [];
    if (apiBase !== null && apiBase !== undefined) tries.push(apiBase + '/api/news');
    tries.push(RAW);
    var i = 0;
    function next() {
      if (i >= tries.length) return valid(best) ? Promise.resolve(best) : Promise.reject(new Error('Sem notícias agora'));
      return getJson(tries[i++]).then(function (d) {
        if (!valid(d)) throw new Error('lista vazia');
        // Nunca troca por uma lista mais velha do que a que já temos
        if (valid(best) && best.updatedAt > d.updatedAt) d = best;
        d.fetchedAt = Date.now();
        mem = d; lsSet(d);
        return d;
      }).catch(next);
    }
    return next();
  }

  function ago(ts) {
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 2) return 'agora';
    if (m < 60) return 'há ' + m + ' min';
    var h = Math.round(m / 60);
    if (h < 24) return 'há ' + h + ' h';
    return h < 48 ? 'ontem' : 'há ' + Math.round(h / 24) + ' dias';
  }

  // ---------------- voz ----------------
  var native = function () { return window.AndroidTV && AndroidTV.speak ? AndroidTV : null; };
  function canSpeak() { return !!native() || ('speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function'); }
  function voice() {
    var vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    return vs.filter(function (v) { return /^pt[-_]BR/i.test(v.lang); })[0] || vs.filter(function (v) { return /^pt/i.test(v.lang); })[0] || null;
  }
  // onDone: chamado quando a leitura termina sozinha (não quando é interrompida)
  var doneCb = null, seq = 0;
  window.__ttsDone = function () { var cb = doneCb; doneCb = null; if (cb) cb(); };
  function speak(text, onDone) {
    text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 3800);
    if (!text) return false;
    stop();
    doneCb = onDone || null;
    var n = native();
    if (n) { try { n.speak(text); return true; } catch (e) { doneCb = null; } }
    if (!canSpeak()) return false;
    var my = ++seq;
    // O Chrome corta falas longas: fala em pedaços de até ~200 letras
    var parts = text.match(/[^.!?]+[.!?]*/g) || [text], chunks = [], cur = '';
    parts.forEach(function (p) { if ((cur + p).length > 200 && cur) { chunks.push(cur); cur = p; } else cur += p; });
    if (cur) chunks.push(cur);
    var v = voice();
    chunks.forEach(function (c, i) {
      var u = new SpeechSynthesisUtterance(c.trim());
      u.lang = 'pt-BR'; if (v) u.voice = v; u.rate = 1;
      if (i === chunks.length - 1) u.onend = function () { if (my === seq) window.__ttsDone(); };
      speechSynthesis.speak(u);
    });
    return true;
  }
  function stop() {
    doneCb = null; seq++;
    var n = native();
    if (n && n.stopSpeak) { try { n.stopSpeak(); } catch (e) {} }
    if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) {}
  }
  if (window.speechSynthesis && speechSynthesis.getVoices) try { speechSynthesis.getVoices(); } catch (e) {}

  function briefing(d) {
    var list = (d.top && d.top.length ? d.top : (d.sections[0] || { items: [] }).items).slice(0, 8);
    var dia = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return 'Resumo das notícias de ' + dia + '. ' + list.map(function (n, k) { return (k ? 'Próxima: ' : '') + n.t.replace(/[.!?]*$/, '') + ', segundo ' + n.src + '.'; }).join(' ') +
      ' Mais notícias na aba Notícias do Accioly Play.';
  }

  window.News = { load: load, ago: ago, canSpeak: canSpeak, speak: speak, stop: stop, briefing: briefing, RAW: RAW };
})();

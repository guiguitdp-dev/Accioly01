/*
 * Anúncios que pagam o dono (Google AdSense — Ad Placement API para jogos HTML5 + banner).
 *
 * Regras (para não ser banido e para vender assinatura):
 *  - Só para quem NÃO assina (assinante = sem anúncios).
 *  - Nunca em cima dos vídeos do YouTube nem dos canais ao vivo: só entre partidas
 *    de jogos, no "assista 1 anúncio e jogue" e num banner na tela inicial.
 *  - No app Android (WebView) fica desligado, a menos que o dono ative depois de
 *    integrar o AdMob (exigência do Google para anúncios dentro de apps).
 *  - Se o AdSense não carregar (bloqueador, sem aprovação, offline), tudo segue normal.
 */
(function () {
  var cfg = null, ready = false, loaded = false;

  function eligible(user, local) {
    if (!cfg || !cfg.enabled || !cfg.client || local) return false;
    if (window.AndroidTV && !cfg.android) return false;
    if (!user) return false;
    if (user.status === 'active') return false;               // assinante: sem anúncios
    if (user.status === 'trial' && cfg.audience !== 'nao_assinantes') return false;
    return true;
  }

  function load() {
    if (loaded) return;
    loaded = true;
    window.adsbygoogle = window.adsbygoogle || [];
    window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-ad-client', cfg.client);
    s.setAttribute('data-ad-frequency-hint', Math.max(30, cfg.frequency || 120) + 's');
    if (cfg.test) s.setAttribute('data-adbreak-test', 'on');
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cfg.client);
    s.onerror = function () { ready = false; };
    document.head.appendChild(s);
    window.adConfig({ preloadAdBreaks: 'on', sound: 'on', onReady: function () { ready = true; } });
  }

  function track(name) { if (window.App && App.track) App.track('ad', name); }

  var Ads = {
    // chamado pelo app sempre que a conta/configuração muda
    setup: function (settingsAds, user, local) {
      cfg = settingsAds || null;
      Ads.on = eligible(user, local);
      if (Ads.on) load();
    },
    on: false,
    // Anúncio entre partidas. Sempre chama done(), com ou sem anúncio.
    interstitial: function (name, done) {
      // Sem anúncio pré-carregado (AdSense bloqueado, não aprovado ou offline): segue na hora
      if (!Ads.on || !window.adBreak || !ready) return done();
      var called = false;
      var finish = function () { if (!called) { called = true; done(); } };
      track(name);
      try {
        window.adBreak({ type: name === 'start' ? 'start' : 'next', name: name, adBreakDone: finish });
      } catch (e) { finish(); }
      setTimeout(finish, 15000); // segurança: nunca prende o jogador
    },
    // "Assista 1 anúncio e ganhe": onReward() se assistiu até o fim; onNone() se não houver anúncio.
    rewardedAvailable: function () { return Ads.on && ready; },
    rewarded: function (name, onReward, onNone) {
      if (!Ads.rewardedAvailable()) return onNone && onNone();
      var shown = false, rewarded = false;
      track('reward');
      window.adBreak({
        type: 'reward', name: name,
        beforeReward: function (showAdFn) { shown = true; showAdFn(); },
        adViewed: function () { rewarded = true; onReward(); },
        adDismissed: function () {},
        adBreakDone: function () { if (!shown && !rewarded && onNone) onNone(); }
      });
    },
    // Banner na tela inicial (só se o dono cadastrou um bloco de anúncio)
    banner: function () {
      if (!Ads.on || !cfg.slot) return '';
      return '<div class="adbox"><span class="adlabel">Publicidade · assinantes não veem anúncios</span>' +
        '<ins class="adsbygoogle" style="display:block" data-ad-client="' + cfg.client + '" data-ad-slot="' + String(cfg.slot).replace(/\D/g, '') + '"' +
        (cfg.test ? ' data-adtest="on"' : '') + ' data-ad-format="horizontal" data-full-width-responsive="true"></ins></div>';
    },
    fillBanners: function (root) {
      if (!Ads.on) return;
      (root || document).querySelectorAll('ins.adsbygoogle:not([data-filled])').forEach(function (el) {
        el.setAttribute('data-filled', '1');
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); track('banner'); } catch (e) {}
      });
    }
  };
  window.Ads = Ads;
})();

package com.acciolyplay.tv;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

/**
 * App Android TV do Accioly Play: abre o app web (servidor do dono) em tela cheia,
 * repassa o botão VOLTAR do controle remoto para o app e abre apps oficiais
 * (Globoplay, Pluto TV, YouTube...) quando o usuário escolhe um "link oficial".
 */
public class MainActivity extends Activity {

    /**
     * App da TV embutido no APK (copiado de app/ pelo workflow): abre sem servidor, em Modo Dono.
     * Servido por https (WebViewAssetLoader) para o player oficial do YouTube funcionar dentro do app.
     */
    static final String LOCAL_HOST = "appassets.androidplatform.net";
    static final String LOCAL_URL = "https://" + LOCAL_HOST + "/assets/app/index.html";

    private WebViewAssetLoader assets;

    private WebView web;
    private String base;
    private SharedPreferences prefs;
    private AdMobBridge ads;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        prefs = getSharedPreferences("accioly", MODE_PRIVATE);
        // Endereço fixo (APK para clientes) ou o que o dono digitou na primeira abertura
        base = BuildConfig.APP_URL;
        if (base == null || base.isEmpty()) base = prefs.getString("server", "");
        // Sem servidor: abre o app embutido, direto nos canais (Modo Dono)
        if (base.isEmpty()) base = LOCAL_URL;

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(7, 7, 12));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        assets = new WebViewAssetLoader.Builder()
                .setDomain(LOCAL_HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (LOCAL_HOST.equals(u.getHost()) && "/api/yt/resolve".equals(u.getPath())) {
                    return YtLive.response(u.getQueryParameter("channelId"));
                }
                return assets.shouldInterceptRequest(u);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Player do YouTube e outros iframes ficam dentro do app
                if (!request.isForMainFrame()) return false;
                if (sameSite(url)) return false;
                openExternal(url);
                return true;
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                if (failingUrl != null && !isLocal() && failingUrl.startsWith(base)) {
                    view.loadData(offlinePage(), "text/html; charset=utf-8", "UTF-8");
                }
            }
        });
        ads = new AdMobBridge(this, web);
        web.addJavascriptInterface(new Bridge(), "AndroidTV");
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        setContentView(web);
        web.requestFocus();

        if (state != null) web.restoreState(state);
        else web.loadUrl(base);
    }

    private boolean isLocal() {
        return LOCAL_URL.equals(base);
    }

    /** Modo Dono embutido só no APK universal. APK de cliente (APP_URL fixo) nunca libera. */
    private static boolean localAllowed() {
        return BuildConfig.APP_URL == null || BuildConfig.APP_URL.isEmpty();
    }

    /** Tela de primeira abertura: pede o endereço do servidor (aparece na janela do servidor no PC). */
    private void showSetup() {
        String last = prefs.getString("server", "");
        String html = "<html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head>"
                + "<body style='margin:0;background:#07070c;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'>"
                + "<div style='max-width:760px;padding:24px'><h1 style='margin:0 0 8px'>Accioly Play</h1>"
                + "<p style='color:#bbb;font-size:20px'>Digite o endereço do servidor. Ele aparece na janela do servidor no seu computador, na linha <b>\"Na TV (mesma rede Wi-Fi)\"</b>.</p>"
                + "<input id='u' type='url' value='" + (last.isEmpty() ? "http://192.168." : last) + "' style='width:100%;font-size:28px;padding:14px;border-radius:12px;border:2px solid #555;background:#111;color:#fff'>"
                + "<p><button id='b' style='font-size:26px;padding:14px 30px;border-radius:12px;border:0;background:#7c5cff;color:#fff'>Salvar e abrir</button></p>"
                + "<p style='color:#888'>Exemplo: http://192.168.0.15:3000/tv/</p>"
                + (localAllowed() ? "<p><button id='l' style='font-size:22px;padding:12px 26px;border-radius:12px;border:0;background:#333;color:#fff'>Usar sem servidor (Modo Dono)</button></p>" : "")
                + "</div>"
                + "<script>var u=document.getElementById('u'),b=document.getElementById('b'),l=document.getElementById('l');u.focus();"
                + "b.onclick=function(){AndroidTV.setServer(u.value)};if(l)l.onclick=function(){AndroidTV.useLocal()};"
                + "u.onkeydown=function(e){if(e.keyCode==13||e.keyCode==40){b.focus();e.preventDefault();}};"
                + "b.onkeydown=function(e){if(e.keyCode==40&&l){l.focus();e.preventDefault();}else if(e.keyCode==38){u.focus();e.preventDefault();}};"
                + "if(l)l.onkeydown=function(e){if(e.keyCode==38){b.focus();e.preventDefault();}};</script></body></html>";
        web.loadDataWithBaseURL("https://accioly.setup/", html, "text/html", "UTF-8", null);
    }

    private static String normalize(String url) {
        String u = url == null ? "" : url.trim();
        if (u.isEmpty()) return "";
        if (!u.startsWith("http://") && !u.startsWith("https://")) u = "http://" + u;
        Uri p = Uri.parse(u);
        String path = p.getPath() == null ? "" : p.getPath();
        if (path.isEmpty() || path.equals("/")) u = u.replaceAll("/+$", "") + "/tv/";
        return u;
    }

    private boolean sameSite(String url) {
        try {
            Uri a = Uri.parse(url), b = Uri.parse(base);
            return a.getHost() != null && a.getHost().equals(b.getHost());
        } catch (Exception e) {
            return false;
        }
    }

    private String offlinePage() {
        return "<html><body style='background:#07070c;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center'>"
                + "<div><h1>Sem conexão</h1><p>Verifique a internet da TV.</p>"
                + "<button autofocus onclick=\"location.href='" + base + "'\" style='font-size:24px;padding:14px 28px;border-radius:12px;border:0'>Tentar de novo</button> "
                + "<button onclick='AndroidTV.resetServer()' style='font-size:24px;padding:14px 28px;border-radius:12px;border:0'>Trocar servidor</button>"
                + "<p style='color:#888'>" + base + "</p></div></body></html>";
    }

    void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            Toast.makeText(this, "Instale o app oficial pela Play Store da TV.", Toast.LENGTH_LONG).show();
        }
    }

    void openApp(String pkg, String url) {
        PackageManager pm = getPackageManager();
        Intent i = null;
        if (pkg != null && !pkg.isEmpty()) {
            i = pm.getLeanbackLaunchIntentForPackage(pkg);
            if (i == null) i = pm.getLaunchIntentForPackage(pkg);
        }
        if (i != null) {
            startActivity(i);
            return;
        }
        if (pkg != null && !pkg.isEmpty()) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + pkg)));
                return;
            } catch (Exception ignored) {
            }
        }
        openExternal(url);
    }

    /** Disponível no JavaScript como window.AndroidTV */
    class Bridge {
        @JavascriptInterface
        public void openUrl(final String url) {
            runOnUiThread(() -> openExternal(url));
        }

        @JavascriptInterface
        public void openApp(final String pkg, final String url) {
            runOnUiThread(() -> MainActivity.this.openApp(pkg, url));
        }

        @JavascriptInterface
        public void setServer(final String url) {
            runOnUiThread(() -> {
                String u = normalize(url);
                if (u.isEmpty()) return;
                prefs.edit().putString("server", u).apply();
                base = u;
                web.loadUrl(u);
            });
        }

        // ---- Anúncios AdMob (usados por js/ads.js) ----
        @JavascriptInterface
        public void adsInit(final String interstitialUnit, final String rewardedUnit) {
            runOnUiThread(() -> ads.start(interstitialUnit, rewardedUnit));
        }

        @JavascriptInterface
        public boolean interstitialReady() {
            return ads.interstitialReady();
        }

        @JavascriptInterface
        public boolean rewardedReady() {
            return ads.rewardedReady();
        }

        @JavascriptInterface
        public void showInterstitial(final String callbackId) {
            runOnUiThread(() -> ads.showInterstitial(callbackId));
        }

        @JavascriptInterface
        public void showRewarded(final String callbackId) {
            runOnUiThread(() -> ads.showRewarded(callbackId));
        }

        @JavascriptInterface
        public void useLocal() {
            if (!localAllowed()) return;
            runOnUiThread(() -> {
                prefs.edit().remove("server").apply();
                base = LOCAL_URL;
                web.loadUrl(base);
            });
        }

        @JavascriptInterface
        public void resetServer() {
            runOnUiThread(MainActivity.this::showSetup);
        }
    }

    @Override
    public void onBackPressed() {
        // Pergunta ao app web se ele trata o VOLTAR (fechar player, jogo, menu...)
        // Na tela de configurar servidor (página de dados), VOLTAR retorna ao app embutido
        String atual = web.getUrl();
        if (atual == null || atual.startsWith("https://accioly.setup/") || atual.startsWith("data:")) {
            if (isLocal()) web.loadUrl(base); else finish();
            return;
        }
        web.evaluateJavascript("(window.__tvBack && window.__tvBack()) ? 'sim' : 'nao'", value -> {
            if (!"\"sim\"".equals(value)) finish(); // o app web é de página única
        });
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }
}

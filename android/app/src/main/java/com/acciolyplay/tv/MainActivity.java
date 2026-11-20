package com.acciolyplay.tv;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
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

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * App Android do Accioly Play (celular, Android TV, TV Box, Fire TV).
 * - Padrão: abre o app que vem DENTRO do APK (funciona sem servidor — modo dono).
 * - Opcional: conecta ao servidor do dono (contas, assinatura, painel).
 * Abre o app web em tela cheia,
 * repassa o botão VOLTAR do controle remoto para o app e abre apps oficiais
 * (Globoplay, Pluto TV, YouTube...) quando o usuário escolhe um "link oficial".
 */
public class MainActivity extends Activity {
    /** Voz do aparelho para "ouvir a notícia" (a WebView não tem voz própria). */
    private TextToSpeech tts;
    private boolean ttsReady = false;


    private WebView web;
    private String base;
    private SharedPreferences prefs;
    private AdMobBridge ads;
    private WebViewAssetLoader assets;
    private boolean inSetup = false;

    /** App web embutido no APK (copiado de ../app no build), servido num endereço https local. */
    static final String LOCAL_URL = "https://appassets.androidplatform.net/assets/app/index.html";

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        prefs = getSharedPreferences("accioly", MODE_PRIVATE);
        // Endereço fixo (APK para clientes) ou o que o dono digitou na primeira abertura
        base = BuildConfig.APP_URL;
        if (base == null || base.isEmpty()) base = prefs.getString("server", "local"); // padrão: app embutido
        if ("local".equals(base)) base = LOCAL_URL;
        assets = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(7, 7, 12));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assets.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (sameSite(url)) return false;
                openExternal(url);
                return true;
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                if (failingUrl != null && !base.isEmpty() && !base.equals(LOCAL_URL) && failingUrl.startsWith(base)) {
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

    /** Tela "Conectar": usar o app embutido neste aparelho ou conectar ao servidor do dono. */
    private void showSetup() {
        inSetup = true;
        String saved = prefs.getString("server", "");
        String last = "local".equals(saved) ? "" : saved;
        String html = "<html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head>"
                + "<body style='margin:0;background:#07070c;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'>"
                + "<div style='max-width:760px;padding:24px'><h1 style='margin:0 0 8px'>Accioly Play</h1>"
                + "<p><button id='l' style='font-size:24px;padding:14px 26px;border-radius:12px;border:0;background:#22c55e;color:#04210f;font-weight:bold'>▶ Usar neste aparelho (sem servidor)</button></p>"
                + "<p style='color:#bbb;font-size:20px'>Ou conecte ao seu servidor: digite o endereço que aparece na janela do servidor no computador, na linha <b>\"Na TV (mesma rede Wi-Fi)\"</b>.</p>"
                + "<input id='u' type='url' value='" + (last.isEmpty() ? "http://192.168." : last) + "' style='width:100%;font-size:28px;padding:14px;border-radius:12px;border:2px solid #555;background:#111;color:#fff'>"
                + "<p><button id='b' style='font-size:26px;padding:14px 30px;border-radius:12px;border:0;background:#7c5cff;color:#fff'>Salvar e abrir</button></p>"
                + "<p style='color:#888'>Exemplo: http://192.168.0.15:3000/tv/</p></div>"
                + "<script>var u=document.getElementById('u');u.focus();"
                + "document.getElementById('b').onclick=function(){AndroidTV.setServer(u.value)};"
                + "document.getElementById('l').onclick=function(){AndroidTV.useLocal()};"
                + "u.onkeydown=function(e){if(e.keyCode==13||e.keyCode==40){document.getElementById('b').focus();e.preventDefault();}};</script></body></html>";
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
                inSetup = false;
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

        /** Volta a usar o app embutido no APK (sem servidor). */
        @JavascriptInterface
        public void useLocal() {
            runOnUiThread(() -> {
                prefs.edit().putString("server", "local").apply();
                base = LOCAL_URL;
                inSetup = false;
                web.loadUrl(LOCAL_URL);
            });
        }

        @JavascriptInterface
        public boolean isLocal() {
            return LOCAL_URL.equals(base);
        }

        /**
         * Descobre o ID do canal oficial do YouTube pelo @handle e se está ao vivo agora,
         * direto do aparelho (sem servidor). Resposta: window.__ytNative(id, channelId, aoVivo).
         */
        @JavascriptInterface
        public void ytResolve(final String handle, final String callbackId) {
            new Thread(() -> {
                String channelId = null;
                boolean live = false;
                try {
                    if (handle != null && handle.matches("^@[\\w.\\-]{2,60}$")) {
                        String page = httpGet("https://www.youtube.com/" + handle);
                        channelId = find(page, "<link rel=\"canonical\" href=\"https://www\\.youtube\\.com/channel/(UC[\\w-]{22})\"");
                        if (channelId == null) channelId = find(page, "\"externalId\":\"(UC[\\w-]{22})\"");
                        if (channelId == null) channelId = find(page, "\"channelId\":\"(UC[\\w-]{22})\"");
                        if (channelId != null) {
                            String lp = httpGet("https://www.youtube.com/channel/" + channelId + "/live");
                            live = lp.contains("\"isLiveNow\":true") || lp.contains("hqdefault_live.jpg");
                        }
                    }
                } catch (Exception ignored) {
                }
                final String js = "window.__ytNative && window.__ytNative(" + JSONObject.quote(callbackId) + ","
                        + (channelId == null ? "null" : JSONObject.quote(channelId)) + "," + live + ")";
                runOnUiThread(() -> web.evaluateJavascript(js, null));
            }).start();
        }

        @JavascriptInterface
        public void resetServer() {
            runOnUiThread(MainActivity.this::showSetup);
        }

        // ---- Ouvir notícias (voz do Android, em português) ----
        @JavascriptInterface
        public boolean canSpeak() {
            return true;
        }

        @JavascriptInterface
        public void speak(final String text) {
            runOnUiThread(() -> {
                if (tts == null) {
                    tts = new TextToSpeech(MainActivity.this, status -> {
                        ttsReady = status == TextToSpeech.SUCCESS;
                        if (ttsReady) {
                            tts.setLanguage(new Locale("pt", "BR"));
                            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "noticia");
                        } else {
                            Toast.makeText(MainActivity.this, "Este aparelho não tem voz instalada.", Toast.LENGTH_LONG).show();
                        }
                    });
                } else if (ttsReady) {
                    tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "noticia");
                }
            });
        }

        @JavascriptInterface
        public void stopSpeak() {
            runOnUiThread(() -> { if (tts != null) tts.stop(); });
        }
    }

    @Override
    public void onBackPressed() {
        // Pergunta ao app web se ele trata o VOLTAR (fechar player, jogo, menu...)
        if (inSetup) { web.loadUrl(base); inSetup = false; return; }
        web.evaluateJavascript("(window.__tvBack && window.__tvBack()) ? 'sim' : 'nao'", value -> {
            if (!"\"sim\"".equals(value)) finish(); // o app web é de página única
        });
    }

    private static String httpGet(String address) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(address).openConnection();
        c.setConnectTimeout(10000);
        c.setReadTimeout(15000);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36");
        c.setRequestProperty("Accept-Language", "pt-BR,pt;q=0.9");
        c.setRequestProperty("Cookie", "CONSENT=YES+1");
        try (InputStream in = c.getInputStream()) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n, total = 0;
            while ((n = in.read(buf)) > 0 && total < 4_000_000) {
                out.write(buf, 0, n);
                total += n;
            }
            return out.toString("UTF-8");
        } finally {
            c.disconnect();
        }
    }

    private static String find(String text, String regex) {
        Matcher m = Pattern.compile(regex).matcher(text);
        return m.find() ? m.group(1) : null;
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (tts != null) tts.stop();
        web.onPause();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) tts.shutdown();
        super.onDestroy();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }
}

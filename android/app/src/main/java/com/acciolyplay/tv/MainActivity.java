package com.acciolyplay.tv;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/**
 * App Android TV do Accioly Play: abre o app web (servidor do dono) em tela cheia,
 * repassa o botão VOLTAR do controle remoto para o app e abre apps oficiais
 * (Globoplay, Pluto TV, YouTube...) quando o usuário escolhe um "link oficial".
 */
public class MainActivity extends Activity {

    private WebView web;
    private String base;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        base = BuildConfig.APP_URL;

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
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (sameSite(url)) return false;
                openExternal(url);
                return true;
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                if (failingUrl != null && failingUrl.startsWith(base)) {
                    view.loadData(offlinePage(), "text/html; charset=utf-8", "UTF-8");
                }
            }
        });
        web.addJavascriptInterface(new Bridge(), "AndroidTV");
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        setContentView(web);
        web.requestFocus();

        if (state != null) web.restoreState(state);
        else web.loadUrl(base);
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
                + "<button autofocus onclick=\"location.href='" + base + "'\" style='font-size:24px;padding:14px 28px;border-radius:12px;border:0'>Tentar de novo</button></div></body></html>";
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
    }

    @Override
    public void onBackPressed() {
        // Pergunta ao app web se ele trata o VOLTAR (fechar player, jogo, menu...)
        web.evaluateJavascript("(window.__tvBack && window.__tvBack()) ? 'sim' : 'nao'", value -> {
            if (!"\"sim\"".equals(value)) {
                if (web.canGoBack()) web.goBack();
                else finish();
            }
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

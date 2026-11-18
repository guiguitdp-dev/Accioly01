package com.acciolyplay.tv;

import android.app.Activity;
import android.webkit.WebView;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

import org.json.JSONObject;

/**
 * Anúncios AdMob nativos (tela cheia e recompensado), chamados pelo app web
 * através de window.AndroidTV. Só aparecem para quem não assina — quem decide
 * é o app web (js/ads.js), seguindo o Painel do Dono.
 *
 * Fluxo: consentimento (UMP — obrigatório na Europa; no Brasil normalmente passa
 * direto) → inicia o SDK → pré-carrega 1 anúncio de cada tipo → mostra quando
 * o app pedir → avisa o app web pelo callback Ads._native(id, resultado).
 */
class AdMobBridge {

    private final Activity activity;
    private final WebView web;
    private volatile InterstitialAd interstitial;
    private volatile RewardedAd rewarded;
    private String interstitialId = "";
    private String rewardedId = "";
    private volatile boolean sdkReady = false;
    private boolean started = false, loadingI = false, loadingR = false;

    AdMobBridge(Activity activity, WebView web) {
        this.activity = activity;
        this.web = web;
    }

    /** Chamado pelo app web com os IDs dos blocos de anúncio (do Painel do Dono). */
    void start(String interstitialUnit, String rewardedUnit) {
        interstitialId = interstitialUnit == null ? "" : interstitialUnit.trim();
        rewardedId = rewardedUnit == null ? "" : rewardedUnit.trim();
        if (started) {
            preload();
            return;
        }
        started = true;
        final ConsentInformation consent = UserMessagingPlatform.getConsentInformation(activity);
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();
        consent.requestConsentInfoUpdate(activity, params,
                () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, formError -> initSdk(consent)),
                requestError -> initSdk(consent));
    }

    private void initSdk(ConsentInformation consent) {
        if (!consent.canRequestAds()) return;
        MobileAds.initialize(activity, status -> {
            sdkReady = true;
            preload();
        });
    }

    private void preload() {
        if (!sdkReady) return;
        loadInterstitial();
        loadRewarded();
    }

    private void loadInterstitial() {
        if (interstitial != null || loadingI || interstitialId.isEmpty()) return;
        loadingI = true;
        InterstitialAd.load(activity, interstitialId, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override
            public void onAdLoaded(InterstitialAd ad) {
                interstitial = ad;
                loadingI = false;
            }

            @Override
            public void onAdFailedToLoad(LoadAdError error) {
                interstitial = null;
                loadingI = false;
            }
        });
    }

    private void loadRewarded() {
        if (rewarded != null || loadingR || rewardedId.isEmpty()) return;
        loadingR = true;
        RewardedAd.load(activity, rewardedId, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override
            public void onAdLoaded(RewardedAd ad) {
                rewarded = ad;
                loadingR = false;
            }

            @Override
            public void onAdFailedToLoad(LoadAdError error) {
                rewarded = null;
                loadingR = false;
            }
        });
    }

    boolean interstitialReady() {
        return interstitial != null;
    }

    boolean rewardedReady() {
        return rewarded != null;
    }

    void showInterstitial(final String callbackId) {
        InterstitialAd ad = interstitial;
        if (ad == null) {
            reply(callbackId, "none");
            loadInterstitial();
            return;
        }
        interstitial = null;
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                reply(callbackId, "done");
                loadInterstitial();
            }

            @Override
            public void onAdFailedToShowFullScreenContent(AdError error) {
                reply(callbackId, "none");
                loadInterstitial();
            }
        });
        ad.show(activity);
    }

    void showRewarded(final String callbackId) {
        RewardedAd ad = rewarded;
        if (ad == null) {
            reply(callbackId, "none");
            loadRewarded();
            return;
        }
        rewarded = null;
        final boolean[] earned = {false};
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                reply(callbackId, earned[0] ? "reward" : "dismissed");
                loadRewarded();
            }

            @Override
            public void onAdFailedToShowFullScreenContent(AdError error) {
                reply(callbackId, "none");
                loadRewarded();
            }
        });
        ad.show(activity, rewardItem -> earned[0] = true);
    }

    /** Devolve o resultado para o app web: Ads._native(id, "done" | "reward" | "dismissed" | "none"). */
    private void reply(String callbackId, String result) {
        final String js = "window.Ads && Ads._native(" + JSONObject.quote(callbackId) + "," + JSONObject.quote(result) + ")";
        activity.runOnUiThread(() -> web.evaluateJavascript(js, null));
    }
}

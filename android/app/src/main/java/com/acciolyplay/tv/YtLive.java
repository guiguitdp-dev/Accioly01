package com.acciolyplay.tv;

import android.webkit.WebResourceResponse;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Responde /api/yt/resolve dentro do APK (app embutido, sem servidor):
 * descobre o vídeo AO VIVO de agora do canal oficial do YouTube, para o app
 * tocar pelo player oficial (embed/VIDEO_ID). Mesma regra de server/lib/health.js.
 * Roda na thread de rede do WebView (shouldInterceptRequest), não na thread da tela.
 */
final class YtLive {
    private static final Pattern CANAL = Pattern.compile("^UC[\\w-]{22}$");
    private static final Pattern AO_VIVO = Pattern.compile("\"videoDetails\":\\{\"videoId\":\"([\\w-]{11})\"[^}]*?\"isLive\":true");
    private static final long CACHE_MS = 10 * 60 * 1000;
    private static final Map<String, Object[]> cache = new HashMap<>();

    private YtLive() {
    }

    static WebResourceResponse response(String channelId) {
        String json = resolve(channelId);
        WebResourceResponse r = new WebResourceResponse("application/json", "utf-8",
                new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8)));
        Map<String, String> h = new HashMap<>();
        h.put("Cache-Control", "no-cache");
        r.setResponseHeaders(h);
        return r;
    }

    private static synchronized String cached(String id) {
        Object[] c = cache.get(id);
        return c != null && System.currentTimeMillis() - (Long) c[0] < CACHE_MS ? (String) c[1] : null;
    }

    private static synchronized void store(String id, String json) {
        cache.put(id, new Object[]{System.currentTimeMillis(), json});
    }

    static String resolve(String channelId) {
        if (channelId == null || !CANAL.matcher(channelId).matches()) {
            return "{\"channelId\":null,\"live\":false,\"videoId\":null}";
        }
        String hit = cached(channelId);
        if (hit != null) return hit;
        String videoId = null;
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL("https://www.youtube.com/channel/" + channelId + "/live").openConnection();
            c.setConnectTimeout(8000);
            c.setReadTimeout(10000);
            c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 12; Smart TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36");
            c.setRequestProperty("Accept-Language", "pt-BR,pt;q=0.9");
            c.setRequestProperty("Cookie", "CONSENT=YES+1");
            InputStream in = c.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0 && out.size() < 4 * 1024 * 1024) out.write(buf, 0, n);
            in.close();
            String html = out.toString("UTF-8");
            Matcher m = AO_VIVO.matcher(html);
            if (m.find() && html.contains("\"playabilityStatus\":{\"status\":\"OK\"")) videoId = m.group(1);
        } catch (Exception e) {
            // Falhou a consulta: o app tenta o endereço live_stream do canal (não guarda no cache)
            return "{\"channelId\":\"" + channelId + "\",\"live\":true,\"videoId\":null}";
        } finally {
            if (c != null) c.disconnect();
        }
        String json = "{\"channelId\":\"" + channelId + "\",\"live\":" + (videoId != null)
                + ",\"videoId\":" + (videoId != null ? "\"" + videoId + "\"" : "null") + "}";
        store(channelId, json);
        return json;
    }
}

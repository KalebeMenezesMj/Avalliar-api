package com.avalliar.api.captacao;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import org.springframework.web.util.UriBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.function.Function;

/**
 * Cliente mínimo da Gmail API (REST), autenticado com refresh token OAuth do escopo gmail.readonly.
 * Credenciais vêm de GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET e GMAIL_REFRESH_TOKEN.
 */
@Component
public class GmailClient {

    public record Mensagem(String id, String remetente, String assunto, String corpo, Instant recebidoEm) {
    }

    private final RestClient http = RestClient.create();
    private final String clientId;
    private final String clientSecret;
    private final String refreshToken;
    private final String apiUrl;
    private final String tokenUrl;

    private String accessToken;
    private Instant accessTokenExpira = Instant.EPOCH;

    public GmailClient(
            @Value("${app.gmail.client-id:}") String clientId,
            @Value("${app.gmail.client-secret:}") String clientSecret,
            @Value("${app.gmail.refresh-token:}") String refreshToken,
            @Value("${app.gmail.api-url:https://gmail.googleapis.com/gmail/v1/users/me}") String apiUrl,
            @Value("${app.gmail.token-url:https://oauth2.googleapis.com/token}") String tokenUrl) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.refreshToken = refreshToken;
        this.apiUrl = apiUrl;
        this.tokenUrl = tokenUrl;
    }

    public boolean configurado() {
        return !clientId.isBlank() && !clientSecret.isBlank() && !refreshToken.isBlank();
    }

    public String enderecoDaConta() {
        return get("/profile").path("emailAddress").asText();
    }

    /** Ids das mensagens que atendem à busca do Gmail (ex.: "in:inbox newer_than:7d"), mais recentes primeiro. */
    public List<String> listarIds(String busca, int maximo) {
        List<String> ids = new ArrayList<>();
        String pagina = null;
        do {
            String pg = pagina;
            JsonNode resp = get(b -> {
                b.path("/messages").queryParam("q", busca).queryParam("maxResults", Math.min(maximo, 100));
                if (pg != null) {
                    b.queryParam("pageToken", pg);
                }
                return b.build();
            });
            resp.path("messages").forEach(m -> ids.add(m.path("id").asText()));
            pagina = resp.hasNonNull("nextPageToken") ? resp.get("nextPageToken").asText() : null;
        } while (pagina != null && ids.size() < maximo);
        return ids.size() > maximo ? ids.subList(0, maximo) : ids;
    }

    public Mensagem buscar(String id) {
        JsonNode msg = get(b -> b.path("/messages/{id}").queryParam("format", "full").build(id));
        JsonNode payload = msg.path("payload");
        String de = "";
        String assunto = "";
        for (JsonNode h : payload.path("headers")) {
            String nome = h.path("name").asText();
            if (nome.equalsIgnoreCase("From")) {
                de = h.path("value").asText();
            } else if (nome.equalsIgnoreCase("Subject")) {
                assunto = h.path("value").asText();
            }
        }
        String corpo = texto(payload, "text/plain");
        if (corpo == null) {
            String html = texto(payload, "text/html");
            corpo = html == null ? "" : html.replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ")
                    .replaceAll("<[^>]+>", " ").replace("&nbsp;", " ").replaceAll("[ \\t]+", " ").trim();
        }
        Instant recebido = Instant.ofEpochMilli(msg.path("internalDate").asLong(System.currentTimeMillis()));
        return new Mensagem(id, de, assunto, corpo, recebido);
    }

    private static String texto(JsonNode parte, String mime) {
        if (parte.path("mimeType").asText().equalsIgnoreCase(mime) && parte.path("body").hasNonNull("data")) {
            byte[] bytes = Base64.getUrlDecoder().decode(parte.path("body").path("data").asText());
            return new String(bytes, StandardCharsets.UTF_8);
        }
        for (JsonNode filha : parte.path("parts")) {
            String t = texto(filha, mime);
            if (t != null) {
                return t;
            }
        }
        return null;
    }

    private JsonNode get(String caminho) {
        return get(b -> b.path(caminho).build());
    }

    private JsonNode get(Function<UriBuilder, URI> uri) {
        return http.get()
                .uri(apiUrl, uri)
                .headers(h -> h.setBearerAuth(token()))
                .retrieve()
                .body(JsonNode.class);
    }

    private synchronized String token() {
        if (!configurado()) {
            throw new IllegalStateException(
                    "Gmail não configurado: defina GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET e GMAIL_REFRESH_TOKEN");
        }
        if (accessToken != null && Instant.now().isBefore(accessTokenExpira)) {
            return accessToken;
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("refresh_token", refreshToken);
        form.add("grant_type", "refresh_token");
        JsonNode resp = http.post()
                .uri(tokenUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(JsonNode.class);
        accessToken = resp.path("access_token").asText();
        accessTokenExpira = Instant.now().plusSeconds(resp.path("expires_in").asLong(3600) - 60);
        return accessToken;
    }
}

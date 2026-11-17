package com.avalliar.api.whatsapp;

import com.avalliar.api.whatsapp.dto.WhatsappStatusResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Conecta o WhatsApp pela Evolution API. A chave da API fica no servidor (secret),
 * nunca vai para o app.
 */
@Service
public class WhatsappService {

    private final RestTemplate http = new RestTemplate();
    private final String url;
    private final String chave;
    private final String instancia;

    public WhatsappService(@Value("${app.evolution.url:}") String url,
                           @Value("${app.evolution.api-key:}") String chave,
                           @Value("${app.evolution.instancia:avalliar}") String instancia) {
        this.url = url == null ? "" : url.replaceAll("/+$", "");
        this.chave = chave;
        this.instancia = instancia;
    }

    /** Estado atual da conexão. Se a instância ainda não existe, devolve NAO_CRIADA. */
    public WhatsappStatusResponse status() {
        garantirConfigurado();
        try {
            Map<?, ?> resposta = http.exchange(url + "/instance/connectionState/" + instancia,
                    org.springframework.http.HttpMethod.GET, cabecalhos(null), Map.class).getBody();
            return new WhatsappStatusResponse(estadoDe(resposta), null, null);
        } catch (HttpClientErrorException.NotFound e) {
            return new WhatsappStatusResponse("NAO_CRIADA", null, null);
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Evolution API indisponível");
        }
    }

    /**
     * Cria a instância se necessário e pede o QR code para conectar o WhatsApp.
     * O QR code expira em pouco tempo: o app deve pedir de novo se ele vencer.
     */
    public WhatsappStatusResponse conectar() {
        garantirConfigurado();
        try {
            Map<?, ?> conexao;
            try {
                conexao = buscarConexao();
            } catch (HttpClientErrorException.NotFound e) {
                criarInstancia();
                conexao = buscarConexao();
            }
            return new WhatsappStatusResponse(
                    estadoDe(conexao),
                    qrCodeDe(conexao),
                    texto(conexao.get("pairingCode")) != null ? texto(conexao.get("pairingCode")) : texto(conexao.get("code")));
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Não foi possível gerar o QR code: " + e.getMessage());
        }
    }

    private Map<?, ?> buscarConexao() {
        return http.exchange(url + "/instance/connect/" + instancia,
                org.springframework.http.HttpMethod.GET, cabecalhos(null), Map.class).getBody();
    }

    private void criarInstancia() {
        Map<String, Object> corpo = Map.of(
                "instanceName", instancia,
                "integration", "WHATSAPP-BAILEYS",
                "qrcode", true);
        http.exchange(url + "/instance/create", org.springframework.http.HttpMethod.POST,
                cabecalhos(corpo), Map.class);
    }

    private HttpEntity<Object> cabecalhos(Object corpo) {
        HttpHeaders h = new HttpHeaders();
        h.set("apikey", chave);
        h.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(corpo, h);
    }

    private void garantirConfigurado() {
        if (url.isBlank() || chave == null || chave.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "WhatsApp não configurado no servidor");
        }
    }

    private static String estadoDe(Map<?, ?> resposta) {
        if (resposta == null) return "DESCONHECIDO";
        Object instance = resposta.get("instance");
        if (instance instanceof Map<?, ?> m && m.get("state") != null) return String.valueOf(m.get("state"));
        if (resposta.get("state") != null) return String.valueOf(resposta.get("state"));
        return "DESCONHECIDO";
    }

    private static String qrCodeDe(Map<?, ?> resposta) {
        Object base64 = resposta == null ? null : resposta.get("base64");
        if (base64 == null) {
            Object qr = resposta == null ? null : resposta.get("qrcode");
            if (qr instanceof Map<?, ?> m) base64 = m.get("base64");
        }
        return texto(base64);
    }

    private static String texto(Object valor) {
        return valor == null || String.valueOf(valor).isBlank() ? null : String.valueOf(valor);
    }
}

package com.avalliar.api.laudo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Cliente HTTP do serviço de ML (FastAPI). Encaminha os dados da OS para o
 * módulo Python e devolve a planilha preenchida.
 */
@Service
public class MlClientService {

    private final RestTemplate restTemplate;
    private final String mlUrl;

    public MlClientService(@Value("${app.ml.url:http://localhost:8000}") String mlUrl) {
        this.restTemplate = new RestTemplate();
        this.mlUrl = mlUrl;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> preencher(String templateId, Map<String, Object> dados) {
        Map<String, Object> body = Map.of(
                "template_id", templateId,
                "dados", dados);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        return restTemplate.postForObject(mlUrl + "/preencher", request, Map.class);
    }
}

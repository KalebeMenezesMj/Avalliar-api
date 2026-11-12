package com.avalliar.api.laudo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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

    @SuppressWarnings("unchecked")
    public Map<String, Object> health() {
        return restTemplate.getForObject(mlUrl + "/health", Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> metricas(int n) {
        return restTemplate.getForObject(mlUrl + "/metricas?n=" + n, Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> consultar(String q, int k) {
        return restTemplate.getForObject(mlUrl + "/consultar?q={q}&k={k}", Map.class, q, k);
    }

    /** Preenche a própria planilha enviada pelo usuário (modelo reconhecido automaticamente). */
    @SuppressWarnings("unchecked")
    public Map<String, Object> preencherArquivo(MultipartFile file, String dadosJson) throws IOException {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", arquivo(file));
        body.add("dados", dadosJson == null || dadosJson.isBlank() ? "{}" : dadosJson);
        return restTemplate.postForObject(mlUrl + "/preencher-arquivo", multipart(body), Map.class);
    }

    /** Descobre se a planilha enviada é V22, V25 ou desconhecida. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> reconhecer(MultipartFile file) throws IOException {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", arquivo(file));
        return restTemplate.postForObject(mlUrl + "/reconhecer", multipart(body), Map.class);
    }

    /** Lê os campos já preenchidos de uma planilha (para pré-preencher o formulário). */
    @SuppressWarnings("unchecked")
    public Map<String, Object> extrair(String templateId, MultipartFile file) throws IOException {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", arquivo(file));
        return restTemplate.postForObject(
                mlUrl + "/extrair?template_id={t}", multipart(body), Map.class, templateId);
    }

    private static ByteArrayResource arquivo(MultipartFile file) throws IOException {
        String nome = file.getOriginalFilename() == null ? "planilha.xlsx" : file.getOriginalFilename();
        return new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return nome;
            }
        };
    }

    private static HttpEntity<MultiValueMap<String, Object>> multipart(MultiValueMap<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        return new HttpEntity<>(body, headers);
    }
}

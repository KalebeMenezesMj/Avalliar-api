package com.avalliar.api.laudo;

import com.avalliar.api.cub.CubService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Cliente HTTP do serviço de ML (FastAPI). Encaminha os dados da OS para o
 * módulo Python e devolve a planilha preenchida.
 */
@Service
public class MlClientService {

    /** UF das planilhas de laudo. O CUB do banco é de São Paulo. */
    private static final String UF_LAUDO = "SP";

    private final RestTemplate restTemplate;
    private final String mlUrl;
    private final CubService cubService;
    private final ObjectMapper json = new ObjectMapper();

    public MlClientService(@Value("${app.ml.url:http://localhost:8000}") String mlUrl,
                           CubService cubService) {
        this.restTemplate = new RestTemplate();
        this.mlUrl = mlUrl;
        this.cubService = cubService;
    }

    /** Preenche {@code cub} com o último CUB do banco quando o pedido não trouxe um. */
    private Map<String, Object> comCub(Map<String, Object> dados) {
        Map<String, Object> out = dados == null ? new LinkedHashMap<>() : new LinkedHashMap<>(dados);
        if (!out.containsKey("cub")) {
            Map<String, Object> cub = cubService.paraLaudo(UF_LAUDO);
            if (cub != null) {
                out.put("cub", cub);
            }
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> preencher(String templateId, Map<String, Object> dados) {
        Map<String, Object> body = Map.of(
                "template_id", templateId,
                "dados", comCub(dados));

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
        body.add("dados", dadosComCub(dadosJson));
        return restTemplate.postForObject(mlUrl + "/preencher-arquivo", multipart(body), Map.class);
    }

    @SuppressWarnings("unchecked")
    private String dadosComCub(String dadosJson) throws IOException {
        Map<String, Object> dados = dadosJson == null || dadosJson.isBlank()
                ? new LinkedHashMap<>()
                : json.readValue(dadosJson, Map.class);
        return json.writeValueAsString(comCub(dados));
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

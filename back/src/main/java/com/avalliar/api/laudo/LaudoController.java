package com.avalliar.api.laudo;

import com.avalliar.api.laudo.dto.LaudoRequest;
import com.avalliar.api.laudo.dto.PreencherLaudoRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/laudos")
@Tag(name = "Laudos", description = "Gestão de laudos e preenchimento de planilhas via ML")
public class LaudoController {

    private final LaudoService laudoService;
    private final MlClientService mlClientService;

    public LaudoController(LaudoService laudoService, MlClientService mlClientService) {
        this.laudoService = laudoService;
        this.mlClientService = mlClientService;
    }

    @PostMapping("/preencher")
    @Operation(summary = "Preenche uma planilha de homogeneização via ML")
    public Map<String, Object> preencher(@Valid @RequestBody PreencherLaudoRequest request) {
        return mlClientService.preencher(request.templateId(), request.dados());
    }

    @GetMapping("/ml/health")
    @Operation(summary = "Verifica status e modelos carregados no serviço de ML")
    public Map<String, Object> mlHealth() {
        return mlClientService.health();
    }

    @GetMapping("/ml/metricas")
    @Operation(summary = "Retorna histórico de métricas de avaliação do ML")
    public Map<String, Object> mlMetricas(@RequestParam(defaultValue = "5") int n) {
        return mlClientService.metricas(n);
    }

    @GetMapping("/ml/consultar")
    @Operation(summary = "Consulta o acervo técnico (RAG BM25: CUB/R8N e laudos anteriores)")
    public Map<String, Object> mlConsultar(
            @RequestParam String q,
            @RequestParam(defaultValue = "5") int k) {
        return mlClientService.consultar(q, k);
    }

    @PostMapping(value = "/preencher-arquivo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Preenche a planilha enviada (.xlsx/.xlsm) com os dados do formulário; o modelo V22/V25 é reconhecido automaticamente")
    public Map<String, Object> preencherArquivo(@RequestPart("file") MultipartFile file,
                                                @RequestParam(value = "dados", defaultValue = "{}") String dados)
            throws IOException {
        return mlClientService.preencherArquivo(file, dados);
    }

    @PostMapping(value = "/reconhecer", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Reconhece se a planilha enviada é V22 ou V25")
    public Map<String, Object> reconhecer(@RequestPart("file") MultipartFile file) throws IOException {
        return mlClientService.reconhecer(file);
    }

    @PostMapping(value = "/extrair", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Extrai os campos já preenchidos da planilha (para pré-preencher o formulário)")
    public Map<String, Object> extrair(@RequestParam("templateId") String templateId,
                                       @RequestPart("file") MultipartFile file) throws IOException {
        return mlClientService.extrair(templateId, file);
    }

    @GetMapping
    @Operation(summary = "Listar laudos")
    public List<Laudo> listar() {
        return laudoService.listar();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar laudo por id")
    public Laudo buscarPorId(@PathVariable Long id) {
        return laudoService.buscarPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cadastrar laudo")
    public Laudo criar(@Valid @RequestBody LaudoRequest request) {
        return laudoService.criar(request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar laudo")
    public Laudo atualizar(@PathVariable Long id, @Valid @RequestBody LaudoRequest request) {
        return laudoService.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Excluir laudo")
    public void excluir(@PathVariable Long id) {
        laudoService.excluir(id);
    }
}

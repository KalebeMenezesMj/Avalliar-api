package com.avalliar.api.relatorio;

import com.avalliar.api.relatorio.dto.RelatorioVistoriaResponse;
import com.avalliar.api.relatorio.dto.SalvarRelatorioRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;

@RestController
@RequestMapping("/api/ordens-servico/{osId}/relatorio")
@Tag(name = "Relatório de vistoria", description = "Dados e planilha do relatório salvos no banco por OS")
public class RelatorioVistoriaController {

    private final RelatorioVistoriaService service;

    public RelatorioVistoriaController(RelatorioVistoriaService service) {
        this.service = service;
    }

    @PostMapping
    @Operation(summary = "Salva ou atualiza o relatório da OS (dados e, opcionalmente, a planilha)")
    public RelatorioVistoriaResponse salvar(@PathVariable Long osId, @Valid @RequestBody SalvarRelatorioRequest req) {
        byte[] planilha = (req.planilhaBase64() == null || req.planilhaBase64().isBlank())
                ? null
                : decodificar(req.planilhaBase64());
        RelatorioVistoria relatorio = service.salvar(osId, req.dados(), req.planilhaNome(), planilha);
        return RelatorioVistoriaResponse.de(relatorio, service.lerDados(relatorio));
    }

    @GetMapping
    @Operation(summary = "Busca o relatório salvo da OS")
    public RelatorioVistoriaResponse buscar(@PathVariable Long osId) {
        RelatorioVistoria relatorio = service.buscar(osId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Relatório não encontrado para esta OS"));
        return RelatorioVistoriaResponse.de(relatorio, service.lerDados(relatorio));
    }

    @GetMapping("/planilha")
    @Operation(summary = "Baixa a planilha salva do relatório da OS")
    public ResponseEntity<byte[]> planilha(@PathVariable Long osId) {
        RelatorioVistoria relatorio = service.buscar(osId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Relatório não encontrado para esta OS"));
        byte[] conteudo = service.lerPlanilha(relatorio);
        String nome = relatorio.getPlanilhaNome() == null ? "planilha.xlsx" : relatorio.getPlanilhaNome();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(nome).build().toString())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(conteudo);
    }

    private static byte[] decodificar(String base64) {
        try {
            return Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Planilha em base64 inválida");
        }
    }
}

package com.avalliar.api.fotovistoria;

import com.avalliar.api.fotovistoria.dto.AtualizarFotoRequest;
import com.avalliar.api.fotovistoria.dto.FotoResponse;
import com.avalliar.api.vistoria.Vistoria;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
public class FotoVistoriaController {

    private final FotoVistoriaService service;

    public FotoVistoriaController(FotoVistoriaService service) {
        this.service = service;
    }

    @PostMapping(value = "/api/vistorias/{vistoriaId}/fotos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Envia uma foto da vistoria com o cômodo; a ordem é atribuída automaticamente")
    public FotoResponse enviar(@PathVariable Long vistoriaId,
                               @RequestParam ComodoFoto comodo,
                               @RequestPart("file") MultipartFile file) {
        return FotoResponse.de(service.enviar(vistoriaId, comodo, file));
    }

    @GetMapping("/api/vistorias/{vistoriaId}/fotos")
    @Operation(summary = "Lista as fotos da vistoria na ordem de envio")
    public List<FotoResponse> listar(@PathVariable Long vistoriaId) {
        return service.listar(vistoriaId).stream().map(FotoResponse::de).toList();
    }

    @PostMapping("/api/vistorias/{vistoriaId}/fotos/finalizar")
    @Operation(summary = "Finaliza o relatório fotográfico e libera para o ML")
    public Map<String, Object> finalizar(@PathVariable Long vistoriaId) {
        Vistoria v = service.finalizar(vistoriaId);
        return Map.of("vistoriaId", v.getId(), "finalizadoEm", v.getRelatorioFotograficoFinalizadoEm());
    }

    @GetMapping("/api/vistorias/{vistoriaId}/fotos/para-ml")
    @Operation(summary = "Fotos finalizadas, em ordem, com cômodo e URL do arquivo (uso do ML)")
    public List<FotoResponse> paraMl(@PathVariable Long vistoriaId) {
        return service.paraMl(vistoriaId).stream().map(FotoResponse::de).toList();
    }

    @GetMapping("/api/fotos/{fotoId}/arquivo")
    @Operation(summary = "Arquivo da foto (JPEG ou PNG)")
    public ResponseEntity<byte[]> arquivo(@PathVariable Long fotoId) {
        FotoVistoria foto = service.buscar(fotoId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, foto.getContentType())
                .body(service.conteudo(foto));
    }

    @PatchMapping("/api/fotos/{fotoId}")
    @Operation(summary = "Troca o cômodo da foto")
    public FotoResponse atualizar(@PathVariable Long fotoId, @Valid @RequestBody AtualizarFotoRequest request) {
        return FotoResponse.de(service.atualizarComodo(fotoId, request.comodo()));
    }

    @DeleteMapping("/api/fotos/{fotoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove a foto")
    public void remover(@PathVariable Long fotoId) {
        service.remover(fotoId);
    }
}

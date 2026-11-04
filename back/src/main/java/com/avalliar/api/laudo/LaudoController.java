package com.avalliar.api.laudo;

import com.avalliar.api.laudo.dto.LaudoRequest;
import com.avalliar.api.laudo.dto.PreencherLaudoRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

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

package com.avalliar.api.templateplanilha;

import com.avalliar.api.templateplanilha.dto.TemplatePlanilhaRequest;
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

@RestController
@RequestMapping("/api/templates-planilha")
@Tag(name = "Templates de Planilha", description = "Modelos de planilha por cliente (usados pelo ML)")
public class TemplatePlanilhaController {

    private final TemplatePlanilhaService service;

    public TemplatePlanilhaController(TemplatePlanilhaService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar templates de planilha")
    public List<TemplatePlanilha> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar template por id")
    public TemplatePlanilha buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cadastrar template de planilha")
    public TemplatePlanilha criar(@Valid @RequestBody TemplatePlanilhaRequest request) {
        return service.criar(request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar template de planilha")
    public TemplatePlanilha atualizar(@PathVariable Long id, @Valid @RequestBody TemplatePlanilhaRequest request) {
        return service.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Excluir template de planilha")
    public void excluir(@PathVariable Long id) {
        service.excluir(id);
    }
}

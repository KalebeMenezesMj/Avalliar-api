package com.avalliar.api.amostra;

import com.avalliar.api.amostra.dto.AmostraRequest;
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
@RequestMapping("/api/amostras")
@Tag(name = "Amostras", description = "Amostras de mercado usadas nas avaliações")
public class AmostraController {

    private final AmostraService service;

    public AmostraController(AmostraService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar amostras")
    public List<Amostra> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar amostra por id")
    public Amostra buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cadastrar amostra")
    public Amostra criar(@Valid @RequestBody AmostraRequest request) {
        return service.criar(request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar amostra")
    public Amostra atualizar(@PathVariable Long id, @Valid @RequestBody AmostraRequest request) {
        return service.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Excluir amostra")
    public void excluir(@PathVariable Long id) {
        service.excluir(id);
    }
}

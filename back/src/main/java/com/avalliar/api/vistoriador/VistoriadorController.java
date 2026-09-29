package com.avalliar.api.vistoriador;

import com.avalliar.api.vistoriador.dto.VistoriadorRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/vistoriadores")
@Tag(name = "Vistoriadores", description = "Gestão de vistoriadores (engenheiros)")
public class VistoriadorController {

    private final VistoriadorService service;

    public VistoriadorController(VistoriadorService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar vistoriadores")
    public List<Vistoriador> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar vistoriador por id")
    public Vistoriador buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cadastrar vistoriador")
    public Vistoriador criar(@Valid @RequestBody VistoriadorRequest request) {
        return service.criar(request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar vistoriador")
    public Vistoriador atualizar(@PathVariable Long id, @Valid @RequestBody VistoriadorRequest request) {
        return service.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Excluir vistoriador (somente ADMIN)")
    public void excluir(@PathVariable Long id) {
        service.excluir(id);
    }
}

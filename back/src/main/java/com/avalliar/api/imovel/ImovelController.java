package com.avalliar.api.imovel;

import com.avalliar.api.imovel.dto.ImovelRequest;
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
@RequestMapping("/api/imoveis")
@Tag(name = "Imóveis", description = "Gestão de imóveis vistoriados")
public class ImovelController {

    private final ImovelService service;

    public ImovelController(ImovelService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar imóveis")
    public List<Imovel> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar imóvel por id")
    public Imovel buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cadastrar imóvel")
    public Imovel criar(@Valid @RequestBody ImovelRequest request) {
        return service.criar(request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar imóvel")
    public Imovel atualizar(@PathVariable Long id, @Valid @RequestBody ImovelRequest request) {
        return service.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Excluir imóvel (somente ADMIN)")
    public void excluir(@PathVariable Long id) {
        service.excluir(id);
    }
}

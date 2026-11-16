package com.avalliar.api.cub;

import com.avalliar.api.cub.dto.CubIndiceRequest;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cub")
public class CubController {

    private final CubService service;

    public CubController(CubService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "CUB atual (R8N, sem desoneração) de uma UF")
    public CubIndice atual(@RequestParam(defaultValue = "SP") String uf) {
        return service.atual(uf).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Nenhum CUB lançado para " + uf));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Lança o CUB de um mês (substitui se já existir a competência)")
    public CubIndice lancar(@Valid @RequestBody CubIndiceRequest request) {
        return service.lancar(request);
    }
}

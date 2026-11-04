package com.avalliar.api.vistoria;

import com.avalliar.api.vistoria.dto.VistoriaRequest;
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
@RequestMapping("/api/vistorias")
@Tag(name = "Vistorias", description = "Agendamento e execução das vistorias")
public class VistoriaController {

    private final VistoriaService service;

    public VistoriaController(VistoriaService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar vistorias")
    public List<Vistoria> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar vistoria por id")
    public Vistoria buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cadastrar vistoria")
    public Vistoria criar(@Valid @RequestBody VistoriaRequest request) {
        return service.criar(request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar vistoria")
    public Vistoria atualizar(@PathVariable Long id, @Valid @RequestBody VistoriaRequest request) {
        return service.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Excluir vistoria")
    public void excluir(@PathVariable Long id) {
        service.excluir(id);
    }
}

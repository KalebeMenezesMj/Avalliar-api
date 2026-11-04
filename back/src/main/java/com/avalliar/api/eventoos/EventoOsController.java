package com.avalliar.api.eventoos;

import com.avalliar.api.eventoos.dto.EventoOsRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/eventos-os")
@Tag(name = "Eventos de OS", description = "Histórico de movimentações das ordens de serviço")
public class EventoOsController {

    private final EventoOsService service;

    public EventoOsController(EventoOsService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar todos os eventos")
    public List<EventoOs> listar() {
        return service.listar();
    }

    @GetMapping("/os/{osId}")
    @Operation(summary = "Listar eventos de uma ordem de serviço")
    public List<EventoOs> listarPorOs(@PathVariable Long osId) {
        return service.listarPorOs(osId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Registrar um evento (mudança de status)")
    public EventoOs criar(@Valid @RequestBody EventoOsRequest request) {
        return service.criar(request);
    }
}

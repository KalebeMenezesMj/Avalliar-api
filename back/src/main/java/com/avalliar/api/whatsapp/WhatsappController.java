package com.avalliar.api.whatsapp;

import com.avalliar.api.whatsapp.dto.WhatsappStatusResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/whatsapp")
@Tag(name = "WhatsApp", description = "Conexão do WhatsApp pela Evolution API")
public class WhatsappController {

    private final WhatsappService service;

    public WhatsappController(WhatsappService service) {
        this.service = service;
    }

    @GetMapping("/status")
    @Operation(summary = "Estado da conexão do WhatsApp")
    public WhatsappStatusResponse status() {
        return service.status();
    }

    @PostMapping("/conectar")
    @Operation(summary = "Gera o QR code para conectar o WhatsApp")
    public WhatsappStatusResponse conectar() {
        return service.conectar();
    }
}

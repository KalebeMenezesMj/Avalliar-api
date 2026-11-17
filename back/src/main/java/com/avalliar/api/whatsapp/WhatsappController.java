package com.avalliar.api.whatsapp;

import com.avalliar.api.whatsapp.dto.EnviarMensagemRequest;
import com.avalliar.api.whatsapp.dto.WhatsappStatusResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @PostMapping("/enviar")
    @Operation(summary = "Envia uma mensagem de texto pelo WhatsApp agora")
    public void enviar(@Valid @RequestBody EnviarMensagemRequest req) {
        service.enviarTexto(req.numero(), req.mensagem());
    }

    @PostMapping("/conectar")
    @Operation(summary = "Gera o QR code para conectar o WhatsApp")
    public WhatsappStatusResponse conectar() {
        return service.conectar();
    }
}

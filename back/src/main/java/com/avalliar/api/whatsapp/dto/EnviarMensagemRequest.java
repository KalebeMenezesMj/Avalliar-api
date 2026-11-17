package com.avalliar.api.whatsapp.dto;

import jakarta.validation.constraints.NotBlank;

public record EnviarMensagemRequest(
        @NotBlank(message = "Número é obrigatório")
        String numero,

        @NotBlank(message = "Mensagem é obrigatória")
        String mensagem
) {
}

package com.avalliar.api.laudo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record PreencherLaudoRequest(
        @NotBlank(message = "Template é obrigatório")
        String templateId,

        @NotNull(message = "Dados são obrigatórios")
        Map<String, Object> dados
) {
}

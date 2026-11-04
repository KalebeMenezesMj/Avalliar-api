package com.avalliar.api.templateplanilha.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TemplatePlanilhaRequest(
        @NotNull(message = "Cliente é obrigatório")
        Long clienteId,

        @NotBlank(message = "Nome é obrigatório")
        String nome,

        @NotBlank(message = "Template é obrigatório")
        String templateId,

        String versao,
        String formato
) {
}

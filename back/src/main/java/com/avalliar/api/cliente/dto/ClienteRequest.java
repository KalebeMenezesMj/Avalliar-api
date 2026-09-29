package com.avalliar.api.cliente.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ClienteRequest(
        @NotBlank(message = "CNPJ é obrigatório")
        @Size(max = 18, message = "CNPJ deve ter no máximo 18 caracteres")
        String cnpj,

        @NotBlank(message = "Razão social é obrigatória")
        String razaoSocial,

        @Positive(message = "SLA deve ser maior que zero")
        Integer slaPadraoHoras
) {
}

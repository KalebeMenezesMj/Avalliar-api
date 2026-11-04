package com.avalliar.api.eventoos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EventoOsRequest(
        @NotNull(message = "Ordem de serviço é obrigatória")
        Long ordemServicoId,

        String statusAnterior,

        @NotBlank(message = "Novo status é obrigatório")
        String statusNovo,

        String motivo,
        Long usuarioId
) {
}

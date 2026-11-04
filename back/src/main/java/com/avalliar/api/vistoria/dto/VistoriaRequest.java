package com.avalliar.api.vistoria.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record VistoriaRequest(
        @NotNull(message = "Ordem de serviço é obrigatória")
        Long ordemServicoId,

        @NotNull(message = "Vistoriador é obrigatório")
        Long vistoriadorId,

        Instant dataHoraEstimada,

        @NotBlank(message = "Status é obrigatório")
        String status,

        Instant realizadaEm,
        String motivoImprodutiva
) {
}

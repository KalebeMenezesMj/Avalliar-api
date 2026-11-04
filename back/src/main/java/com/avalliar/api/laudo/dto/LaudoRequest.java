package com.avalliar.api.laudo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LaudoRequest(
        @NotNull(message = "Ordem de serviço é obrigatória")
        Long ordemServicoId,

        Long avaliadorId,
        Long templatePlanilhaId,
        LocalDate dataBase,
        String metodologia,
        BigDecimal valorAvaliacao,
        String grauFundamentacao,

        @NotBlank(message = "Status é obrigatório")
        String status
) {
}

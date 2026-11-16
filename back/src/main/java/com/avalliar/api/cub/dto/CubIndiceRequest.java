package com.avalliar.api.cub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Lançamento do CUB de um mês. semDesoneracao nulo vale true. */
public record CubIndiceRequest(
        @NotBlank @Size(max = 2) String uf,
        @NotNull LocalDate competencia,
        @NotNull @Positive BigDecimal valor,
        @Size(max = 255) String fonte,
        Boolean semDesoneracao
) {
}

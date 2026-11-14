package com.avalliar.api.captacao.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Critérios são expressões regulares aplicadas ao remetente ("From") e ao assunto, sem diferenciar maiúsculas.
 * Ex.: criterioRemetente "@caixa\\.gov\\.br", criterioAssunto "ordem de servi[çc]o|\\bOS\\b".
 */
public record RegraCaptacaoRequest(
        @NotNull(message = "Cliente é obrigatório")
        Long clienteId,

        String criterioRemetente,
        String criterioAssunto,

        /** Padrão: hoje. */
        LocalDate vigenteDe,
        LocalDate vigenteAte
) {
}

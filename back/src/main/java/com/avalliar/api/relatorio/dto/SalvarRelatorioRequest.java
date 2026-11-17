package com.avalliar.api.relatorio.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

/**
 * Relatório enviado pelo app. {@code planilhaBase64} é opcional: se vier, substitui a planilha salva.
 */
public record SalvarRelatorioRequest(
        @NotNull(message = "Os dados do relatório são obrigatórios")
        Map<String, Object> dados,

        String planilhaNome,

        String planilhaBase64
) {
}

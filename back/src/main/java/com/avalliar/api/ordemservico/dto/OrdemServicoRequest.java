package com.avalliar.api.ordemservico.dto;

import com.avalliar.api.ordemservico.StatusOrdemServico;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record OrdemServicoRequest(
        @NotBlank(message = "Número da OS é obrigatório")
        String numeroOsCliente,

        @NotNull(message = "Cliente é obrigatório")
        Long clienteId,

        Long imovelId,

        Instant recebidaEm,
        Instant prazoEntrega,

        @NotNull(message = "Status é obrigatório")
        StatusOrdemServico status
) {
}

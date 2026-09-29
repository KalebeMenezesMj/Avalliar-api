package com.avalliar.api.vistoriador.dto;

import jakarta.validation.constraints.NotBlank;

public record VistoriadorRequest(
        @NotBlank(message = "Nome é obrigatório")
        String nome,

        String registroProfissional,
        Double baseLatitude,
        Double baseLongitude,
        Integer capacidadeDiaria,
        Boolean ativo
) {
}

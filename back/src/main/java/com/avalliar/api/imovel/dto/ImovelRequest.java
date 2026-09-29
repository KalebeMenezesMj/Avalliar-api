package com.avalliar.api.imovel.dto;

import jakarta.validation.constraints.NotBlank;

public record ImovelRequest(
        String cep,

        @NotBlank(message = "Logradouro é obrigatório")
        String logradouro,

        String numero,
        String bairro,

        @NotBlank(message = "Cidade é obrigatória")
        String cidade,

        String uf,
        Double latitude,
        Double longitude,
        String matricula,
        String tipologia
) {
}

package com.avalliar.api.cliente.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ClienteRequest(
        @Size(max = 18, message = "CNPJ deve ter no máximo 18 caracteres")
        String cnpj,

        @NotBlank(message = "Razão social é obrigatória")
        String razaoSocial,

        @Size(max = 150, message = "Nome fantasia deve ter no máximo 150 caracteres")
        String nomeFantasia,

        @Positive(message = "SLA deve ser maior que zero")
        Integer slaPadraoHoras,

        String nomeContato,

        @Email(message = "E-mail inválido")
        String email,

        String telefone,

        @Pattern(regexp = "^(\\d{5}-?\\d{3})?$", message = "CEP deve estar no formato 00000-000")
        String cep,

        String logradouro,

        String numero,

        String complemento,

        String bairro,

        String cidade,

        @Pattern(regexp = "^([A-Za-z]{2})?$", message = "UF deve ter 2 letras")
        String uf,

        Boolean ativo
) {
}

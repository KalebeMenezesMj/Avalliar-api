package com.avalliar.api.amostra.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record AmostraRequest(
        String fonte,
        String identificadorExterno,
        String url,
        Instant coletadoEm,
        String tipoNegocio,
        String natureza,
        BigDecimal valorTotal,
        BigDecimal areaTotal,
        Double latitude,
        Double longitude,
        String tipologia,
        String statusValidacao
) {
}

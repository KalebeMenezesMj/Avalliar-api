package com.avalliar.api.relatorio.dto;

import com.avalliar.api.relatorio.RelatorioVistoria;

import java.time.Instant;
import java.util.Map;

public record RelatorioVistoriaResponse(
        Long ordemServicoId,
        Map<String, Object> dados,
        boolean temPlanilha,
        String planilhaNome,
        Long planilhaTamanhoBytes,
        Instant atualizadoEm
) {
    public static RelatorioVistoriaResponse de(RelatorioVistoria r, Map<String, Object> dados) {
        return new RelatorioVistoriaResponse(
                r.getOrdemServico().getId(),
                dados,
                r.getPlanilhaCaminho() != null,
                r.getPlanilhaNome(),
                r.getPlanilhaTamanhoBytes(),
                r.getAtualizadoEm()
        );
    }
}

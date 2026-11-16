package com.avalliar.api.cub;

import com.avalliar.api.cub.dto.CubIndiceRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class CubService {

    public static final String PADRAO_LAUDO = "R8N";

    private final CubIndiceRepository repository;

    public CubService(CubIndiceRepository repository) {
        this.repository = repository;
    }

    /** Último CUB lançado para a UF, padrão R8N, sem desoneração. */
    public Optional<CubIndice> atual(String uf) {
        return repository.findFirstByUfAndPadraoAndSemDesoneracaoOrderByCompetenciaDesc(
                uf.toUpperCase(), PADRAO_LAUDO, true);
    }

    /**
     * Monta o bloco {@code cub} que o ML espera em {@code dados}, ou null se não houver valor.
     */
    public Map<String, Object> paraLaudo(String uf) {
        return atual(uf).map(c -> {
            String u = c.getUf();
            Map<String, Object> cub = new LinkedHashMap<>();
            cub.put("rotulo", "CUB/" + PADRAO_LAUDO + " - " + u);
            cub.put("referencia", c.getCompetencia().toString());
            cub.put("valores", Map.of(u, c.getValor()));
            cub.put("competencias", Map.of(u, c.getCompetencia().format(DateTimeFormatter.ofPattern("MM/yyyy"))));
            cub.put("fontes", Map.of(u, c.getFonte() == null ? "Sinduscon" : c.getFonte()));
            return cub;
        }).orElse(null);
    }

    /** Lança ou atualiza o CUB de um mês (mesma competência substitui o valor). */
    @Transactional
    public CubIndice lancar(CubIndiceRequest req) {
        String uf = req.uf().toUpperCase();
        boolean semDesoneracao = req.semDesoneracao() == null || req.semDesoneracao();
        CubIndice indice = repository
                .findByUfAndPadraoAndSemDesoneracaoAndCompetencia(uf, PADRAO_LAUDO, semDesoneracao, req.competencia())
                .orElseGet(() -> CubIndice.builder()
                        .uf(uf)
                        .padrao(PADRAO_LAUDO)
                        .semDesoneracao(semDesoneracao)
                        .competencia(req.competencia())
                        .criadoEm(Instant.now())
                        .build());
        indice.setValor(req.valor());
        indice.setFonte(req.fonte());
        return repository.save(indice);
    }
}

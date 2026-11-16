package com.avalliar.api.cub;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface CubIndiceRepository extends JpaRepository<CubIndice, Long> {

    Optional<CubIndice> findFirstByUfAndPadraoAndSemDesoneracaoOrderByCompetenciaDesc(
            String uf, String padrao, boolean semDesoneracao);

    Optional<CubIndice> findByUfAndPadraoAndSemDesoneracaoAndCompetencia(
            String uf, String padrao, boolean semDesoneracao, LocalDate competencia);
}

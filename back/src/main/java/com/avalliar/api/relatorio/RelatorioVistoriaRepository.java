package com.avalliar.api.relatorio;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RelatorioVistoriaRepository extends JpaRepository<RelatorioVistoria, Long> {

    Optional<RelatorioVistoria> findByOrdemServicoId(Long ordemServicoId);
}

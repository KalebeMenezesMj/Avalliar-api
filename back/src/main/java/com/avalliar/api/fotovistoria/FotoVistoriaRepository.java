package com.avalliar.api.fotovistoria;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FotoVistoriaRepository extends JpaRepository<FotoVistoria, Long> {

    List<FotoVistoria> findByVistoriaIdOrderByOrdemAsc(Long vistoriaId);

    Optional<FotoVistoria> findTopByVistoriaIdOrderByOrdemDesc(Long vistoriaId);
}

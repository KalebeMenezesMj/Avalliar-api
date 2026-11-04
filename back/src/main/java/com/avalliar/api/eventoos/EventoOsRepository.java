package com.avalliar.api.eventoos;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventoOsRepository extends JpaRepository<EventoOs, Long> {

    List<EventoOs> findByOrdemServicoIdOrderByOcorridoEmDesc(Long ordemServicoId);
}

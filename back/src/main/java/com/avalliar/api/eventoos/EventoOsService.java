package com.avalliar.api.eventoos;

import com.avalliar.api.common.exception.ResourceNotFoundException;
import com.avalliar.api.eventoos.dto.EventoOsRequest;
import com.avalliar.api.ordemservico.OrdemServico;
import com.avalliar.api.ordemservico.OrdemServicoRepository;
import com.avalliar.api.usuario.Usuario;
import com.avalliar.api.usuario.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class EventoOsService {

    private final EventoOsRepository repository;
    private final OrdemServicoRepository ordemServicoRepository;
    private final UsuarioRepository usuarioRepository;

    public EventoOsService(EventoOsRepository repository,
                           OrdemServicoRepository ordemServicoRepository,
                           UsuarioRepository usuarioRepository) {
        this.repository = repository;
        this.ordemServicoRepository = ordemServicoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public List<EventoOs> listar() {
        return repository.findAll();
    }

    public List<EventoOs> listarPorOs(Long ordemServicoId) {
        return repository.findByOrdemServicoIdOrderByOcorridoEmDesc(ordemServicoId);
    }

    public EventoOs criar(EventoOsRequest request) {
        OrdemServico os = ordemServicoRepository.findById(request.ordemServicoId())
                .orElseThrow(() -> new ResourceNotFoundException("Ordem de Serviço", request.ordemServicoId()));

        Usuario usuario = null;
        if (request.usuarioId() != null) {
            usuario = usuarioRepository.findById(request.usuarioId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário", request.usuarioId()));
        }

        EventoOs evento = EventoOs.builder()
                .ordemServico(os)
                .statusAnterior(request.statusAnterior())
                .statusNovo(request.statusNovo())
                .motivo(request.motivo())
                .usuario(usuario)
                .ocorridoEm(Instant.now())
                .build();
        return repository.save(evento);
    }
}

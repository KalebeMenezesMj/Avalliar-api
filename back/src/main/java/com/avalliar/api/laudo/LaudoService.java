package com.avalliar.api.laudo;

import com.avalliar.api.common.exception.ResourceNotFoundException;
import com.avalliar.api.laudo.dto.LaudoRequest;
import com.avalliar.api.ordemservico.OrdemServico;
import com.avalliar.api.ordemservico.OrdemServicoRepository;
import com.avalliar.api.templateplanilha.TemplatePlanilha;
import com.avalliar.api.templateplanilha.TemplatePlanilhaRepository;
import com.avalliar.api.usuario.Usuario;
import com.avalliar.api.usuario.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LaudoService {

    private final LaudoRepository repository;
    private final OrdemServicoRepository ordemServicoRepository;
    private final UsuarioRepository usuarioRepository;
    private final TemplatePlanilhaRepository templatePlanilhaRepository;

    public LaudoService(LaudoRepository repository,
                        OrdemServicoRepository ordemServicoRepository,
                        UsuarioRepository usuarioRepository,
                        TemplatePlanilhaRepository templatePlanilhaRepository) {
        this.repository = repository;
        this.ordemServicoRepository = ordemServicoRepository;
        this.usuarioRepository = usuarioRepository;
        this.templatePlanilhaRepository = templatePlanilhaRepository;
    }

    public List<Laudo> listar() {
        return repository.findAll();
    }

    public Laudo buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Laudo", id));
    }

    public Laudo criar(LaudoRequest request) {
        return repository.save(apply(new Laudo(), request));
    }

    public Laudo atualizar(Long id, LaudoRequest request) {
        return repository.save(apply(buscarPorId(id), request));
    }

    public void excluir(Long id) {
        repository.delete(buscarPorId(id));
    }

    private Laudo apply(Laudo laudo, LaudoRequest request) {
        laudo.setOrdemServico(ordemServicoRepository.findById(request.ordemServicoId())
                .orElseThrow(() -> new ResourceNotFoundException("Ordem de Serviço", request.ordemServicoId())));
        laudo.setAvaliador(buscarUsuario(request.avaliadorId()));
        laudo.setTemplatePlanilha(buscarTemplate(request.templatePlanilhaId()));
        laudo.setDataBase(request.dataBase());
        laudo.setMetodologia(request.metodologia());
        laudo.setValorAvaliacao(request.valorAvaliacao());
        laudo.setGrauFundamentacao(request.grauFundamentacao());
        laudo.setStatus(request.status());
        return laudo;
    }

    private Usuario buscarUsuario(Long id) {
        if (id == null) {
            return null;
        }
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));
    }

    private TemplatePlanilha buscarTemplate(Long id) {
        if (id == null) {
            return null;
        }
        return templatePlanilhaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template de planilha", id));
    }
}

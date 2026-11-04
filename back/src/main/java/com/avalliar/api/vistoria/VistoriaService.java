package com.avalliar.api.vistoria;

import com.avalliar.api.common.exception.ResourceNotFoundException;
import com.avalliar.api.ordemservico.OrdemServico;
import com.avalliar.api.ordemservico.OrdemServicoRepository;
import com.avalliar.api.vistoria.dto.VistoriaRequest;
import com.avalliar.api.vistoriador.Vistoriador;
import com.avalliar.api.vistoriador.VistoriadorRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VistoriaService {

    private final VistoriaRepository repository;
    private final OrdemServicoRepository ordemServicoRepository;
    private final VistoriadorRepository vistoriadorRepository;

    public VistoriaService(VistoriaRepository repository,
                           OrdemServicoRepository ordemServicoRepository,
                           VistoriadorRepository vistoriadorRepository) {
        this.repository = repository;
        this.ordemServicoRepository = ordemServicoRepository;
        this.vistoriadorRepository = vistoriadorRepository;
    }

    public List<Vistoria> listar() {
        return repository.findAll();
    }

    public Vistoria buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vistoria", id));
    }

    public Vistoria criar(VistoriaRequest request) {
        Vistoria v = Vistoria.builder()
                .ordemServico(buscarOs(request.ordemServicoId()))
                .vistoriador(buscarVistoriador(request.vistoriadorId()))
                .dataHoraEstimada(request.dataHoraEstimada())
                .status(request.status())
                .realizadaEm(request.realizadaEm())
                .motivoImprodutiva(request.motivoImprodutiva())
                .build();
        return repository.save(v);
    }

    public Vistoria atualizar(Long id, VistoriaRequest request) {
        Vistoria v = buscarPorId(id);
        v.setOrdemServico(buscarOs(request.ordemServicoId()));
        v.setVistoriador(buscarVistoriador(request.vistoriadorId()));
        v.setDataHoraEstimada(request.dataHoraEstimada());
        v.setStatus(request.status());
        v.setRealizadaEm(request.realizadaEm());
        v.setMotivoImprodutiva(request.motivoImprodutiva());
        return repository.save(v);
    }

    public void excluir(Long id) {
        repository.delete(buscarPorId(id));
    }

    private OrdemServico buscarOs(Long id) {
        return ordemServicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ordem de Serviço", id));
    }

    private Vistoriador buscarVistoriador(Long id) {
        return vistoriadorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vistoriador", id));
    }
}

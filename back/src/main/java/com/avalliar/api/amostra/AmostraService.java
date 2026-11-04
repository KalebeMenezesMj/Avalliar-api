package com.avalliar.api.amostra;

import com.avalliar.api.amostra.dto.AmostraRequest;
import com.avalliar.api.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class AmostraService {

    private final AmostraRepository repository;

    public AmostraService(AmostraRepository repository) {
        this.repository = repository;
    }

    public List<Amostra> listar() {
        return repository.findAll();
    }

    public Amostra buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Amostra", id));
    }

    public Amostra criar(AmostraRequest request) {
        return repository.save(toEntity(new Amostra(), request));
    }

    public Amostra atualizar(Long id, AmostraRequest request) {
        return repository.save(toEntity(buscarPorId(id), request));
    }

    public void excluir(Long id) {
        repository.delete(buscarPorId(id));
    }

    private Amostra toEntity(Amostra a, AmostraRequest request) {
        a.setFonte(request.fonte());
        a.setIdentificadorExterno(request.identificadorExterno());
        a.setUrl(request.url());
        a.setColetadoEm(request.coletadoEm() != null ? request.coletadoEm() : Instant.now());
        a.setTipoNegocio(request.tipoNegocio());
        a.setNatureza(request.natureza());
        a.setValorTotal(request.valorTotal());
        a.setAreaTotal(request.areaTotal());
        a.setLatitude(request.latitude());
        a.setLongitude(request.longitude());
        a.setTipologia(request.tipologia());
        a.setStatusValidacao(request.statusValidacao());
        return a;
    }
}

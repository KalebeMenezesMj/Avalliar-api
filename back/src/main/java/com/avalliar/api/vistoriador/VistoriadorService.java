package com.avalliar.api.vistoriador;

import com.avalliar.api.common.exception.ResourceNotFoundException;
import com.avalliar.api.vistoriador.dto.VistoriadorRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VistoriadorService {

    private final VistoriadorRepository repository;

    public VistoriadorService(VistoriadorRepository repository) {
        this.repository = repository;
    }

    public List<Vistoriador> listar() {
        return repository.findAll();
    }

    public Vistoriador buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vistoriador", id));
    }

    public Vistoriador criar(VistoriadorRequest request) {
        return repository.save(toEntity(new Vistoriador(), request));
    }

    public Vistoriador atualizar(Long id, VistoriadorRequest request) {
        return repository.save(toEntity(buscarPorId(id), request));
    }

    public void excluir(Long id) {
        repository.delete(buscarPorId(id));
    }

    private Vistoriador toEntity(Vistoriador vistoriador, VistoriadorRequest request) {
        vistoriador.setNome(request.nome());
        vistoriador.setRegistroProfissional(request.registroProfissional());
        vistoriador.setBaseLatitude(request.baseLatitude());
        vistoriador.setBaseLongitude(request.baseLongitude());
        vistoriador.setCapacidadeDiaria(request.capacidadeDiaria());
        vistoriador.setAtivo(request.ativo() != null ? request.ativo() : Boolean.TRUE);
        return vistoriador;
    }
}

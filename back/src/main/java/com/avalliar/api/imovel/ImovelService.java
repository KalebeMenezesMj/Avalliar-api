package com.avalliar.api.imovel;

import com.avalliar.api.common.exception.ResourceNotFoundException;
import com.avalliar.api.imovel.dto.ImovelRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ImovelService {

    private final ImovelRepository repository;

    public ImovelService(ImovelRepository repository) {
        this.repository = repository;
    }

    public List<Imovel> listar() {
        return repository.findAll();
    }

    public Imovel buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Imóvel", id));
    }

    public Imovel criar(ImovelRequest request) {
        return repository.save(toEntity(new Imovel(), request));
    }

    public Imovel atualizar(Long id, ImovelRequest request) {
        return repository.save(toEntity(buscarPorId(id), request));
    }

    public void excluir(Long id) {
        repository.delete(buscarPorId(id));
    }

    private Imovel toEntity(Imovel imovel, ImovelRequest request) {
        imovel.setCep(request.cep());
        imovel.setLogradouro(request.logradouro());
        imovel.setNumero(request.numero());
        imovel.setBairro(request.bairro());
        imovel.setCidade(request.cidade());
        imovel.setUf(request.uf());
        imovel.setLatitude(request.latitude());
        imovel.setLongitude(request.longitude());
        imovel.setMatricula(request.matricula());
        imovel.setTipologia(request.tipologia());
        return imovel;
    }
}

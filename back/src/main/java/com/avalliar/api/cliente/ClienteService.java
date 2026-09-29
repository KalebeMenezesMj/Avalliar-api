package com.avalliar.api.cliente;

import com.avalliar.api.cliente.dto.ClienteRequest;
import com.avalliar.api.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ClienteService {

    private final ClienteRepository repository;

    public ClienteService(ClienteRepository repository) {
        this.repository = repository;
    }

    public List<Cliente> listar() {
        return repository.findAll();
    }

    public Cliente buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));
    }

    public Cliente criar(ClienteRequest request) {
        Cliente cliente = Cliente.builder()
                .cnpj(request.cnpj())
                .razaoSocial(request.razaoSocial())
                .slaPadraoHoras(request.slaPadraoHoras())
                .build();
        return repository.save(cliente);
    }

    public Cliente atualizar(Long id, ClienteRequest request) {
        Cliente cliente = buscarPorId(id);
        cliente.setCnpj(request.cnpj());
        cliente.setRazaoSocial(request.razaoSocial());
        cliente.setSlaPadraoHoras(request.slaPadraoHoras());
        return repository.save(cliente);
    }

    public void excluir(Long id) {
        repository.delete(buscarPorId(id));
    }
}

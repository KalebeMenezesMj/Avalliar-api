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
        Integer sla = (request.slaPadraoHoras() != null && request.slaPadraoHoras() > 0)
                ? request.slaPadraoHoras()
                : 48;

        Boolean ativo = request.ativo() != null ? request.ativo() : true;

        Cliente cliente = Cliente.builder()
                .cnpj(request.cnpj())
                .razaoSocial(request.razaoSocial())
                .slaPadraoHoras(sla)
                .nomeContato(request.nomeContato())
                .email(request.email())
                .telefone(request.telefone())
                .ativo(ativo)
                .build();

        return repository.save(cliente);
    }

    public Cliente atualizar(Long id, ClienteRequest request) {
        Cliente cliente = buscarPorId(id);
        if (request.cnpj() != null) {
            cliente.setCnpj(request.cnpj());
        }
        cliente.setRazaoSocial(request.razaoSocial());
        if (request.slaPadraoHoras() != null && request.slaPadraoHoras() > 0) {
            cliente.setSlaPadraoHoras(request.slaPadraoHoras());
        }
        if (request.nomeContato() != null) {
            cliente.setNomeContato(request.nomeContato());
        }
        if (request.email() != null) {
            cliente.setEmail(request.email());
        }
        if (request.telefone() != null) {
            cliente.setTelefone(request.telefone());
        }
        if (request.ativo() != null) {
            cliente.setAtivo(request.ativo());
        }
        return repository.save(cliente);
    }

    public void excluir(Long id) {
        repository.delete(buscarPorId(id));
    }
}

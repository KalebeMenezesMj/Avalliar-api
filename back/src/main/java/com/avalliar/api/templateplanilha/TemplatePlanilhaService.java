package com.avalliar.api.templateplanilha;

import com.avalliar.api.cliente.Cliente;
import com.avalliar.api.cliente.ClienteRepository;
import com.avalliar.api.common.exception.ResourceNotFoundException;
import com.avalliar.api.templateplanilha.dto.TemplatePlanilhaRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TemplatePlanilhaService {

    private final TemplatePlanilhaRepository repository;
    private final ClienteRepository clienteRepository;

    public TemplatePlanilhaService(TemplatePlanilhaRepository repository, ClienteRepository clienteRepository) {
        this.repository = repository;
        this.clienteRepository = clienteRepository;
    }

    public List<TemplatePlanilha> listar() {
        return repository.findAll();
    }

    public TemplatePlanilha buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template de planilha", id));
    }

    public TemplatePlanilha criar(TemplatePlanilhaRequest request) {
        TemplatePlanilha t = TemplatePlanilha.builder()
                .cliente(buscarCliente(request.clienteId()))
                .nome(request.nome())
                .templateId(request.templateId())
                .versao(request.versao())
                .formato(request.formato())
                .build();
        return repository.save(t);
    }

    public TemplatePlanilha atualizar(Long id, TemplatePlanilhaRequest request) {
        TemplatePlanilha t = buscarPorId(id);
        t.setCliente(buscarCliente(request.clienteId()));
        t.setNome(request.nome());
        t.setTemplateId(request.templateId());
        t.setVersao(request.versao());
        t.setFormato(request.formato());
        return repository.save(t);
    }

    public void excluir(Long id) {
        repository.delete(buscarPorId(id));
    }

    private Cliente buscarCliente(Long id) {
        return clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));
    }
}

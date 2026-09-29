package com.avalliar.api.ordemservico;

import com.avalliar.api.cliente.Cliente;
import com.avalliar.api.cliente.ClienteRepository;
import com.avalliar.api.common.exception.ResourceNotFoundException;
import com.avalliar.api.imovel.Imovel;
import com.avalliar.api.imovel.ImovelRepository;
import com.avalliar.api.ordemservico.dto.OrdemServicoRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class OrdemServicoService {

    private final OrdemServicoRepository repository;
    private final ClienteRepository clienteRepository;
    private final ImovelRepository imovelRepository;

    public OrdemServicoService(
            OrdemServicoRepository repository,
            ClienteRepository clienteRepository,
            ImovelRepository imovelRepository) {
        this.repository = repository;
        this.clienteRepository = clienteRepository;
        this.imovelRepository = imovelRepository;
    }

    public List<OrdemServico> listar() {
        return repository.findAll();
    }

    public OrdemServico buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ordem de Serviço", id));
    }

    public OrdemServico criar(OrdemServicoRequest request) {
        OrdemServico os = OrdemServico.builder()
                .numeroOsCliente(request.numeroOsCliente())
                .cliente(buscarCliente(request.clienteId()))
                .imovel(buscarImovel(request.imovelId()))
                .recebidaEm(request.recebidaEm() != null ? request.recebidaEm() : Instant.now())
                .prazoEntrega(request.prazoEntrega())
                .status(request.status())
                .build();
        return repository.save(os);
    }

    public OrdemServico atualizar(Long id, OrdemServicoRequest request) {
        OrdemServico os = buscarPorId(id);
        os.setNumeroOsCliente(request.numeroOsCliente());
        os.setCliente(buscarCliente(request.clienteId()));
        os.setImovel(buscarImovel(request.imovelId()));
        os.setPrazoEntrega(request.prazoEntrega());
        os.setStatus(request.status());
        return repository.save(os);
    }

    public void excluir(Long id) {
        repository.delete(buscarPorId(id));
    }

    private Cliente buscarCliente(Long id) {
        return clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));
    }

    private Imovel buscarImovel(Long id) {
        if (id == null) {
            return null;
        }
        return imovelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Imóvel", id));
    }
}

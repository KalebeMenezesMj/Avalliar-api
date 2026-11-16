package com.avalliar.api.cliente;

import com.avalliar.api.cliente.dto.ClienteRequest;
import com.avalliar.api.common.exception.ResourceNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
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
        String cnpj = normalizarCnpj(request.cnpj());

        if (cnpj != null && repository.findFirstByCnpj(cnpj).isPresent()) {
            throw new IllegalArgumentException("Já existe uma empresa cadastrada com este CNPJ");
        }
        if (repository.existsByRazaoSocialIgnoreCase(request.razaoSocial().trim())) {
            throw new IllegalArgumentException("Já existe uma empresa cadastrada com esta razão social");
        }

        Integer sla = (request.slaPadraoHoras() != null && request.slaPadraoHoras() > 0)
                ? request.slaPadraoHoras()
                : 48;

        Boolean ativo = request.ativo() != null ? request.ativo() : true;

        Cliente cliente = Cliente.builder()
                .cnpj(cnpj)
                .razaoSocial(request.razaoSocial().trim())
                .nomeFantasia(vazioParaNulo(request.nomeFantasia()))
                .slaPadraoHoras(sla)
                .nomeContato(vazioParaNulo(request.nomeContato()))
                .email(vazioParaNulo(request.email()))
                .telefone(vazioParaNulo(request.telefone()))
                .cep(normalizarCep(request.cep()))
                .logradouro(vazioParaNulo(request.logradouro()))
                .numero(vazioParaNulo(request.numero()))
                .complemento(vazioParaNulo(request.complemento()))
                .bairro(vazioParaNulo(request.bairro()))
                .cidade(vazioParaNulo(request.cidade()))
                .uf(normalizarUf(request.uf()))
                .ativo(ativo)
                .build();

        return repository.save(cliente);
    }

    public Cliente atualizar(Long id, ClienteRequest request) {
        Cliente cliente = buscarPorId(id);

        String novoCnpj = normalizarCnpj(request.cnpj());
        if (request.cnpj() != null && novoCnpj != null && !novoCnpj.equals(cliente.getCnpj())
                && repository.findFirstByCnpj(novoCnpj).filter(c -> !c.getId().equals(id)).isPresent()) {
            throw new IllegalArgumentException("Já existe uma empresa cadastrada com este CNPJ");
        }
        String novaRazao = request.razaoSocial().trim();
        if (!novaRazao.equalsIgnoreCase(cliente.getRazaoSocial())
                && repository.existsByRazaoSocialIgnoreCase(novaRazao)) {
            throw new IllegalArgumentException("Já existe uma empresa cadastrada com esta razão social");
        }

        if (request.cnpj() != null) {
            cliente.setCnpj(novoCnpj);
        }
        cliente.setRazaoSocial(novaRazao);
        if (request.nomeFantasia() != null) {
            cliente.setNomeFantasia(vazioParaNulo(request.nomeFantasia()));
        }
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
        if (request.cep() != null) {
            cliente.setCep(normalizarCep(request.cep()));
        }
        if (request.logradouro() != null) {
            cliente.setLogradouro(request.logradouro());
        }
        if (request.numero() != null) {
            cliente.setNumero(request.numero());
        }
        if (request.complemento() != null) {
            cliente.setComplemento(request.complemento());
        }
        if (request.bairro() != null) {
            cliente.setBairro(request.bairro());
        }
        if (request.cidade() != null) {
            cliente.setCidade(request.cidade());
        }
        if (request.uf() != null) {
            cliente.setUf(normalizarUf(request.uf()));
        }
        if (request.ativo() != null) {
            cliente.setAtivo(request.ativo());
        }
        return repository.save(cliente);
    }

    public void excluir(Long id) {
        Cliente cliente = buscarPorId(id);
        try {
            repository.delete(cliente);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException(
                    "Esta empresa tem ordens de serviço, laudos ou planilhas vinculados e não pode ser excluída. "
                            + "Marque-a como Finalizado / Inativo.");
        }
    }

    /** CNPJ aceito com ou sem pontuação (inclui o formato alfanumérico de 2026): guarda só os 14 caracteres. */
    static String normalizarCnpj(String cnpj) {
        if (cnpj == null || cnpj.isBlank()) {
            return null;
        }
        String limpo = cnpj.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        if (limpo.length() != 14) {
            throw new IllegalArgumentException("CNPJ deve ter 14 caracteres (sem pontuação)");
        }
        return limpo;
    }

    static String normalizarCep(String cep) {
        if (cep == null || cep.isBlank()) {
            return null;
        }
        return cep.replaceAll("\\D", "");
    }

    static String normalizarUf(String uf) {
        return (uf == null || uf.isBlank()) ? null : uf.trim().toUpperCase();
    }

    private static String vazioParaNulo(String valor) {
        return (valor == null || valor.isBlank()) ? null : valor.trim();
    }
}

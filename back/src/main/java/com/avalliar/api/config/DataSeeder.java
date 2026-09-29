package com.avalliar.api.config;

import com.avalliar.api.cliente.Cliente;
import com.avalliar.api.cliente.ClienteRepository;
import com.avalliar.api.imovel.Imovel;
import com.avalliar.api.imovel.ImovelRepository;
import com.avalliar.api.ordemservico.OrdemServico;
import com.avalliar.api.ordemservico.OrdemServicoRepository;
import com.avalliar.api.ordemservico.StatusOrdemServico;
import com.avalliar.api.usuario.Role;
import com.avalliar.api.usuario.Usuario;
import com.avalliar.api.usuario.UsuarioRepository;
import com.avalliar.api.vistoriador.Vistoriador;
import com.avalliar.api.vistoriador.VistoriadorRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final ImovelRepository imovelRepository;
    private final VistoriadorRepository vistoriadorRepository;
    private final OrdemServicoRepository ordemServicoRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(
            UsuarioRepository usuarioRepository,
            ClienteRepository clienteRepository,
            ImovelRepository imovelRepository,
            VistoriadorRepository vistoriadorRepository,
            OrdemServicoRepository ordemServicoRepository,
            PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.clienteRepository = clienteRepository;
        this.imovelRepository = imovelRepository;
        this.vistoriadorRepository = vistoriadorRepository;
        this.ordemServicoRepository = ordemServicoRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (usuarioRepository.count() > 0) {
            return;
        }

        seedUsuarios();
        seedDadosOperacionais();
    }

    private void seedUsuarios() {
        usuarioRepository.save(Usuario.builder()
                .nome("Administrador")
                .email("admin@avalliar.com")
                .senha(passwordEncoder.encode("admin123"))
                .role(Role.ADMIN)
                .build());
        usuarioRepository.save(Usuario.builder()
                .nome("Avaliador Exemplo")
                .email("avaliador@avalliar.com")
                .senha(passwordEncoder.encode("avaliar123"))
                .role(Role.AVALIADOR)
                .build());
    }

    private void seedDadosOperacionais() {
        Cliente banco = clienteRepository.save(Cliente.builder()
                .cnpj("12.345.678/0001-90")
                .razaoSocial("Banco Exemplo S.A.")
                .slaPadraoHoras(48)
                .build());
        clienteRepository.save(Cliente.builder()
                .cnpj("98.765.432/0001-11")
                .razaoSocial("Financeira Horizonte Ltda.")
                .slaPadraoHoras(72)
                .build());

        Imovel apto = imovelRepository.save(Imovel.builder()
                .cep("11700-000")
                .logradouro("Rua das Palmeiras")
                .numero("123")
                .bairro("Boqueirão")
                .cidade("Praia Grande")
                .uf("SP")
                .latitude(-24.0071)
                .longitude(-46.4125)
                .tipologia("Apartamento")
                .build());
        imovelRepository.save(Imovel.builder()
                .cep("11702-610")
                .logradouro("Av. Presidente Kennedy")
                .numero("4500")
                .bairro("Guilhermina")
                .cidade("Praia Grande")
                .uf("SP")
                .latitude(-24.0023)
                .longitude(-46.4160)
                .tipologia("Casa")
                .build());

        vistoriadorRepository.save(Vistoriador.builder()
                .nome("Eng. Ricardo Almeida")
                .registroProfissional("CREA-SP 123456")
                .baseLatitude(-24.0071)
                .baseLongitude(-46.4125)
                .capacidadeDiaria(4)
                .ativo(true)
                .build());
        vistoriadorRepository.save(Vistoriador.builder()
                .nome("Eng. Mariana Costa")
                .registroProfissional("CREA-SP 654321")
                .baseLatitude(-24.0023)
                .baseLongitude(-46.4160)
                .capacidadeDiaria(3)
                .ativo(true)
                .build());

        ordemServicoRepository.save(OrdemServico.builder()
                .numeroOsCliente("OS-2026-0001")
                .cliente(banco)
                .imovel(apto)
                .recebidaEm(Instant.now().minus(1, ChronoUnit.DAYS))
                .prazoEntrega(Instant.now().plus(2, ChronoUnit.DAYS))
                .status(StatusOrdemServico.RECEBIDA)
                .build());
    }
}

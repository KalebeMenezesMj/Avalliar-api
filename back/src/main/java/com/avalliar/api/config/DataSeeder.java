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
import java.util.List;

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
        List<Cliente> clientes = seedClientes();
        List<Imovel> imoveis = seedImoveis();
        seedVistoriadores();
        seedOrdensServico(clientes, imoveis);
    }

    private void seedUsuarios() {
        usuarioRepository.saveAll(List.of(
                usuario("Administrador do Sistema", "admin@avalliar.com", "admin123", Role.ADMIN),
                usuario("Avaliador Exemplo", "avaliador@avalliar.com", "avaliar123", Role.AVALIADOR),
                usuario("Gestora Operacional", "gestor@avalliar.com", "gestor123", Role.GESTOR),
                usuario("Vistoriador de Campo", "vistoriador@avalliar.com", "vistoriador123", Role.VISTORIADOR),
                usuario("Assistente Operacional", "operacional@avalliar.com", "operacional123", Role.OPERACIONAL)
        ));
    }

    private Usuario usuario(String nome, String email, String senha, Role role) {
        return Usuario.builder()
                .nome(nome)
                .email(email)
                .senha(passwordEncoder.encode(senha))
                .role(role)
                .build();
    }

    private List<Cliente> seedClientes() {
        return clienteRepository.saveAll(List.of(
                cliente("12.345.678/0001-90", "Banco Exemplo S.A.", 48),
                cliente("98.765.432/0001-11", "Financeira Horizonte Ltda.", 72),
                cliente("11.222.333/0001-44", "Banco Nacional de Crédito S.A.", 24),
                cliente("55.666.777/0001-88", "Crédito Real Financeira Ltda.", 48),
                cliente("33.444.555/0001-66", "Banco de Investimentos Litoral S.A.", 96),
                cliente("77.888.999/0001-00", "Cooperativa de Crédito Paulista", 72)
        ));
    }

    private Cliente cliente(String cnpj, String razaoSocial, Integer sla) {
        return Cliente.builder()
                .cnpj(cnpj)
                .razaoSocial(razaoSocial)
                .slaPadraoHoras(sla)
                .build();
    }

    private List<Imovel> seedImoveis() {
        return imovelRepository.saveAll(List.of(
                imovel("11700-000", "Rua das Palmeiras", "123", "Boqueirão", "Praia Grande", "SP",
                        -24.0071, -46.4125, "Apartamento", "Apto 2 dormitórios, 68m²"),
                imovel("11702-610", "Av. Presidente Kennedy", "4500", "Guilhermina", "Praia Grande", "SP",
                        -24.0023, -46.4160, "Casa", "Casa térrea, 3 dormitórios, 120m²"),
                imovel("11700-060", "Rua São Paulo", "200", "Canto do Forte", "Praia Grande", "SP",
                        -24.0125, -46.4198, "Apartamento", "Apto 3 dormitórios, 85m²"),
                imovel("11704-120", "Rua México", "89", "Ocian", "Praia Grande", "SP",
                        -24.0190, -46.4211, "Casa", "Sobrado, 4 dormitórios, 150m²"),
                imovel("11701-300", "Av. Paris", "350", "Boqueirão", "Praia Grande", "SP",
                        -24.0065, -46.4142, "Apartamento", "Apto 2 dormitórios, 55m²"),
                imovel("11706-210", "Rua das Acácias", "12", "Solemar", "Praia Grande", "SP",
                        -24.0230, -46.4250, "Terreno", "Terreno 10x25, 250m²"),
                imovel("11702-720", "Rua Bahia", "500", "Guilhermina", "Praia Grande", "SP",
                        -24.0031, -46.4152, "Apartamento", "Apto cobertura, 4 dormitórios, 140m²"),
                imovel("11705-090", "Rua Portugal", "30", "Tupi", "Praia Grande", "SP",
                        -24.0180, -46.4170, "Casa", "Casa de condomínio, 3 dormitórios, 110m²")
        ));
    }

    private Imovel imovel(String cep, String logradouro, String numero, String bairro,
                          String cidade, String uf, Double lat, Double lng, String tipologia, String matricula) {
        return Imovel.builder()
                .cep(cep)
                .logradouro(logradouro)
                .numero(numero)
                .bairro(bairro)
                .cidade(cidade)
                .uf(uf)
                .latitude(lat)
                .longitude(lng)
                .tipologia(tipologia)
                .matricula(matricula)
                .build();
    }

    private void seedVistoriadores() {
        vistoriadorRepository.saveAll(List.of(
                vistoriador("Eng. Ricardo Almeida", "CREA-SP 123456", -24.0071, -46.4125, 4),
                vistoriador("Eng. Mariana Costa", "CREA-SP 654321", -24.0023, -46.4160, 3),
                vistoriador("Eng. Carlos Ferreira", "CREA-SP 111222", -24.0125, -46.4198, 5),
                vistoriador("Eng. Ana Souza", "CREA-SP 333444", -24.0190, -46.4211, 4),
                vistoriador("Eng. Paulo Lima", "CREA-SP 555666", -24.0065, -46.4142, 3)
        ));
    }

    private Vistoriador vistoriador(String nome, String registro, Double lat, Double lng, Integer capacidade) {
        return Vistoriador.builder()
                .nome(nome)
                .registroProfissional(registro)
                .baseLatitude(lat)
                .baseLongitude(lng)
                .capacidadeDiaria(capacidade)
                .ativo(true)
                .build();
    }

    private void seedOrdensServico(List<Cliente> clientes, List<Imovel> imoveis) {
        ordemServicoRepository.saveAll(List.of(
                os("OS-2026-0001", clientes.get(0), imoveis.get(0), 1, 2, StatusOrdemServico.RECEBIDA),
                os("OS-2026-0002", clientes.get(1), imoveis.get(1), 1, 3, StatusOrdemServico.AGENDADA),
                os("OS-2026-0003", clientes.get(2), imoveis.get(2), 2, 4, StatusOrdemServico.EM_VISTORIA),
                os("OS-2026-0004", clientes.get(3), imoveis.get(3), 3, 5, StatusOrdemServico.EM_AVALIACAO),
                os("OS-2026-0005", clientes.get(4), imoveis.get(4), 5, 7, StatusOrdemServico.CONCLUIDA),
                os("OS-2026-0006", clientes.get(5), imoveis.get(5), 0, 1, StatusOrdemServico.RECEBIDA),
                os("OS-2026-0007", clientes.get(0), imoveis.get(6), 2, 4, StatusOrdemServico.AGENDADA),
                os("OS-2026-0008", clientes.get(1), imoveis.get(7), 1, 3, StatusOrdemServico.EM_VISTORIA),
                os("OS-2026-0009", clientes.get(2), imoveis.get(0), 6, 8, StatusOrdemServico.CANCELADA),
                os("OS-2026-0010", clientes.get(3), imoveis.get(1), 8, 10, StatusOrdemServico.CONCLUIDA)
        ));
    }

    private OrdemServico os(String numero, Cliente cliente, Imovel imovel,
                            long diasRecebida, long diasPrazo, StatusOrdemServico status) {
        Instant now = Instant.now();
        return OrdemServico.builder()
                .numeroOsCliente(numero)
                .cliente(cliente)
                .imovel(imovel)
                .recebidaEm(now.minus(diasRecebida, ChronoUnit.DAYS))
                .prazoEntrega(now.plus(diasPrazo, ChronoUnit.DAYS))
                .status(status)
                .build();
    }
}

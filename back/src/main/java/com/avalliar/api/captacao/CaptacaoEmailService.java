package com.avalliar.api.captacao;

import com.avalliar.api.cliente.Cliente;
import com.avalliar.api.eventoos.EventoOs;
import com.avalliar.api.eventoos.EventoOsRepository;
import com.avalliar.api.ordemservico.OrdemServico;
import com.avalliar.api.ordemservico.OrdemServicoRepository;
import com.avalliar.api.ordemservico.StatusOrdemServico;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lê a caixa do Gmail, grava cada mensagem nova em email_recebido e, quando uma regra de captação
 * vigente reconhece o remetente/assunto, cria a Ordem de Serviço (demanda) do cliente da regra.
 */
@Service
public class CaptacaoEmailService {

    public record Resultado(int lidos, int novos, int osCriadas, int semRegra, int duplicadas, int erros) {
    }

    static final String STATUS_OS_CRIADA = "OS_CRIADA";
    static final String STATUS_SEM_REGRA = "SEM_REGRA";
    static final String STATUS_OS_DUPLICADA = "OS_DUPLICADA";

    /** "OS 12345", "O.S. nº 2026/0042", "Ordem de Serviço: AB-778". */
    private static final Pattern NUMERO_OS = Pattern.compile(
            "(?iu)\\b(?:O\\.?S\\.?|ordem\\s+de\\s+servi[çc]o)\\s*(?:n[º°o.]*|#|:|-)?\\s*([A-Za-z0-9][A-Za-z0-9./-]{2,49})");
    private static final Pattern NUMERO_NO_INICIO = Pattern.compile("(?iu)^\\s*(?:RES?:\\s*)?(\\d{8})\\b");
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    private static final Logger log = LoggerFactory.getLogger(CaptacaoEmailService.class);

    private final GmailClient gmail;
    private final ContaEmailRepository contaRepository;
    private final EmailRecebidoRepository emailRepository;
    private final RegraCaptacaoRepository regraRepository;
    private final OrdemServicoRepository osRepository;
    private final EventoOsRepository eventoRepository;
    private final TransactionTemplate tx;
    private final String busca;
    private final int maximo;

    public CaptacaoEmailService(GmailClient gmail,
                                ContaEmailRepository contaRepository,
                                EmailRecebidoRepository emailRepository,
                                RegraCaptacaoRepository regraRepository,
                                OrdemServicoRepository osRepository,
                                EventoOsRepository eventoRepository,
                                TransactionTemplate tx,
                                @Value("${app.gmail.busca:in:inbox newer_than:7d}") String busca,
                                @Value("${app.gmail.maximo-por-ciclo:50}") int maximo) {
        this.gmail = gmail;
        this.contaRepository = contaRepository;
        this.emailRepository = emailRepository;
        this.regraRepository = regraRepository;
        this.osRepository = osRepository;
        this.eventoRepository = eventoRepository;
        this.tx = tx;
        this.busca = busca;
        this.maximo = maximo;
    }

    public synchronized Resultado sincronizar() {
        ContaEmail conta = contaDaCaixa();
        List<String> ids = gmail.listarIds(busca, maximo);
        int novos = 0, criadas = 0, semRegra = 0, duplicadas = 0, erros = 0;

        // Mais antigos primeiro, para as OS nascerem na ordem de chegada.
        for (String id : ids.reversed()) {
            if (emailRepository.existsByMessageId(id)) {
                continue;
            }
            try {
                String status = tx.execute(s -> processar(conta, gmail.buscar(id)));
                novos++;
                switch (status) {
                    case STATUS_OS_CRIADA -> criadas++;
                    case STATUS_OS_DUPLICADA -> duplicadas++;
                    default -> semRegra++;
                }
            } catch (RuntimeException e) {
                erros++;
                log.warn("Falha ao processar e-mail {} do Gmail: {}", id, e.getMessage());
            }
        }

        conta.setUltimaSincronizacao(Instant.now());
        contaRepository.save(conta);
        Resultado r = new Resultado(ids.size(), novos, criadas, semRegra, duplicadas, erros);
        if (novos > 0 || erros > 0) {
            log.info("Captação de e-mail: {}", r);
        }
        return r;
    }

    public List<EmailRecebido> ultimos() {
        return emailRepository.findTop100ByOrderByRecebidoEmDesc();
    }

    String processar(ContaEmail conta, GmailClient.Mensagem msg) {
        EmailRecebido email = emailRepository.save(EmailRecebido.builder()
                .contaEmail(conta)
                .messageId(msg.id())
                .remetente(limitar(msg.remetente(), 320))
                .assunto(msg.assunto())
                .corpoTexto(msg.corpo())
                .recebidoEm(msg.recebidoEm())
                .statusProcessamento(STATUS_SEM_REGRA)
                .build());
        return classificar(email);
    }

    /**
     * Reavalia os e-mails que ficaram sem regra (ex.: chegaram antes de a regra ser cadastrada).
     * Chamado ao criar ou alterar uma regra.
     */
    public Resultado reprocessarSemRegra() {
        List<EmailRecebido> pendentes = emailRepository.findByStatusProcessamentoOrderByRecebidoEmAsc(STATUS_SEM_REGRA);
        int criadas = 0, duplicadas = 0, erros = 0;
        for (EmailRecebido e : pendentes) {
            try {
                String status = tx.execute(s -> classificar(emailRepository.findById(e.getId()).orElseThrow()));
                if (STATUS_OS_CRIADA.equals(status)) {
                    criadas++;
                } else if (STATUS_OS_DUPLICADA.equals(status)) {
                    duplicadas++;
                }
            } catch (RuntimeException ex) {
                erros++;
                log.warn("Falha ao reprocessar e-mail {}: {}", e.getId(), ex.getMessage());
            }
        }
        return new Resultado(pendentes.size(), 0, criadas, pendentes.size() - criadas - duplicadas - erros, duplicadas, erros);
    }

    private String classificar(EmailRecebido email) {
        LocalDate dia = email.getRecebidoEm().atZone(FUSO).toLocalDate();
        Optional<RegraCaptacao> regra = regraRepository.findAllByOrderByIdAsc().stream()
                .filter(r -> r.vigenteEm(dia) && r.aceita(email.getRemetente(), email.getAssunto()))
                .findFirst();
        if (regra.isEmpty()) {
            return STATUS_SEM_REGRA;
        }

        Cliente cliente = regra.get().getCliente();
        String numero = numeroOs(email.getAssunto(), email.getCorpoTexto()).orElse("EMAIL-" + email.getId());
        if (osRepository.existsByClienteIdAndNumeroOsCliente(cliente.getId(), numero)) {
            email.setStatusProcessamento(STATUS_OS_DUPLICADA);
            return STATUS_OS_DUPLICADA;
        }

        OrdemServico os = osRepository.save(OrdemServico.builder()
                .numeroOsCliente(numero)
                .cliente(cliente)
                .recebidaEm(email.getRecebidoEm())
                .prazoEntrega(cliente.getSlaPadraoHoras() == null ? null
                        : email.getRecebidoEm().plus(cliente.getSlaPadraoHoras(), ChronoUnit.HOURS))
                .status(StatusOrdemServico.RECEBIDA)
                .emailRecebidoId(email.getId())
                .build());
        eventoRepository.save(EventoOs.builder()
                .ordemServico(os)
                .statusNovo(StatusOrdemServico.RECEBIDA.name())
                .motivo("Criada a partir do e-mail \"" + limitar(email.getAssunto(), 200) + "\" (regra " + regra.get().getId() + ")")
                .ocorridoEm(Instant.now())
                .build());
        email.setStatusProcessamento(STATUS_OS_CRIADA);
        return STATUS_OS_CRIADA;
    }

    static Optional<String> numeroOs(String assunto, String corpo) {
        if (assunto != null) {
            Matcher inicio = NUMERO_NO_INICIO.matcher(assunto);
            if (inicio.find()) {
                return Optional.of(inicio.group(1));
            }
        }
        for (String texto : new String[]{assunto, corpo}) {
            if (texto == null) {
                continue;
            }
            Matcher m = NUMERO_OS.matcher(texto);
            while (m.find()) {
                String n = m.group(1).replaceAll("[./-]+$", "");
                if (n.chars().anyMatch(Character::isDigit)) {
                    return Optional.of(n);
                }
            }
        }
        return Optional.empty();
    }

    private ContaEmail contaDaCaixa() {
        String endereco = gmail.enderecoDaConta();
        return contaRepository.findByEndereco(endereco)
                .orElseGet(() -> contaRepository.save(ContaEmail.builder().endereco(endereco).provedor("gmail").build()));
    }

    private static String limitar(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}

package com.avalliar.api.captacao;

import com.avalliar.api.captacao.dto.RegraCaptacaoRequest;
import com.avalliar.api.cliente.ClienteRepository;
import com.avalliar.api.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

@RestController
@Tag(name = "Captação de e-mail", description = "Leitura da caixa do Gmail e regras que transformam e-mails em OS")
public class CaptacaoController {

    private final CaptacaoEmailService service;
    private final RegraCaptacaoRepository regraRepository;
    private final ClienteRepository clienteRepository;

    public CaptacaoController(CaptacaoEmailService service,
                              RegraCaptacaoRepository regraRepository,
                              ClienteRepository clienteRepository) {
        this.service = service;
        this.regraRepository = regraRepository;
        this.clienteRepository = clienteRepository;
    }

    @PostMapping("/api/emails/sincronizar")
    @Operation(summary = "Ler a caixa agora e criar as OS dos e-mails novos")
    public CaptacaoEmailService.Resultado sincronizar() {
        return service.sincronizar();
    }

    @GetMapping("/api/emails")
    @Operation(summary = "Últimos 100 e-mails recebidos e o resultado do processamento")
    public List<EmailRecebido> emails() {
        return service.ultimos();
    }

    @GetMapping("/api/regras-captacao")
    @Operation(summary = "Listar regras de captação")
    public List<RegraCaptacao> listarRegras() {
        return regraRepository.findAllByOrderByIdAsc();
    }

    @PostMapping("/api/regras-captacao")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Criar regra de captação (regex sobre remetente e assunto); reavalia os e-mails sem regra")
    public RegraCaptacao criarRegra(@Valid @RequestBody RegraCaptacaoRequest request) {
        RegraCaptacao regra = regraRepository.save(preencher(new RegraCaptacao(), request));
        service.reprocessarSemRegra();
        return regra;
    }

    @PutMapping("/api/regras-captacao/{id}")
    @Operation(summary = "Atualizar regra de captação")
    public RegraCaptacao atualizarRegra(@PathVariable Long id, @Valid @RequestBody RegraCaptacaoRequest request) {
        RegraCaptacao regra = regraRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Regra de captação", id));
        regra.setVersao(regra.getVersao() + 1);
        regra = regraRepository.save(preencher(regra, request));
        service.reprocessarSemRegra();
        return regra;
    }

    @DeleteMapping("/api/regras-captacao/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Excluir regra de captação")
    public void excluirRegra(@PathVariable Long id) {
        regraRepository.delete(regraRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Regra de captação", id)));
    }

    private RegraCaptacao preencher(RegraCaptacao regra, RegraCaptacaoRequest r) {
        if (vazio(r.criterioRemetente()) && vazio(r.criterioAssunto())) {
            throw new IllegalArgumentException("Informe criterioRemetente e/ou criterioAssunto");
        }
        validarRegex(r.criterioRemetente());
        validarRegex(r.criterioAssunto());
        regra.setCliente(clienteRepository.findById(r.clienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", r.clienteId())));
        regra.setCriterioRemetente(vazio(r.criterioRemetente()) ? null : r.criterioRemetente().trim());
        regra.setCriterioAssunto(vazio(r.criterioAssunto()) ? null : r.criterioAssunto().trim());
        regra.setVigenteDe(r.vigenteDe() != null ? r.vigenteDe() : LocalDate.now());
        regra.setVigenteAte(r.vigenteAte());
        if (regra.getVersao() == null) {
            regra.setVersao(1);
        }
        return regra;
    }

    private static boolean vazio(String s) {
        return s == null || s.isBlank();
    }

    private static void validarRegex(String s) {
        if (vazio(s)) {
            return;
        }
        try {
            Pattern.compile(s);
        } catch (PatternSyntaxException e) {
            throw new IllegalArgumentException("Critério não é uma expressão regular válida: " + s);
        }
    }
}

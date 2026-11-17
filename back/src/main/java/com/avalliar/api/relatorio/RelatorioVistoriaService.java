package com.avalliar.api.relatorio;

import com.avalliar.api.fotovistoria.FotoStorage;
import com.avalliar.api.ordemservico.OrdemServico;
import com.avalliar.api.ordemservico.OrdemServicoService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@Service
public class RelatorioVistoriaService {

    private static final long MAX_PLANILHA_BYTES = 15L * 1024 * 1024;

    private final RelatorioVistoriaRepository repository;
    private final OrdemServicoService ordemServicoService;
    private final FotoStorage storage;
    private final ObjectMapper json = new ObjectMapper();

    public RelatorioVistoriaService(RelatorioVistoriaRepository repository,
                                    OrdemServicoService ordemServicoService,
                                    FotoStorage storage) {
        this.repository = repository;
        this.ordemServicoService = ordemServicoService;
        this.storage = storage;
    }

    /** Cria ou atualiza o relatório da OS. Sem planilha nova, mantém a que já estava salva. */
    @Transactional
    public RelatorioVistoria salvar(Long osId, Map<String, Object> dados, String planilhaNome, byte[] planilha) {
        if (dados == null) {
            throw new IllegalArgumentException("Os dados do relatório são obrigatórios");
        }
        OrdemServico os = ordemServicoService.buscarPorId(osId);
        RelatorioVistoria relatorio = repository.findByOrdemServicoId(osId).orElseGet(RelatorioVistoria::new);
        relatorio.setOrdemServico(os);
        relatorio.setDadosJson(serializar(dados));

        if (planilha != null && planilha.length > 0) {
            if (planilha.length > MAX_PLANILHA_BYTES) {
                throw new IllegalArgumentException("Planilha acima de 15 MB");
            }
            String nome = nomeSeguro(planilhaNome);
            // Pasta de primeiro nível: o Azure Files não cria pastas aninhadas de uma vez
            relatorio.setPlanilhaCaminho(storage.salvarEm("relatorios-" + osId, nome, planilha));
            relatorio.setPlanilhaNome(nome);
            relatorio.setPlanilhaTamanhoBytes((long) planilha.length);
        }

        relatorio.setAtualizadoEm(Instant.now());
        return repository.save(relatorio);
    }

    @Transactional(readOnly = true)
    public Optional<RelatorioVistoria> buscar(Long osId) {
        return repository.findByOrdemServicoId(osId);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> lerDados(RelatorioVistoria relatorio) {
        try {
            return json.readValue(relatorio.getDadosJson(), Map.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Dados do relatório corrompidos", e);
        }
    }

    public byte[] lerPlanilha(RelatorioVistoria relatorio) {
        if (relatorio.getPlanilhaCaminho() == null) {
            throw new IllegalArgumentException("Este relatório não tem planilha salva");
        }
        return storage.ler(relatorio.getPlanilhaCaminho());
    }

    private String serializar(Map<String, Object> dados) {
        try {
            return json.writeValueAsString(dados);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Dados do relatório inválidos");
        }
    }

    private static String nomeSeguro(String nome) {
        String limpo = (nome == null || nome.isBlank()) ? "planilha.xlsx" : nome.replaceAll("[^A-Za-z0-9._-]", "_");
        return limpo.contains(".") ? limpo : limpo + ".xlsx";
    }
}

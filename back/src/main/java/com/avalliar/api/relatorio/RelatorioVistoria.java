package com.avalliar.api.relatorio;

import com.avalliar.api.ordemservico.OrdemServico;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Relatório de vistoria de uma OS: os dados preenchidos no app e a planilha gerada.
 * A planilha fica no Azure Files; no banco guarda-se só o caminho e o nome.
 */
@Entity
@Table(name = "relatorio_vistoria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RelatorioVistoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ordem_servico_id", nullable = false, unique = true)
    private OrdemServico ordemServico;

    @Column(name = "dados_json", nullable = false, columnDefinition = "TEXT")
    private String dadosJson;

    @Column(name = "planilha_nome")
    private String planilhaNome;

    @Column(name = "planilha_caminho")
    private String planilhaCaminho;

    @Column(name = "planilha_tamanho_bytes")
    private Long planilhaTamanhoBytes;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;
}

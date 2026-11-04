package com.avalliar.api.laudo;

import com.avalliar.api.ordemservico.OrdemServico;
import com.avalliar.api.templateplanilha.TemplatePlanilha;
import com.avalliar.api.usuario.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "laudo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Laudo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "ordem_servico_id", nullable = false)
    private OrdemServico ordemServico;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "avaliador_id")
    private Usuario avaliador;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "template_planilha_id")
    private TemplatePlanilha templatePlanilha;

    @Column(name = "data_base")
    private LocalDate dataBase;

    private String metodologia;

    @Column(name = "valor_avaliacao")
    private BigDecimal valorAvaliacao;

    @Column(name = "grau_fundamentacao")
    private String grauFundamentacao;

    @Column(nullable = false)
    private String status;
}

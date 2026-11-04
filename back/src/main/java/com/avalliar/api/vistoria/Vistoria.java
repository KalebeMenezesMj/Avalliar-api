package com.avalliar.api.vistoria;

import com.avalliar.api.ordemservico.OrdemServico;
import com.avalliar.api.vistoriador.Vistoriador;
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

import java.time.Instant;

@Entity
@Table(name = "vistoria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vistoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "ordem_servico_id", nullable = false)
    private OrdemServico ordemServico;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "vistoriador_id", nullable = false)
    private Vistoriador vistoriador;

    @Column(name = "data_hora_estimada")
    private Instant dataHoraEstimada;

    @Column(nullable = false)
    private String status;

    @Column(name = "realizada_em")
    private Instant realizadaEm;

    @Column(name = "motivo_improdutiva")
    private String motivoImprodutiva;
}

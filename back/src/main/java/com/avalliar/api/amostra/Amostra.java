package com.avalliar.api.amostra;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "amostra")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Amostra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fonte;

    @Column(name = "identificador_externo")
    private String identificadorExterno;

    private String url;

    @Column(name = "coletado_em")
    private Instant coletadoEm;

    @Column(name = "tipo_negocio")
    private String tipoNegocio;

    private String natureza;

    @Column(name = "valor_total")
    private BigDecimal valorTotal;

    @Column(name = "area_total")
    private BigDecimal areaTotal;

    private Double latitude;
    private Double longitude;

    private String tipologia;

    @Column(name = "status_validacao")
    private String statusValidacao;
}

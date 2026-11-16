package com.avalliar.api.cub;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Valor mensal do CUB (Custo Unitário Básico) publicado pelo Sinduscon.
 * Hoje só SP / R8N / sem desoneração é usado pelo laudo.
 */
@Entity
@Table(name = "cub_indice", uniqueConstraints = @UniqueConstraint(
        columnNames = {"uf", "padrao", "sem_desoneracao", "competencia"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CubIndice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 2)
    private String uf;

    @Column(nullable = false, length = 10)
    private String padrao;

    @Column(name = "sem_desoneracao", nullable = false)
    private boolean semDesoneracao;

    @Column(nullable = false)
    private LocalDate competencia;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal valor;

    @Column(length = 255)
    private String fonte;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;
}

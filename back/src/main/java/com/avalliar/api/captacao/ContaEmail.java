package com.avalliar.api.captacao;

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

import java.time.Instant;

/** Caixa de e-mail monitorada (tabela conta_email). */
@Entity
@Table(name = "conta_email")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContaEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 320)
    private String endereco;

    @Column(nullable = false)
    private String provedor;

    @Column(name = "ultima_sincronizacao")
    private Instant ultimaSincronizacao;
}

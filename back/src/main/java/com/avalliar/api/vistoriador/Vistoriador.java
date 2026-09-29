package com.avalliar.api.vistoriador;

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

@Entity
@Table(name = "vistoriador")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vistoriador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(name = "registro_profissional")
    private String registroProfissional;

    private Double baseLatitude;
    private Double baseLongitude;

    @Column(name = "capacidade_diaria")
    private Integer capacidadeDiaria;

    private Boolean ativo;
}

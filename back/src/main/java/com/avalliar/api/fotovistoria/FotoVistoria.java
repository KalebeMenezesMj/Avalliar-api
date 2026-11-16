package com.avalliar.api.fotovistoria;

import com.avalliar.api.vistoria.Vistoria;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** Foto do relatório fotográfico de uma vistoria. O arquivo fica no Azure Files. */
@Entity
@Table(name = "foto_vistoria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FotoVistoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vistoria_id", nullable = false)
    private Vistoria vistoria;

    @Column(nullable = false)
    private int ordem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ComodoFoto comodo;

    /** Caminho relativo à pasta de fotos (ex.: 12/3-uuid.jpg). */
    @Column(nullable = false, length = 255)
    private String caminho;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    @Column(name = "tamanho_bytes", nullable = false)
    private long tamanhoBytes;

    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm;
}

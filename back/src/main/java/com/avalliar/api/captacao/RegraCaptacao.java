package com.avalliar.api.captacao;

import com.avalliar.api.cliente.Cliente;
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

import java.time.LocalDate;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Regra que liga um e-mail a um cliente (tabela regra_captacao).
 * Os critérios são expressões regulares (sem diferenciar maiúsculas); critério vazio aceita qualquer valor,
 * mas a regra precisa de pelo menos um critério preenchido.
 */
@Entity
@Table(name = "regra_captacao")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegraCaptacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @Builder.Default
    @Column(nullable = false)
    private Integer versao = 1;

    @Column(name = "criterio_remetente", columnDefinition = "text")
    private String criterioRemetente;

    @Column(name = "criterio_assunto", columnDefinition = "text")
    private String criterioAssunto;

    @Column(name = "vigente_de", nullable = false)
    private LocalDate vigenteDe;

    @Column(name = "vigente_ate")
    private LocalDate vigenteAte;

    public boolean vigenteEm(LocalDate dia) {
        return !dia.isBefore(vigenteDe) && (vigenteAte == null || !dia.isAfter(vigenteAte));
    }

    public boolean aceita(String remetente, String assunto) {
        return confere(criterioRemetente, remetente) && confere(criterioAssunto, assunto);
    }

    private static boolean confere(String criterio, String valor) {
        if (criterio == null || criterio.isBlank()) {
            return true;
        }
        String texto = valor == null ? "" : valor;
        try {
            return Pattern.compile(criterio, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE).matcher(texto).find();
        } catch (PatternSyntaxException e) {
            return texto.toLowerCase(Locale.ROOT).contains(criterio.toLowerCase(Locale.ROOT));
        }
    }
}

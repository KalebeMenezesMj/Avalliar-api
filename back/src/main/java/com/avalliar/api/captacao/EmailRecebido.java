package com.avalliar.api.captacao;

import com.fasterxml.jackson.annotation.JsonIgnore;
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

/**
 * Mensagem lida da caixa monitorada (tabela email_recebido).
 * {@code messageId} guarda o id da mensagem no Gmail, que é estável e evita reprocessar o mesmo e-mail.
 */
@Entity
@Table(name = "email_recebido")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailRecebido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conta_email_id", nullable = false)
    private ContaEmail contaEmail;

    @Column(name = "message_id", nullable = false, unique = true)
    private String messageId;

    @Column(nullable = false, length = 320)
    private String remetente;

    @Column(columnDefinition = "text")
    private String assunto;

    @Column(name = "corpo_texto", columnDefinition = "text")
    private String corpoTexto;

    @Column(name = "recebido_em", nullable = false)
    private Instant recebidoEm;

    @Column(name = "status_processamento", nullable = false, length = 50)
    private String statusProcessamento;
}

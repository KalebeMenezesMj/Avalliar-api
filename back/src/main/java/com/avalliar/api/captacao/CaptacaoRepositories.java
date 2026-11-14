package com.avalliar.api.captacao;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

interface ContaEmailRepository extends JpaRepository<ContaEmail, Long> {
    Optional<ContaEmail> findByEndereco(String endereco);
}

interface EmailRecebidoRepository extends JpaRepository<EmailRecebido, Long> {
    boolean existsByMessageId(String messageId);

    List<EmailRecebido> findTop100ByOrderByRecebidoEmDesc();

    List<EmailRecebido> findByStatusProcessamentoOrderByRecebidoEmAsc(String statusProcessamento);
}

interface RegraCaptacaoRepository extends JpaRepository<RegraCaptacao, Long> {
    List<RegraCaptacao> findAllByOrderByIdAsc();
}

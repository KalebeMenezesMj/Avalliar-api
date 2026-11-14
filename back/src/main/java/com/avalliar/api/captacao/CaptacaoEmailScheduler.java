package com.avalliar.api.captacao;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Verifica a caixa periodicamente quando app.gmail.monitorar=true (GMAIL_MONITORAR). */
@Component
@EnableScheduling
@ConditionalOnProperty(name = "app.gmail.monitorar", havingValue = "true")
public class CaptacaoEmailScheduler {

    private static final Logger log = LoggerFactory.getLogger(CaptacaoEmailScheduler.class);

    private final CaptacaoEmailService service;

    public CaptacaoEmailScheduler(CaptacaoEmailService service) {
        this.service = service;
    }

    @Scheduled(initialDelayString = "${app.gmail.atraso-inicial-ms:20000}",
            fixedDelayString = "${app.gmail.intervalo-ms:60000}")
    public void verificarCaixa() {
        try {
            service.sincronizar();
        } catch (RuntimeException e) {
            log.warn("Não foi possível ler a caixa do Gmail: {}", e.getMessage());
        }
    }
}

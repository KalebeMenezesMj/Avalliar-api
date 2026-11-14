package com.avalliar.api.captacao;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CaptacaoRegrasTest {

    @Test
    void extraiNumeroDaOsDoAssuntoOuDoCorpo() {
        assertEquals(Optional.of("12345"), CaptacaoEmailService.numeroOs("Nova OS 12345 - Santos", null));
        assertEquals(Optional.of("2026/0042"), CaptacaoEmailService.numeroOs("O.S. nº 2026/0042.", null));
        assertEquals(Optional.of("AB-778"), CaptacaoEmailService.numeroOs("Avaliação", "Segue a Ordem de Serviço: AB-778 para vistoria"));
        assertEquals(Optional.empty(), CaptacaoEmailService.numeroOs("Os documentos seguem anexos", "Bom dia"));
    }

    @Test
    void regraConfereRemetenteEAssuntoSemDiferenciarMaiusculas() {
        RegraCaptacao regra = RegraCaptacao.builder()
                .criterioRemetente("@caixa\\.gov\\.br")
                .criterioAssunto("ordem de servi[çc]o|\\bOS\\b")
                .vigenteDe(LocalDate.of(2026, 1, 1))
                .build();

        assertTrue(regra.aceita("Gerência <avaliacao@CAIXA.gov.br>", "Nova OS 123"));
        assertTrue(regra.aceita("avaliacao@caixa.gov.br", "ORDEM DE SERVIÇO 9"));
        assertFalse(regra.aceita("spam@outro.com", "Nova OS 123"));
        assertFalse(regra.aceita("avaliacao@caixa.gov.br", "Newsletter"));
    }

    @Test
    void regraRespeitaVigencia() {
        RegraCaptacao regra = RegraCaptacao.builder()
                .criterioAssunto("OS")
                .vigenteDe(LocalDate.of(2026, 1, 1))
                .vigenteAte(LocalDate.of(2026, 6, 30))
                .build();

        assertTrue(regra.vigenteEm(LocalDate.of(2026, 6, 30)));
        assertFalse(regra.vigenteEm(LocalDate.of(2026, 7, 1)));
        assertFalse(regra.vigenteEm(LocalDate.of(2025, 12, 31)));
    }
}

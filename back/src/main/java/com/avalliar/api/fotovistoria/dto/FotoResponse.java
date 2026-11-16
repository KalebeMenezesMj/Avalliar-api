package com.avalliar.api.fotovistoria.dto;

import com.avalliar.api.fotovistoria.ComodoFoto;
import com.avalliar.api.fotovistoria.FotoVistoria;

import java.time.Instant;

public record FotoResponse(
        Long id,
        Long vistoriaId,
        int ordem,
        ComodoFoto comodo,
        String contentType,
        long tamanhoBytes,
        Instant criadaEm,
        String url) {

    public static FotoResponse de(FotoVistoria f) {
        return new FotoResponse(f.getId(), f.getVistoria().getId(), f.getOrdem(), f.getComodo(),
                f.getContentType(), f.getTamanhoBytes(), f.getCriadaEm(), "/api/fotos/" + f.getId() + "/arquivo");
    }
}

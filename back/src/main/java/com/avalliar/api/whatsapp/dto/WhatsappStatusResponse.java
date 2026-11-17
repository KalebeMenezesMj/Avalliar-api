package com.avalliar.api.whatsapp.dto;

/**
 * estado: CONNECTED, CONNECTING, CLOSE, NAO_CRIADA ou DESCONHECIDO.
 * qrCodeBase64: imagem do QR code (quando há uma conexão pendente).
 * codigo: código de pareamento, alternativa ao QR code.
 */
public record WhatsappStatusResponse(String estado, String qrCodeBase64, String codigo) {
}

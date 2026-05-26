package com.sigfec.domain.dto.asaas;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Resposta do endpoint GET /payments/{id}/pixQrCode. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AsaasPixQrCodeResponse(
        String encodedImage,   // QR Code em base64
        String payload,        // copia e cola
        String expirationDate
) {}

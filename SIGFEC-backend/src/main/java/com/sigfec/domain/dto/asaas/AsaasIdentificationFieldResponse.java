package com.sigfec.domain.dto.asaas;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Resposta do endpoint GET /payments/{id}/identificationField (dados do boleto). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AsaasIdentificationFieldResponse(
        String identificationField,  // linha digitável
        String nossoNumero,
        String barCode               // código de barras
) {}

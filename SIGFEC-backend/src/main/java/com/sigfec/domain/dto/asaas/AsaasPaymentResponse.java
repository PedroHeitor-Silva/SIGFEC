package com.sigfec.domain.dto.asaas;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Resposta de criação de cobrança no Asaas. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AsaasPaymentResponse(
        String id,
        String status,
        String invoiceUrl,
        String bankSlipUrl,
        Double value,
        String dueDate
) {}

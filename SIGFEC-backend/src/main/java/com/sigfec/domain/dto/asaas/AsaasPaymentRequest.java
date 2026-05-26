package com.sigfec.domain.dto.asaas;

/**
 * Payload de criação de cobrança no Asaas.
 * billingType: "PIX" ou "BOLETO".
 */
public record AsaasPaymentRequest(
        String customer,
        String billingType,
        Double value,
        String dueDate,
        String description,
        String externalReference
) {}

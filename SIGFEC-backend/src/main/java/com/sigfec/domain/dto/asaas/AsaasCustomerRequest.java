package com.sigfec.domain.dto.asaas;

/** Payload de criação de cliente no Asaas. */
public record AsaasCustomerRequest(
        String name,
        String cpfCnpj,
        String email,
        String mobilePhone
) {}

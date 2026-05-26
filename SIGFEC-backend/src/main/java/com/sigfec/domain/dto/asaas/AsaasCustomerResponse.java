package com.sigfec.domain.dto.asaas;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Resposta de criação / busca de cliente no Asaas. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AsaasCustomerResponse(
        String id,
        String name,
        String cpfCnpj,
        // presente quando é resposta de listagem (GET /customers?cpfCnpj=...)
        List<AsaasCustomerResponse> data,
        Integer totalCount
) {}

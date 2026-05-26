package com.sigfec.services;

/** Erro de negócio ou de integração com a API Asaas. */
public class AsaasException extends RuntimeException {
    public AsaasException(String message) {
        super(message);
    }
}

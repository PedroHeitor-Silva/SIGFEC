package com.sigfec.services;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/** Violação de regra de negócio, com o status HTTP que o cliente deve receber. */
@Getter
public class RegraNegocioException extends RuntimeException {

    private final HttpStatus status;

    public RegraNegocioException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    /** 400 — dado de entrada inválido. */
    public static RegraNegocioException invalida(String message) {
        return new RegraNegocioException(HttpStatus.BAD_REQUEST, message);
    }

    /** 404 — registro não encontrado. */
    public static RegraNegocioException naoEncontrada(String message) {
        return new RegraNegocioException(HttpStatus.NOT_FOUND, message);
    }

    /** 409 — operação não permitida no estado atual do registro. */
    public static RegraNegocioException conflito(String message) {
        return new RegraNegocioException(HttpStatus.CONFLICT, message);
    }
}

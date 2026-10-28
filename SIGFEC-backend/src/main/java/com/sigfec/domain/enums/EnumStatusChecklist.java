package com.sigfec.domain.enums;

/** Resultado da inspeção do veículo/carga antes da descarga. */
public enum EnumStatusChecklist {
    PENDENTE,   // ainda não avaliado
    APROVADO,   // apto para descarregar
    REPROVADO   // reprovado na inspeção
}

package com.sigfec.domain.enums;

/** Situação de um veículo na fila de descarga do pátio. */
public enum EnumStatusEntrada {
    AGUARDANDO,     // na fila, esperando ser chamado
    CHAMADO,        // chamado para a balança/descarga
    EM_ATENDIMENTO, // em processo (checklist/pesagem)
    FINALIZADO,     // concluído (gerou pesagem)
    CANCELADO       // desistência ou reprovado
}

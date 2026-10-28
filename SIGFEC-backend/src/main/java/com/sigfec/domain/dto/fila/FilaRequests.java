package com.sigfec.domain.dto.fila;

/**
 * Corpos de requisição do módulo de fila. Records aceitam só os campos que o cliente
 * pode informar: status, senha, datas e vínculos são sempre definidos pelo servidor.
 */
public final class FilaRequests {

    private FilaRequests() {}

    /** Registro de chegada ao pátio. */
    public record RegistrarChegada(Long veiculoId, Long motoristaId, Long produtorId, String observacao) {}

    /** Chamada para um local (ex.: "Balança 1"). */
    public record Chamada(String local) {}

    /** Cancelamento: o motivo é obrigatório. */
    public record Cancelamento(String motivo) {}

    /** Respostas do checklist (null = não respondida). */
    public record Checklist(
            Boolean semVestigiosToxicos, Boolean higieneLimpeza, Boolean estruturaConservada,
            Boolean lonaCordaOk, Boolean ausenciaPragas, Boolean secosSemOdor, Boolean forroOk,
            Boolean sacariaLimpa, Boolean sacariaSemAvaria, Boolean lonasAdequadas, String observacao) {}
}

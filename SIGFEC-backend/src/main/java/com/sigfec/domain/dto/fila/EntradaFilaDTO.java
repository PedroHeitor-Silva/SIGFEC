package com.sigfec.domain.dto.fila;

import com.sigfec.domain.entities.EntradaFila;
import com.sigfec.domain.enums.EnumStatusChecklist;
import com.sigfec.domain.enums.EnumStatusEntrada;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Visão de uma entrada da fila, já com o status do checklist (usado para liberar a chamada). */
public record EntradaFilaDTO(
        Long id,
        Integer senhaDiaria,
        LocalDate dataReferencia,
        EnumStatusEntrada status,
        EnumStatusChecklist checklistStatus,
        String localChamada,
        VeiculoResumo veiculo,
        PessoaResumo motorista,
        PessoaResumo produtor,
        Long pesagemId,
        LocalDateTime dataHoraEntrada,
        LocalDateTime dataHoraChamada,
        LocalDateTime dataHoraFinalizacao,
        Long tempoEsperaSegundos,
        String observacao
) {
    public record VeiculoResumo(Long id, String placa, String modelo, Double tara) {}

    public record PessoaResumo(Long id, String nome) {}

    public static EntradaFilaDTO of(EntradaFila e, EnumStatusChecklist checklistStatus) {
        var v = e.getVeiculo();
        var m = e.getMotorista();
        var p = e.getProdutor();
        return new EntradaFilaDTO(
                e.getId(), e.getSenhaDiaria(), e.getDataReferencia(), e.getStatus(),
                checklistStatus != null ? checklistStatus : EnumStatusChecklist.PENDENTE,
                e.getLocalChamada(),
                v == null ? null : new VeiculoResumo(v.getId(), v.getPlaca(), v.getModelo(), v.getTara()),
                m == null ? null : new PessoaResumo(m.getId(), m.getNome()),
                p == null ? null : new PessoaResumo(p.getId(), p.getNome()),
                e.getPesagem() == null ? null : e.getPesagem().getId(),
                e.getDataHoraEntrada(), e.getDataHoraChamada(), e.getDataHoraFinalizacao(),
                e.getTempoEsperaSegundos(), e.getObservacao());
    }
}

package com.sigfec.domain.dto.fila;

import com.sigfec.domain.entities.ChecklistCarga;
import com.sigfec.domain.enums.EnumStatusChecklist;

import java.time.LocalDateTime;

/** Checklist da carga para a interface: respostas, status calculado e quem avaliou. */
public record ChecklistCargaDTO(
        Long id,
        Long entradaFilaId,
        EnumStatusChecklist status,
        Boolean semVestigiosToxicos, Boolean higieneLimpeza, Boolean estruturaConservada,
        Boolean lonaCordaOk, Boolean ausenciaPragas, Boolean secosSemOdor, Boolean forroOk,
        Boolean sacariaLimpa, Boolean sacariaSemAvaria, Boolean lonasAdequadas,
        String observacao,
        String avaliadoPor,
        LocalDateTime dataHoraAvaliacao
) {
    public static ChecklistCargaDTO of(ChecklistCarga c) {
        return new ChecklistCargaDTO(
                c.getId(), c.getEntradaFila().getId(), c.getStatus(),
                c.getSemVestigiosToxicos(), c.getHigieneLimpeza(), c.getEstruturaConservada(),
                c.getLonaCordaOk(), c.getAusenciaPragas(), c.getSecosSemOdor(), c.getForroOk(),
                c.getSacariaLimpa(), c.getSacariaSemAvaria(), c.getLonasAdequadas(),
                c.getObservacao(),
                c.getAvaliadoPor() != null ? c.getAvaliadoPor().getNome() : null,
                c.getDataHoraAvaliacao());
    }
}

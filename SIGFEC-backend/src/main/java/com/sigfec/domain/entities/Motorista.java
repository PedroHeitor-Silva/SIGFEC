package com.sigfec.domain.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "motorista")
@PrimaryKeyJoinColumn(name = "pessoa_id")
public class Motorista extends Pessoa {

    @Column(unique = true, nullable = false)
    private String cnh;

    /** Categoria CNH — A, B, C, D, E. Fecularia normalmente C/D/E. */
    @Column(name = "categoria_cnh", length = 2)
    private String categoriaCnh;

    /** Data de validade da CNH. */
    @Column(name = "validade_cnh")
    private LocalDate validadeCnh;

    /** Motorista ativo (em atividade) ou inativo (desligado, sem excluir). */
    @Column(name = "status_ativo")
    private boolean statusAtivo = true;

    /** True se CNH vencida. */
    @Transient
    public boolean isCnhVencida() {
        return validadeCnh != null && validadeCnh.isBefore(LocalDate.now());
    }

    /** Dias até vencer (negativo se vencida). */
    @Transient
    public Long getDiasParaVencerCnh() {
        if (validadeCnh == null) return null;
        return ChronoUnit.DAYS.between(LocalDate.now(), validadeCnh);
    }
}

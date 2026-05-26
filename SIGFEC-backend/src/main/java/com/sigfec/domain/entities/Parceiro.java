package com.sigfec.domain.entities;

import com.sigfec.domain.enums.EnumTipoParceiro;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "parceiro")
@PrimaryKeyJoinColumn(name = "pessoa_id")
public class Parceiro extends Pessoa {

    @Column(name = "inscricao_estadual")
    private String inscricaoEstadual;

    private String rg;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_parceiro")
    private EnumTipoParceiro tipoParceiro;

    @Column(name = "limite_credito")
    private BigDecimal limiteCredito;

    @Embedded
    private Endereco endereco;
}

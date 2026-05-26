package com.sigfec.domain.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Entity
@DiscriminatorValue("PAGAR")
public class ContaPagar extends TituloFinanceiro {

    @ManyToOne
    @JoinColumn(name = "fornecedor_id")
    private Parceiro fornecedor;
}

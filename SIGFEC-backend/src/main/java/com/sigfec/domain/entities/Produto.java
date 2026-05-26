package com.sigfec.domain.entities;

import com.sigfec.domain.enums.EnumCategoriaProduto;
import com.sigfec.domain.enums.EnumUnidadeMedida;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@Entity
@Table(name = "produto")
public class Produto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Enumerated(EnumType.STRING)
    private EnumCategoriaProduto categoria;

    /** Unidade de medida padrão do produto — fonte única para estoque/venda/produção. */
    @Enumerated(EnumType.STRING)
    @Column(name = "unidade_medida")
    private EnumUnidadeMedida unidadeMedida;

    @Column(name = "preco_base")
    private BigDecimal precoBase;
}

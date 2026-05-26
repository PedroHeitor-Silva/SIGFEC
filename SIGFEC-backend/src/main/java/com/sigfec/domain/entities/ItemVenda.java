package com.sigfec.domain.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@Entity
@Table(name = "item_venda")
public class ItemVenda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "venda_id")
    @JsonIgnore
    private Venda venda;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "produto_id")
    private Produto produto;

    @Column(precision = 12, scale = 2)
    private BigDecimal quantidade;

    @Column(name = "valor_unitario", precision = 14, scale = 2)
    private BigDecimal valorUnitario;

    @Column(name = "subtotal", precision = 14, scale = 2)
    private BigDecimal subtotal;

    /** subtotal = quantidade × valorUnitario */
    public void calcularSubtotal() {
        if (quantidade != null && valorUnitario != null) {
            subtotal = quantidade.multiply(valorUnitario);
        } else {
            subtotal = BigDecimal.ZERO;
        }
    }
}

package com.sigfec.domain.entities;

import com.sigfec.domain.enums.EnumStatusVenda;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Entity
@Table(name = "venda")
public class Venda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Parceiro cliente;

    @Column(name = "data_venda")
    private LocalDate dataVenda;

    @OneToMany(mappedBy = "venda", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<ItemVenda> itens = new ArrayList<>();

    @Column(name = "valor_total", precision = 14, scale = 2)
    private BigDecimal valorTotal;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_venda")
    private EnumStatusVenda statusVenda;

    /** Número da nota — gerado na emissão (status FATURADA). */
    @Column(name = "numero_nota")
    private Integer numeroNota;

    private String observacao;

    /** Forma de pagamento combinada (null = a prazo em 30 dias, comportamento antigo). */
    @Enumerated(EnumType.STRING)
    @Column(name = "forma_pagamento")
    private com.sigfec.domain.enums.EnumFormaPagamento formaPagamento;

    /** Número de parcelas da conta a receber (1 a 12; à vista = 1). */
    @Column(name = "parcelas")
    private Integer parcelas;

    @Column(name = "data_criacao")
    private LocalDateTime dataCriacao;

    @PrePersist
    public void prePersist() {
        if (dataVenda == null) dataVenda = LocalDate.now();
        if (statusVenda == null) statusVenda = EnumStatusVenda.ORCAMENTO;
        dataCriacao = LocalDateTime.now();
        recalcular();
    }

    @PreUpdate
    public void preUpdate() {
        recalcular();
    }

    /** Soma os subtotais dos itens. */
    public void recalcular() {
        if (itens != null) {
            itens.forEach(ItemVenda::calcularSubtotal);
            valorTotal = itens.stream()
                    .map(i -> i.getSubtotal() != null ? i.getSubtotal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
    }
}

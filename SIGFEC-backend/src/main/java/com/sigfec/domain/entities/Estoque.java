package com.sigfec.domain.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Saldo de estoque de um produto. Um registro por produto (OneToOne).
 * quantidadeAtual cai nas vendas, sobe na produção de lotes.
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "estoque")
public class Estoque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "produto_id", unique = true)
    private Produto produto;

    @Column(name = "quantidade_atual")
    private Double quantidadeAtual;

    @Column(name = "quantidade_minima")
    private Double quantidadeMinima;

    @Column(name = "ultima_atualizacao")
    private LocalDateTime ultimaAtualizacao;

    @PrePersist
    @PreUpdate
    public void preUpdate() {
        if (quantidadeAtual == null) quantidadeAtual = 0.0;
        if (quantidadeMinima == null) quantidadeMinima = 0.0;
        this.ultimaAtualizacao = LocalDateTime.now();
    }

    /** True se o saldo está igual ou abaixo do mínimo configurado. */
    @Transient
    public boolean isAbaixoMinimo() {
        double atual = quantidadeAtual != null ? quantidadeAtual : 0.0;
        double min = quantidadeMinima != null ? quantidadeMinima : 0.0;
        return min > 0 && atual <= min;
    }
}

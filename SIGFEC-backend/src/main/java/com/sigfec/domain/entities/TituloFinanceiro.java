package com.sigfec.domain.entities;

import com.sigfec.domain.enums.EnumStatusFinanceiro;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "tipo_titulo", discriminatorType = DiscriminatorType.STRING)
@Table(name = "titulo_financeiro")
public abstract class TituloFinanceiro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "data_emissao")
    private LocalDate dataEmissao;

    @Column(name = "data_vencimento")
    private LocalDate dataVencimento;

    @Column(name = "valor_original", precision = 14, scale = 2)
    private BigDecimal valorOriginal;

    @Column(name = "valor_pago", precision = 14, scale = 2)
    private BigDecimal valorPago;

    @Column(name = "data_pagamento")
    private LocalDate dataPagamento;

    @Column(name = "forma_pagamento")
    private String formaPagamento; // DINHEIRO, PIX, TRANSFERENCIA, BOLETO, CHEQUE

    @Enumerated(EnumType.STRING)
    @Column(name = "status_financeiro")
    private EnumStatusFinanceiro statusFinanceiro;

    private String descricao;

    @Column(name = "data_criacao")
    private LocalDateTime dataCriacao;

    @PrePersist
    public void prePersist() {
        if (dataEmissao == null) dataEmissao = LocalDate.now();
        if (valorPago == null) valorPago = BigDecimal.ZERO;
        atualizarStatus();
        dataCriacao = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        atualizarStatus();
    }

    /** Ao ler do banco: um título que venceu desde o último salvamento já aparece como ATRASADO. */
    @PostLoad
    public void postLoad() {
        atualizarStatus();
    }

    /** Saldo restante = valorOriginal - valorPago */
    @Transient
    public BigDecimal getSaldo() {
        BigDecimal orig = valorOriginal != null ? valorOriginal : BigDecimal.ZERO;
        BigDecimal pago = valorPago != null ? valorPago : BigDecimal.ZERO;
        return orig.subtract(pago).max(BigDecimal.ZERO);
    }

    /** Define status: PAGO se quitado, ATRASADO se vencido, senão ABERTO. */
    private void atualizarStatus() {
        if (statusFinanceiro == EnumStatusFinanceiro.CANCELADO) return;
        BigDecimal orig = valorOriginal != null ? valorOriginal : BigDecimal.ZERO;
        BigDecimal pago = valorPago != null ? valorPago : BigDecimal.ZERO;
        if (pago.compareTo(orig) >= 0 && orig.compareTo(BigDecimal.ZERO) > 0) {
            statusFinanceiro = EnumStatusFinanceiro.PAGO;
        } else if (dataVencimento != null && dataVencimento.isBefore(LocalDate.now())) {
            statusFinanceiro = EnumStatusFinanceiro.ATRASADO;
        } else {
            statusFinanceiro = EnumStatusFinanceiro.ABERTO;
        }
    }
}

package com.sigfec.domain.entities;

import com.sigfec.domain.enums.EnumTipoMovEstoque;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Histórico (Kardex) de cada movimentação de estoque.
 * Rastreabilidade: quem, quando, por quê.
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "movimentacao_estoque")
public class MovimentacaoEstoque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "produto_id")
    private Produto produto;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false)
    private EnumTipoMovEstoque tipo;

    /** Quantidade SEMPRE positiva — sinal é dado pelo tipo. */
    @Column(name = "quantidade", nullable = false)
    private Double quantidade;

    /** Saldo do estoque APÓS aplicar essa movimentação. */
    @Column(name = "saldo_pos")
    private Double saldoPos;

    /** Texto livre: motivo, observação. */
    @Column(name = "motivo")
    private String motivo;

    /** Origem (lote_id, venda_id, usuario_login etc) — referência opcional. */
    @Column(name = "origem_tipo")
    private String origemTipo;

    @Column(name = "origem_id")
    private Long origemId;

    @Column(name = "usuario")
    private String usuario;

    @Column(name = "data_hora", nullable = false)
    private LocalDateTime dataHora;

    @PrePersist
    public void prePersist() {
        if (dataHora == null) dataHora = LocalDateTime.now();
    }
}

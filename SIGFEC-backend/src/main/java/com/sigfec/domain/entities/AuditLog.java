package com.sigfec.domain.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Trilha de auditoria: registra ações sensíveis (login, mudança de status,
 * exclusões etc) pra rastreabilidade e compliance.
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "audit_log", indexes = {
    @Index(name = "idx_audit_user", columnList = "usuario"),
    @Index(name = "idx_audit_data", columnList = "data_hora")
})
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Login do usuário que executou a ação. */
    @Column(name = "usuario", length = 80)
    private String usuario;

    /** Ação executada: ex. "VENDA_CONFIRMADA", "LOTE_FINALIZADO", "LOGIN_OK". */
    @Column(name = "acao", nullable = false, length = 80)
    private String acao;

    /** Entidade alvo: ex. "Venda", "LoteProducao", "Usuario". */
    @Column(name = "entidade", length = 80)
    private String entidade;

    /** ID do registro afetado. */
    @Column(name = "entidade_id")
    private Long entidadeId;

    /** Detalhes (JSON ou texto). */
    @Column(name = "detalhe", length = 1000)
    private String detalhe;

    /** IP de origem. */
    @Column(name = "ip", length = 45)
    private String ip;

    @Column(name = "data_hora", nullable = false)
    private LocalDateTime dataHora;

    @PrePersist
    public void prePersist() {
        if (dataHora == null) dataHora = LocalDateTime.now();
    }
}

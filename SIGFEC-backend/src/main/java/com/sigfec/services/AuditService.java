package com.sigfec.services;

import com.sigfec.domain.entities.AuditLog;
import com.sigfec.repositories.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Registra eventos auditáveis (mudança de status, exclusões, login etc).
 * Uso: auditService.log("LOTE_FINALIZADO", "LoteProducao", lote.getId(), "qtd=" + qtd);
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repository;

    public void log(String acao, String entidade, Long entidadeId, String detalhe) {
        try {
            AuditLog a = new AuditLog();
            a.setUsuario(usuarioAtual());
            a.setAcao(acao);
            a.setEntidade(entidade);
            a.setEntidadeId(entidadeId);
            a.setDetalhe(detalhe);
            repository.save(a);
        } catch (Exception e) {
            // Auditoria nunca deve quebrar o fluxo
            log.warn("Falha ao gravar auditoria: {}", e.getMessage());
        }
    }

    private String usuarioAtual() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            return auth != null ? auth.getName() : "sistema";
        } catch (Exception e) { return "sistema"; }
    }
}

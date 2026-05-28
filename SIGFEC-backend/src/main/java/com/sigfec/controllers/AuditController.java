package com.sigfec.controllers;

import com.sigfec.domain.entities.AuditLog;
import com.sigfec.repositories.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Consulta da trilha de auditoria — somente ADMIN.
 */
@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository repository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<AuditLog> listar(
            @RequestParam(value = "usuario", required = false) String usuario,
            @RequestParam(value = "entidade", required = false) String entidade,
            @RequestParam(value = "entidadeId", required = false) Long entidadeId) {
        if (entidade != null && entidadeId != null) {
            return repository.findByEntidadeAndEntidadeIdOrderByDataHoraDesc(entidade, entidadeId);
        }
        if (usuario != null) {
            return repository.findByUsuarioOrderByDataHoraDesc(usuario);
        }
        return repository.findTop200ByOrderByDataHoraDesc();
    }
}

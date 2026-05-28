package com.sigfec.repositories;

import com.sigfec.domain.entities.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop200ByOrderByDataHoraDesc();
    List<AuditLog> findByUsuarioOrderByDataHoraDesc(String usuario);
    List<AuditLog> findByEntidadeAndEntidadeIdOrderByDataHoraDesc(String entidade, Long entidadeId);
}

package com.sigfec.repositories;

import com.sigfec.domain.entities.ChecklistCarga;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChecklistCargaRepository extends JpaRepository<ChecklistCarga, Long> {

    /** Checklist de uma entrada da fila (1:1). */
    Optional<ChecklistCarga> findByEntradaFilaId(Long entradaFilaId);

    /** Checklists de várias entradas de uma vez (evita N+1 ao listar a fila). */
    List<ChecklistCarga> findByEntradaFilaIdIn(Collection<Long> entradaFilaIds);
}

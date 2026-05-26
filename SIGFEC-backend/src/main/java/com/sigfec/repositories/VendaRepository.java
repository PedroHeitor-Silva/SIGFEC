package com.sigfec.repositories;

import com.sigfec.domain.entities.Venda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VendaRepository extends JpaRepository<Venda, Long> {

    /** Maior número de nota já emitido — base para o próximo sequencial. */
    Venda findTopByNumeroNotaNotNullOrderByNumeroNotaDesc();
}

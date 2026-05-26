package com.sigfec.repositories;

import com.sigfec.domain.entities.LoteProducao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LoteProducaoRepository extends JpaRepository<LoteProducao, Long> {

    Optional<LoteProducao> findByCodigoLote(String codigoLote);
}

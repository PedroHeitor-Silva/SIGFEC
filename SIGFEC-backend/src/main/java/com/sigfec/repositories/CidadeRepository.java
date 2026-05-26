package com.sigfec.repositories;

import com.sigfec.domain.entities.Cidade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CidadeRepository extends JpaRepository<Cidade, Long> {

    List<Cidade> findByEstadoSiglaIgnoreCaseOrderByNomeAsc(String sigla);

    List<Cidade> findByEstadoIdOrderByNomeAsc(Long estadoId);
}

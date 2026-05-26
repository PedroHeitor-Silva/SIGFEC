package com.sigfec.repositories;

import com.sigfec.domain.entities.Pesagem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PesagemRepository extends JpaRepository<Pesagem, Long> {
    /** Pesagens ainda não consumidas por nenhum lote — disponíveis pra produção. */
    List<Pesagem> findByConsumidaFalse();
}

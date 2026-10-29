package com.sigfec.repositories;

import com.sigfec.domain.entities.AnaliseLaboratorio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnaliseLaboratorioRepository extends JpaRepository<AnaliseLaboratorio, Long> {

    /** Pesagem já tem laudo? (bloqueia exclusão da pesagem) */
    boolean existsByPesagemId(Long pesagemId);

    java.util.Optional<AnaliseLaboratorio> findByPesagemId(Long pesagemId);
}

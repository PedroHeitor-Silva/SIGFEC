package com.sigfec.repositories;

import com.sigfec.domain.entities.Parceiro;
import com.sigfec.domain.dto.ParceiroResumoDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParceiroRepository extends JpaRepository<Parceiro, Long> {

    @Query("SELECT new com.sigfec.domain.dto.ParceiroResumoDTO(p.id, p.nome) FROM Parceiro p")
    List<ParceiroResumoDTO> findResumo();
}

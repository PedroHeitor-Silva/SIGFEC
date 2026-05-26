package com.sigfec.repositories;

import com.sigfec.domain.entities.AnaliseLaboratorio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnaliseLaboratorioRepository extends JpaRepository<AnaliseLaboratorio, Long> {
}

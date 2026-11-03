package com.sigfec.repositories;

import com.sigfec.domain.entities.ParametroSistema;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ParametroSistemaRepository extends JpaRepository<ParametroSistema, String> {
}

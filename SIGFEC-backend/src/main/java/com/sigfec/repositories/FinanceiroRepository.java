package com.sigfec.repositories;

import com.sigfec.domain.entities.TituloFinanceiro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FinanceiroRepository extends JpaRepository<TituloFinanceiro, Long> {
}

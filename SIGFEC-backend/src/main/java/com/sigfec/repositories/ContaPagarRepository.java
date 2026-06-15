package com.sigfec.repositories;

import com.sigfec.domain.entities.ContaPagar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContaPagarRepository extends JpaRepository<ContaPagar, Long> {

    /** Verifica vínculo com fornecedor — usado antes de excluir parceiro. */
    boolean existsByFornecedor_Id(Long fornecedorId);
}

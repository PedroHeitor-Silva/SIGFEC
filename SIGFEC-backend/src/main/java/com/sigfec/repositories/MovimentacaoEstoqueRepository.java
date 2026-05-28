package com.sigfec.repositories;

import com.sigfec.domain.entities.MovimentacaoEstoque;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovimentacaoEstoqueRepository extends JpaRepository<MovimentacaoEstoque, Long> {
    List<MovimentacaoEstoque> findByProduto_IdOrderByDataHoraDesc(Long produtoId);
    List<MovimentacaoEstoque> findAllByOrderByDataHoraDesc();
}

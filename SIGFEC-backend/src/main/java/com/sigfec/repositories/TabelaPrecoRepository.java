package com.sigfec.repositories;

import com.sigfec.domain.entities.TabelaPreco;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TabelaPrecoRepository extends JpaRepository<TabelaPreco, Long> {

    List<TabelaPreco> findByProdutoIdOrderByDataInicioDesc(Long produtoId);

    @Query("""
        SELECT t FROM TabelaPreco t
        WHERE t.produto.id = :produtoId
          AND t.dataInicio <= :data
          AND (t.dataFim IS NULL OR t.dataFim >= :data)
        ORDER BY t.dataInicio DESC
    """)
    List<TabelaPreco> findVigentes(@Param("produtoId") Long produtoId, @Param("data") LocalDate data);

    default Optional<TabelaPreco> findVigente(Long produtoId, LocalDate data) {
        List<TabelaPreco> list = findVigentes(produtoId, data);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}

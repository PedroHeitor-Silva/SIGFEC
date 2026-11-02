package com.sigfec.repositories;

import com.sigfec.domain.entities.Produto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProdutoRepository extends JpaRepository<Produto, Long> {

    /** Primeiro produto da categoria (ex.: o resíduo fibroso gerado pela produção). */
    java.util.Optional<Produto> findFirstByCategoria(com.sigfec.domain.enums.EnumCategoriaProduto categoria);

}

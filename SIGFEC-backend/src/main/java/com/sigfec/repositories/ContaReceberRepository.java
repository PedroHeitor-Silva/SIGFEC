package com.sigfec.repositories;

import com.sigfec.domain.entities.ContaReceber;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContaReceberRepository extends JpaRepository<ContaReceber, Long> {

    /** Localiza a conta pela cobrança Asaas — usado no webhook. */
    Optional<ContaReceber> findByAsaasPaymentId(String asaasPaymentId);

    /** Verifica vínculo com cliente — usado antes de excluir parceiro. */
    boolean existsByCliente_Id(Long clienteId);

    /** Conta gerada na confirmação de uma venda (descrição "Venda #id"). */
    List<ContaReceber> findByDescricao(String descricao);

    /** Contas de uma venda: "Venda #id" (pagamento único) ou "Venda #id - parcela i/N". */
    List<ContaReceber> findByDescricaoOrDescricaoStartingWith(String descricao, String prefixoParcela);
}

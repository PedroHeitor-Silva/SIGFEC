package com.sigfec.repositories;

import com.sigfec.domain.entities.EntradaFila;
import com.sigfec.domain.enums.EnumStatusEntrada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface EntradaFilaRepository extends JpaRepository<EntradaFila, Long> {

    /** Fila do dia + entradas ainda ativas de dias anteriores (caminhão que virou a meia-noite na fila). */
    List<EntradaFila> findByDataReferenciaOrStatusInOrderByDataReferenciaAscSenhaDiariaAsc(
            LocalDate dataReferencia, Collection<EnumStatusEntrada> ativos);

    /** Entradas em um conjunto de status, na ordem de chegada (dia, depois senha). */
    List<EntradaFila> findByStatusInOrderByDataReferenciaAscSenhaDiariaAsc(Collection<EnumStatusEntrada> status);

    /** Última senha emitida no dia (para calcular a próxima). */
    Optional<EntradaFila> findTopByDataReferenciaOrderBySenhaDiariaDesc(LocalDate dataReferencia);

    /** Veículo já está na fila (entrada ativa)? */
    boolean existsByVeiculoIdAndStatusIn(Long veiculoId, Collection<EnumStatusEntrada> status);

    /** Motorista já está na fila (entrada ativa)? */
    boolean existsByMotoristaIdAndStatusIn(Long motoristaId, Collection<EnumStatusEntrada> status);

    /** Quem ocupa um local de chamada (chamado ou em atendimento). */
    Optional<EntradaFila> findFirstByLocalChamadaAndStatusIn(String localChamada, Collection<EnumStatusEntrada> status);

    /** Entrada já vinculada a uma pesagem? */
    boolean existsByPesagemId(Long pesagemId);
}

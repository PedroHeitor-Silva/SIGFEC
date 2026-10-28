package com.sigfec.domain.entities;

import com.sigfec.domain.enums.EnumStatusEntrada;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entrada de um veículo na fila de descarga do pátio.
 * Fluxo: chegada -> checklist aprovado -> chamada para um local (balança) -> atendimento -> pesagem.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "entrada_fila", uniqueConstraints = @UniqueConstraint(
        name = "uk_entrada_fila_senha_dia", columnNames = {"data_referencia", "senha_diaria"}))
public class EntradaFila {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Veículo que chegou ao pátio. */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "veiculo_id")
    private Veiculo veiculo;

    /** Motorista no volante (pode diferir do motorista padrão do veículo). */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "motorista_id")
    private Motorista motorista;

    /** Produtor dono da carga de mandioca (opcional na chegada). */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "produtor_id")
    private Parceiro produtor;

    /** Senha/número sequencial do dia (reinicia a cada dataReferencia). */
    @Column(name = "senha_diaria")
    private Integer senhaDiaria;

    /** Dia de referência da fila (usado para a sequência diária). */
    @Column(name = "data_referencia")
    private LocalDate dataReferencia;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private EnumStatusEntrada status = EnumStatusEntrada.AGUARDANDO;

    /** Para onde o veículo foi chamado (ex.: "Balança 1"). */
    @Column(name = "local_chamada", length = 60)
    private String localChamada;

    @Column(name = "data_hora_entrada")
    private LocalDateTime dataHoraEntrada;

    @Column(name = "data_hora_chamada")
    private LocalDateTime dataHoraChamada;

    @Column(name = "data_hora_finalizacao")
    private LocalDateTime dataHoraFinalizacao;

    private String observacao;

    /** Pesagem gerada ao finalizar a entrada (null enquanto na fila). */
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "pesagem_id")
    private Pesagem pesagem;

    /** Tempo de espera na fila em segundos (entrada -> chamada). */
    @Transient
    public Long getTempoEsperaSegundos() {
        if (dataHoraEntrada == null) return null;
        LocalDateTime fim = dataHoraChamada != null ? dataHoraChamada : LocalDateTime.now();
        return Duration.between(dataHoraEntrada, fim).getSeconds();
    }

    /** Ainda ocupa a fila (não finalizada nem cancelada). */
    @Transient
    public boolean isAtiva() {
        return status == EnumStatusEntrada.AGUARDANDO
                || status == EnumStatusEntrada.CHAMADO
                || status == EnumStatusEntrada.EM_ATENDIMENTO;
    }
}

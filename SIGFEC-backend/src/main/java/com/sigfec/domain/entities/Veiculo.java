package com.sigfec.domain.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "veiculo")
public class Veiculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(unique = true, nullable = false)
    private String placa;

    /** Marca (ex: Scania, Volvo, Mercedes). */
    private String marca;

    /** Modelo (ex: R450, FH540). */
    private String modelo;

    /** Tara em kg (peso do veículo vazio). */
    private Double tara;

    /** Capacidade máxima de carga em kg. */
    @Column(name = "capacidade_kg")
    private Double capacidadeKg;

    /** Tipo: TOCO, TRUCK, CARRETA, BITREM, RODOTREM. */
    @Column(name = "tipo_veiculo", length = 20)
    private String tipoVeiculo;

    /** Quantidade de eixos. */
    private Integer eixos;

    /** Motorista padrão do veículo. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "motorista_id")
    private Motorista motorista;

    /** Data de licenciamento/CRLV. */
    @Column(name = "data_licenciamento")
    private LocalDate dataLicenciamento;

    /** Veículo ativo (em uso) ou inativo (desativado, sem excluir). */
    @Column(name = "status_ativo")
    private boolean statusAtivo = true;

    private String observacao;

    /** True se o licenciamento está vencido. */
    @Transient
    public boolean isLicenciamentoVencido() {
        return dataLicenciamento != null && dataLicenciamento.isBefore(LocalDate.now());
    }

    /** Dias até vencer o licenciamento (negativo se vencido). */
    @Transient
    public Long getDiasParaVencerLicenciamento() {
        if (dataLicenciamento == null) return null;
        return ChronoUnit.DAYS.between(LocalDate.now(), dataLicenciamento);
    }
}

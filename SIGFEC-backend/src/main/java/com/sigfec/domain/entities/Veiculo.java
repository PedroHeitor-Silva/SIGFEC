package com.sigfec.domain.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    private String modelo;

    /** Tara em kg (peso do veículo vazio). */
    private Double tara;

    /** Capacidade máxima de carga em kg (PBT - tara). */
    @Column(name = "capacidade_kg")
    private Double capacidadeKg;

    /** Tipo: TRUCK, CARRETA, BITREM, TOCO, etc. */
    @Column(name = "tipo_veiculo", length = 20)
    private String tipoVeiculo;
}

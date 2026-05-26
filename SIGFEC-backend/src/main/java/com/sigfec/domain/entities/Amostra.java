package com.sigfec.domain.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Amostra individual coletada de uma carga para medição de renda
 * na balança hidrostática. Cada análise tem 2 a 4 amostras.
 *
 * rendaGramas = leitura direta da balança hidrostática (escala 0-650 g),
 * para amostra-padrão de 5 kg de raízes de mandioca.
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "amostra")
public class Amostra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_amostra")
    private Integer numeroAmostra;

    /** Leitura da balança hidrostática em gramas (renda). Faixa típica 280-650. */
    @Column(name = "renda_gramas", precision = 7, scale = 2)
    private BigDecimal rendaGramas;

    @ManyToOne
    @JoinColumn(name = "analise_id")
    @JsonIgnore
    private AnaliseLaboratorio analise;
}

package com.sigfec.domain.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Entity
@Table(name = "pesagem")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Pesagem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "produtor_id")
    private Parceiro produtor;

    @ManyToOne
    @JoinColumn(name = "veiculo_id")
    private Veiculo veiculo;

    @ManyToOne
    @JoinColumn(name = "produto_id")
    private Produto produto;

    @Column(name = "peso_bruto", precision = 12, scale = 2)
    private BigDecimal pesoBruto;

    @Column(name = "peso_tara", precision = 12, scale = 2)
    private BigDecimal pesoTara;

    @Column(name = "peso_liquido", precision = 12, scale = 2)
    private BigDecimal pesoLiquido;

    @Column(name = "percentual_impureza", precision = 5, scale = 2)
    private BigDecimal percentualImpureza;

    @Column(name = "peso_final", precision = 12, scale = 2)
    private BigDecimal pesoFinal;

    @Column(name = "gramas_amido", precision = 8, scale = 2)
    private BigDecimal gramasAmido;

    @Column(name = "valor_total", precision = 14, scale = 2)
    private BigDecimal valorTotal;

    @Column(name = "data_hora_entrada")
    private LocalDateTime dataHoraEntrada;

    /** True quando a pesagem já foi consumida por um lote de produção (rastreabilidade). */
    @Column(name = "consumida", columnDefinition = "boolean default false not null")
    private boolean consumida;

    @PrePersist
    @PreUpdate
    public void calcularCampos() {
        // Peso líquido e final calculados na pesagem.
        // valorTotal e gramasAmido (renda) são preenchidos pela AnaliseLaboratorioService
        // após a análise de renda multi-amostra na balança hidrostática.
        if (pesoBruto != null && pesoTara != null) {
            pesoLiquido = pesoBruto.subtract(pesoTara).max(BigDecimal.ZERO);
            BigDecimal impureza = percentualImpureza == null ? BigDecimal.ZERO : percentualImpureza;
            BigDecimal fator = BigDecimal.ONE.subtract(impureza.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
            pesoFinal = pesoLiquido.multiply(fator).setScale(2, RoundingMode.HALF_UP);
        }
        if (dataHoraEntrada == null) dataHoraEntrada = LocalDateTime.now();
    }
}

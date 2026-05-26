package com.sigfec.domain.entities;

import com.sigfec.domain.enums.EnumStatusLote;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Data
@NoArgsConstructor
@Entity
@Table(name = "lote_producao")
public class LoteProducao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo_lote", unique = true, nullable = false)
    private String codigoLote;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "produto_id")
    private Produto produto;

    @Column(name = "data_fabricacao")
    private LocalDate dataFabricacao;

    @Column(name = "validade")
    private LocalDate validade;

    @Column(name = "quantidade_produzida", precision = 12, scale = 2)
    private BigDecimal quantidadeProduzida;

    @Column(name = "rendimento_real", precision = 5, scale = 2)
    private BigDecimal rendimentoReal;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_lote")
    private EnumStatusLote statusLote;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "lote_pesagem",
            joinColumns = @JoinColumn(name = "lote_id"),
            inverseJoinColumns = @JoinColumn(name = "pesagem_id")
    )
    private Set<Pesagem> pesagensConsumidas = new HashSet<>();

    private String observacao;

    @Column(name = "data_criacao")
    private LocalDateTime dataCriacao;

    @PrePersist
    @PreUpdate
    public void recalcular() {
        if (dataCriacao == null) dataCriacao = LocalDateTime.now();
        if (statusLote == null) statusLote = EnumStatusLote.EM_PRODUCAO;
        if (dataFabricacao == null) dataFabricacao = LocalDate.now();

        // Rendimento = (quantidadeProduzida_em_kg / soma_pesoFinal_pesagens) * 100
        // Converte produzido pra kg conforme a unidade do produto (saco 25kg, tonelada etc).
        if (quantidadeProduzida != null && pesagensConsumidas != null && !pesagensConsumidas.isEmpty()) {
            BigDecimal totalEntrada = pesagensConsumidas.stream()
                    .map(p -> p.getPesoFinal() != null ? p.getPesoFinal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            double fatorKg = (produto != null && produto.getUnidadeMedida() != null)
                    ? produto.getUnidadeMedida().getFatorKg() : 1.0;
            BigDecimal qtdKg = quantidadeProduzida.multiply(BigDecimal.valueOf(fatorKg));
            if (totalEntrada.compareTo(BigDecimal.ZERO) > 0) {
                rendimentoReal = qtdKg
                        .divide(totalEntrada, 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100"))
                        .setScale(2, RoundingMode.HALF_UP);
            }
        }
    }
}

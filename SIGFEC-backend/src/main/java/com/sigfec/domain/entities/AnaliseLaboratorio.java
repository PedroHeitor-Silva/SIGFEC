package com.sigfec.domain.entities;

import com.sigfec.domain.enums.EnumMetodoSecagem;
import com.sigfec.domain.enums.EnumStatusQualidade;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Entity
@Table(name = "analise_qualidade")
public class AnaliseLaboratorio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "pesagem_id")
    private Pesagem pesagem;

    /**
     * Amostras coletadas da carga (2 a 4). Renda final = média sem descarte.
     * Cascade ALL: amostras vivem junto da análise.
     */
    @OneToMany(mappedBy = "analise", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<Amostra> amostras = new ArrayList<>();

    /** Renda média das amostras (gramas) — base do pagamento ao produtor. */
    @Column(name = "renda_media", precision = 7, scale = 2)
    private BigDecimal rendaMedia;

    // Análise físico-química do produto/carga
    @Column(name = "umidade", precision = 5, scale = 2)
    private BigDecimal umidade;

    @Column(name = "ph", precision = 4, scale = 2)
    private BigDecimal ph;

    @Column(name = "acidez", precision = 5, scale = 2)
    private BigDecimal acidez;

    @Column(name = "granulometria")
    private Integer granulometria;

    @Column(name = "cor")
    private String cor;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_secagem")
    private EnumMetodoSecagem metodoSecagem;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_qualidade")
    private EnumStatusQualidade statusQualidade;

    private String observacao;

    @Column(name = "data_criacao")
    private LocalDateTime dataCriacao;

    @Column(name = "data_atualizacao")
    private LocalDateTime dataAtualizacao;

    @PrePersist
    public void prePersist() {
        dataCriacao = LocalDateTime.now();
        dataAtualizacao = LocalDateTime.now();
        recalcular();
    }

    @PreUpdate
    public void preUpdate() {
        dataAtualizacao = LocalDateTime.now();
        recalcular();
    }

    /** Recalcula renda média e classifica status. Sem descarte de amostras (prática ABAM). */
    public void recalcular() {
        if (amostras != null && !amostras.isEmpty()) {
            BigDecimal soma = amostras.stream()
                    .map(a -> a.getRendaGramas() != null ? a.getRendaGramas() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            rendaMedia = soma.divide(BigDecimal.valueOf(amostras.size()), 2, RoundingMode.HALF_UP);
        }
        classificar();
    }

    private void classificar() {
        if (rendaMedia == null) {
            statusQualidade = EnumStatusQualidade.AGUARDANDO_ANALISE;
            return;
        }
        // Faixas de renda (g por amostra de 5 kg) — referência mercado fecularia
        if (rendaMedia.compareTo(new BigDecimal("500")) >= 0) statusQualidade = EnumStatusQualidade.APROVADO;
        else if (rendaMedia.compareTo(new BigDecimal("350")) >= 0) statusQualidade = EnumStatusQualidade.APROVADO_COM_DESCONTO;
        else statusQualidade = EnumStatusQualidade.REPROVADO;
    }
}

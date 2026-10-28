package com.sigfec.domain.entities;

import com.sigfec.domain.enums.EnumStatusChecklist;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * Inspeção do veículo/carga antes da descarga (checklist de higiene e conservação).
 * Perguntas fixas do formulário oficial de fecularia — respostas SIM (true) / NÃO (false).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "checklist_carga")
public class ChecklistCarga {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Entrada da fila inspecionada. */
    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "entrada_fila_id", unique = true)
    private EntradaFila entradaFila;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private EnumStatusChecklist status = EnumStatusChecklist.PENDENTE;

    // --- 10 perguntas fixas (SIM/NÃO) ---

    /** 1. Sem vestígios de transporte de produtos tóxicos ou contaminantes. */
    @Column(name = "sem_vestigios_toxicos")
    private Boolean semVestigiosToxicos;

    /** 2. Boas condições de higiene e limpeza geral da carreta. */
    @Column(name = "higiene_limpeza")
    private Boolean higieneLimpeza;

    /** 3. Boas condições de assoalho, paredes, tetos e guardas do caminhão. */
    @Column(name = "estrutura_conservada")
    private Boolean estruturaConservada;

    /** 4. Bom estado de lona/corda (conservação e higiene). */
    @Column(name = "lona_corda_ok")
    private Boolean lonaCordaOk;

    /** 5. Ausência de insetos, roedores, alimentos deteriorados etc. */
    @Column(name = "ausencia_pragas")
    private Boolean ausenciaPragas;

    /** 6. Carroceria, lona e forro secos e sem odor estranho. */
    @Column(name = "secos_sem_odor")
    private Boolean secosSemOdor;

    /** 7. Forro em boas condições e em quantidade suficiente. */
    @Column(name = "forro_ok")
    private Boolean forroOk;

    /** 8. Ausência de sacaria suja, molhada e mofada. */
    @Column(name = "sacaria_limpa")
    private Boolean sacariaLimpa;

    /** 9. Sacarias sem avarias (furadas/rasgadas). */
    @Column(name = "sacaria_sem_avaria")
    private Boolean sacariaSemAvaria;

    /** 10. Lonas colocadas adequadamente. */
    @Column(name = "lonas_adequadas")
    private Boolean lonasAdequadas;

    // --- Metadados da avaliação ---

    private String observacao;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "avaliado_por_id")
    private Usuario avaliadoPor;

    @Column(name = "data_hora_avaliacao")
    private LocalDateTime dataHoraAvaliacao;

    /** As 10 respostas na ordem do formulário (null = não respondida). */
    @Transient
    public List<Boolean> getRespostas() {
        return Arrays.asList(semVestigiosToxicos, higieneLimpeza, estruturaConservada, lonaCordaOk,
                ausenciaPragas, secosSemOdor, forroOk, sacariaLimpa, sacariaSemAvaria, lonasAdequadas);
    }

    /**
     * Status derivado das respostas — nunca aceito do cliente.
     * REPROVADO se qualquer item for NÃO; APROVADO só com os 10 itens SIM; senão PENDENTE.
     */
    public EnumStatusChecklist calcularStatus() {
        List<Boolean> r = getRespostas();
        if (r.contains(Boolean.FALSE)) return EnumStatusChecklist.REPROVADO;
        if (r.contains(null)) return EnumStatusChecklist.PENDENTE;
        return EnumStatusChecklist.APROVADO;
    }
}

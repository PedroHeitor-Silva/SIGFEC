package com.sigfec.domain.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Parâmetro do sistema editável pelo administrador (chave → valor). O catálogo fica no ConfiguracaoService. */
@Data
@NoArgsConstructor
@Entity
@Table(name = "parametro_sistema")
public class ParametroSistema {

    @Id
    @Column(length = 80)
    private String chave;

    @Column(length = 4000)
    private String valor;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    @Column(name = "atualizado_por", length = 120)
    private String atualizadoPor;
}

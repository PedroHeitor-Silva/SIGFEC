package com.sigfec.domain.entities;

import com.sigfec.domain.enums.EnumPerfilAcesso;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "usuario")
@PrimaryKeyJoinColumn(name = "pessoa_id")
public class Usuario extends Pessoa {

    @Column(unique = true, nullable = false)
    private String login;

    @Column(nullable = false)
    private String senha;

    @Column(name = "status_ativo")
    private boolean statusAtivo;

    @Enumerated(EnumType.STRING)
    @Column(name = "perfil_acesso")
    private EnumPerfilAcesso perfilAcesso;
}

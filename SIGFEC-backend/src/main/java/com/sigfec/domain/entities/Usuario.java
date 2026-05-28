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

    /**
     * Permissões extras LIBERADAS além das padrões do perfil.
     * Formato CSV: "estoque:excluir,vendas:excluir,parceiros:excluir"
     * Cada entrada = "modulo:acao". Default vazio.
     */
    @Column(name = "permissoes_extras", length = 2000)
    private String permissoesExtras;

    /**
     * Permissões NEGADAS — removem permissões padrão do perfil.
     * Mesmo formato CSV. Útil pra restringir mais que o default.
     */
    @Column(name = "permissoes_negadas", length = 2000)
    private String permissoesNegadas;
}

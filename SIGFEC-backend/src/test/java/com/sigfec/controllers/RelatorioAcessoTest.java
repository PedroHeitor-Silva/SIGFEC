package com.sigfec.controllers;

import com.sigfec.domain.entities.Usuario;
import com.sigfec.domain.enums.EnumPerfilAcesso;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Cada relatório exige acesso ao módulo de origem — mesma regra das telas. */
class RelatorioAcessoTest {

    private static Usuario usuario(EnumPerfilAcesso perfil, String extras, String negadas) {
        Usuario u = new Usuario();
        u.setPerfilAcesso(perfil);
        u.setPermissoesExtras(extras);
        u.setPermissoesNegadas(negadas);
        return u;
    }

    @Test
    @DisplayName("Admin vê qualquer relatório")
    void adminVeTudo() {
        assertTrue(RelatorioController.podeVer(usuario(EnumPerfilAcesso.ADMIN, null, null), "financeiro"));
    }

    @Test
    @DisplayName("Balança vê relatórios da pesagem, mas não do financeiro")
    void balancaSoOperacional() {
        Usuario u = usuario(EnumPerfilAcesso.BALANCA, null, null);
        assertTrue(RelatorioController.podeVer(u, "pesagem"));
        assertFalse(RelatorioController.podeVer(u, "financeiro"));
    }

    @Test
    @DisplayName("Permissão extra libera e permissão negada bloqueia")
    void extrasENegadas() {
        assertTrue(RelatorioController.podeVer(usuario(EnumPerfilAcesso.BALANCA, "financeiro:ver", null), "financeiro"));
        assertFalse(RelatorioController.podeVer(usuario(EnumPerfilAcesso.BALANCA, null, "pesagem:ver"), "pesagem"));
    }
}

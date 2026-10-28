package com.sigfec.domain;

import com.sigfec.domain.entities.ChecklistCarga;
import com.sigfec.domain.enums.EnumStatusChecklist;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Regra de status do checklist: aprovado só com os 10 itens SIM; qualquer NÃO reprova. */
class ChecklistCargaTest {

    private static ChecklistCarga comTodas(Boolean v) {
        ChecklistCarga c = new ChecklistCarga();
        c.setSemVestigiosToxicos(v); c.setHigieneLimpeza(v); c.setEstruturaConservada(v);
        c.setLonaCordaOk(v); c.setAusenciaPragas(v); c.setSecosSemOdor(v); c.setForroOk(v);
        c.setSacariaLimpa(v); c.setSacariaSemAvaria(v); c.setLonasAdequadas(v);
        return c;
    }

    @Test
    @DisplayName("10 itens SIM = APROVADO")
    void todosSim() {
        assertEquals(EnumStatusChecklist.APROVADO, comTodas(true).calcularStatus());
    }

    @Test
    @DisplayName("Nenhum item respondido = PENDENTE")
    void nenhumRespondido() {
        assertEquals(EnumStatusChecklist.PENDENTE, comTodas(null).calcularStatus());
    }

    @Test
    @DisplayName("Resposta parcial só com SIM continua PENDENTE (não reprova)")
    void parcialSoSim() {
        ChecklistCarga c = comTodas(null);
        c.setSemVestigiosToxicos(true);
        c.setHigieneLimpeza(true);
        c.setEstruturaConservada(true);
        assertEquals(EnumStatusChecklist.PENDENTE, c.calcularStatus());
    }

    @Test
    @DisplayName("Um único NÃO reprova, mesmo com itens em branco")
    void umNaoReprova() {
        ChecklistCarga c = comTodas(null);
        c.setAusenciaPragas(false);
        assertEquals(EnumStatusChecklist.REPROVADO, c.calcularStatus());
    }

    @Test
    @DisplayName("Nove SIM e um NÃO = REPROVADO")
    void noveSimUmNao() {
        ChecklistCarga c = comTodas(true);
        c.setLonasAdequadas(false);
        assertEquals(EnumStatusChecklist.REPROVADO, c.calcularStatus());
    }
}

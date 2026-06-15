package com.sigfec.domain;

import com.sigfec.domain.entities.Amostra;
import com.sigfec.domain.entities.AnaliseLaboratorio;
import com.sigfec.domain.enums.EnumStatusQualidade;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Testes do cálculo da renda média e classificação da Análise Laboratorial.
 * Renda média = média das amostras SEM descarte (prática ABAM).
 * Classificação: >=500 APROVADO; >=350 APROVADO_COM_DESCONTO; <350 REPROVADO.
 */
class AnaliseLaboratorioTest {

    private Amostra amostra(double gramas) {
        Amostra a = new Amostra();
        a.setRendaGramas(new BigDecimal(String.valueOf(gramas)));
        return a;
    }

    @Test
    @DisplayName("Renda média = média simples das amostras (sem descarte)")
    void calculaRendaMedia() {
        AnaliseLaboratorio an = new AnaliseLaboratorio();
        an.setAmostras(List.of(amostra(480), amostra(520), amostra(500)));

        an.recalcular();

        // (480 + 520 + 500) / 3 = 500
        assertEquals(0, new BigDecimal("500.00").compareTo(an.getRendaMedia()));
    }

    @Test
    @DisplayName("Renda >= 500 classifica como APROVADO")
    void classificaAprovado() {
        AnaliseLaboratorio an = new AnaliseLaboratorio();
        an.setAmostras(List.of(amostra(510), amostra(530)));

        an.recalcular();

        assertEquals(EnumStatusQualidade.APROVADO, an.getStatusQualidade());
    }

    @Test
    @DisplayName("Renda entre 350 e 499 classifica como APROVADO_COM_DESCONTO")
    void classificaComDesconto() {
        AnaliseLaboratorio an = new AnaliseLaboratorio();
        an.setAmostras(List.of(amostra(400), amostra(420)));

        an.recalcular();

        assertEquals(EnumStatusQualidade.APROVADO_COM_DESCONTO, an.getStatusQualidade());
    }

    @Test
    @DisplayName("Renda abaixo de 350 classifica como REPROVADO")
    void classificaReprovado() {
        AnaliseLaboratorio an = new AnaliseLaboratorio();
        an.setAmostras(List.of(amostra(300), amostra(320)));

        an.recalcular();

        assertEquals(EnumStatusQualidade.REPROVADO, an.getStatusQualidade());
    }

    @Test
    @DisplayName("Sem amostras, status fica AGUARDANDO_ANALISE")
    void semAmostras() {
        AnaliseLaboratorio an = new AnaliseLaboratorio();

        an.recalcular();

        assertEquals(EnumStatusQualidade.AGUARDANDO_ANALISE, an.getStatusQualidade());
    }
}

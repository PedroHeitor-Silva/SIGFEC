package com.sigfec.domain;

import com.sigfec.domain.entities.Pesagem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Testes do cálculo de peso da Pesagem (regra de negócio crítica).
 * pesoLiquido = pesoBruto - pesoTara
 * pesoFinal   = pesoLiquido * (1 - percentualImpureza/100)
 */
class PesagemTest {

    @Test
    @DisplayName("Peso líquido = bruto - tara")
    void calculaPesoLiquido() {
        Pesagem p = new Pesagem();
        p.setPesoBruto(new BigDecimal("20000.00"));
        p.setPesoTara(new BigDecimal("8000.00"));
        p.setPercentualImpureza(BigDecimal.ZERO);

        p.calcularCampos();

        assertEquals(0, new BigDecimal("12000.00").compareTo(p.getPesoLiquido()));
    }

    @Test
    @DisplayName("Peso final aplica desconto de impureza (10%)")
    void calculaPesoFinalComImpureza() {
        Pesagem p = new Pesagem();
        p.setPesoBruto(new BigDecimal("20000.00"));
        p.setPesoTara(new BigDecimal("8000.00"));
        p.setPercentualImpureza(new BigDecimal("10")); // 10%

        p.calcularCampos();

        // líquido 12000 - 10% = 10800
        assertEquals(0, new BigDecimal("10800.00").compareTo(p.getPesoFinal()));
    }

    @Test
    @DisplayName("Sem impureza, peso final = peso líquido")
    void pesoFinalSemImpureza() {
        Pesagem p = new Pesagem();
        p.setPesoBruto(new BigDecimal("15000.00"));
        p.setPesoTara(new BigDecimal("5000.00"));
        p.setPercentualImpureza(BigDecimal.ZERO);

        p.calcularCampos();

        assertEquals(0, p.getPesoLiquido().compareTo(p.getPesoFinal()));
    }

    @Test
    @DisplayName("Peso líquido nunca fica negativo")
    void pesoLiquidoNaoNegativo() {
        Pesagem p = new Pesagem();
        p.setPesoBruto(new BigDecimal("5000.00"));
        p.setPesoTara(new BigDecimal("8000.00")); // tara maior que bruto
        p.setPercentualImpureza(BigDecimal.ZERO);

        p.calcularCampos();

        assertEquals(0, BigDecimal.ZERO.compareTo(p.getPesoLiquido()));
    }
}

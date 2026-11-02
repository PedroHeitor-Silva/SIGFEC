package com.sigfec.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/** Divide um valor em parcelas iguais; a diferença de arredondamento vai na última. */
public final class Parcelamento {

    public static final int MAXIMO = 12;

    private Parcelamento() {}

    public static List<BigDecimal> dividir(BigDecimal total, int parcelas) {
        if (total == null || total.signum() <= 0) throw RegraNegocioException.invalida("Valor a parcelar deve ser maior que zero.");
        validar(parcelas);
        BigDecimal base = total.divide(BigDecimal.valueOf(parcelas), 2, RoundingMode.DOWN);
        List<BigDecimal> valores = new ArrayList<>();
        for (int i = 1; i < parcelas; i++) valores.add(base);
        valores.add(total.subtract(base.multiply(BigDecimal.valueOf(parcelas - 1L))).setScale(2, RoundingMode.HALF_UP));
        return valores;
    }

    public static void validar(int parcelas) {
        if (parcelas < 1 || parcelas > MAXIMO) {
            throw RegraNegocioException.invalida("Número de parcelas deve ser de 1 a " + MAXIMO + ".");
        }
    }

    /** Sufixo da descrição: "" para pagamento único, " - parcela 2/3" para parcelado. */
    public static String sufixo(int numero, int total) {
        return total <= 1 ? "" : " - parcela " + numero + "/" + total;
    }
}

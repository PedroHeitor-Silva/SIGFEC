package com.sigfec.domain.enums;

/** Formas de pagamento aceitas em vendas e baixas de títulos. */
public enum EnumFormaPagamento {
    DINHEIRO,
    PIX,
    CARTAO_DEBITO,
    CARTAO_CREDITO,
    BOLETO,
    TRANSFERENCIA,
    CHEQUE;

    /** À vista: uma parcela só, vencendo na data da venda. */
    public boolean aVista() {
        return this == DINHEIRO || this == PIX || this == CARTAO_DEBITO;
    }
}

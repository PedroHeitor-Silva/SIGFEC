package com.sigfec.domain.enums;

/**
 * Tipos de movimentação de estoque.
 * Entrada SOMA na quantidadeAtual; saída SUBTRAI; ajuste pode ser ambos.
 */
public enum EnumTipoMovEstoque {
    ENTRADA_PRODUCAO,   // entrada via finalização de lote
    SAIDA_VENDA,        // saída pela confirmação de venda
    AJUSTE_ENTRADA,     // ajuste manual positivo
    AJUSTE_SAIDA,       // ajuste manual negativo
    DEVOLUCAO,          // cliente devolveu
    PERDA               // quebra/perda
}

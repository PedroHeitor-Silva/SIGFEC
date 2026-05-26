package com.sigfec.domain.enums;

/**
 * Unidade de medida de um produto. Definida no cadastro do produto e
 * usada de forma consistente em estoque, vendas e produção.
 * O fator em kg permite estimativas e relatórios padronizados.
 */
public enum EnumUnidadeMedida {

    KG("Quilograma", "kg", 1.0),
    SACO_25KG("Saco 25 kg", "sc 25kg", 25.0),
    SACO_50KG("Saco 50 kg", "sc 50kg", 50.0),
    TONELADA("Tonelada", "t", 1000.0);

    private final String descricao;
    private final String sigla;
    private final double fatorKg;

    EnumUnidadeMedida(String descricao, String sigla, double fatorKg) {
        this.descricao = descricao;
        this.sigla = sigla;
        this.fatorKg = fatorKg;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getSigla() {
        return sigla;
    }

    public double getFatorKg() {
        return fatorKg;
    }
}

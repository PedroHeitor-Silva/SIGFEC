package com.sigfec.domain.dto;

import java.util.List;
import java.util.Map;

/**
 * Relatório em formato tabular genérico: o front monta a tabela, os totais, a impressão (PDF)
 * e a exportação (CSV) a partir das colunas, sem conhecer o relatório.
 *
 * Tipos de coluna: texto, numero, peso (kg), moeda (R$), percentual, data, datahora.
 */
public record RelatorioDTO(
        String chave,
        String titulo,
        String descricao,
        List<Coluna> colunas,
        List<Map<String, Object>> linhas,
        Map<String, Object> totais,
        List<Indicador> indicadores
) {
    public record Coluna(String chave, String rotulo, String tipo) {}

    /** Número de destaque mostrado acima da tabela (ex.: "Peso final: 120.000 kg"). */
    public record Indicador(String rotulo, Object valor, String tipo) {}

    /** Item do catálogo: o que o usuário pode emitir e de qual módulo é. */
    public record Info(String chave, String titulo, String descricao, String modulo, boolean usaParceiro) {}
}

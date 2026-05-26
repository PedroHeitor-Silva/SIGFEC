package com.sigfec.domain.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PesagemResponseDTO(
    Long id,
    LocalDateTime dataHoraEntrada,
    String produtorNome,
    String produtoNome,
    String veiculoPlaca,
    BigDecimal pesoBruto,
    BigDecimal pesoTara,
    BigDecimal pesoLiquido,
    BigDecimal percentualImpureza,
    BigDecimal pesoFinal,
    BigDecimal gramasAmido,
    BigDecimal valorTotal,
    boolean consumida
) {}

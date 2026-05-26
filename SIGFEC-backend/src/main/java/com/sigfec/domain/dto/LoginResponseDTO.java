package com.sigfec.domain.dto;

import com.sigfec.domain.enums.EnumPerfilAcesso;

public record LoginResponseDTO(
    Long id,
    String nome,
    String login,
    boolean ativo,
    EnumPerfilAcesso perfil
) {}

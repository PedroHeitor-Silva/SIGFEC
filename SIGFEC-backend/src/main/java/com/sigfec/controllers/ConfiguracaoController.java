package com.sigfec.controllers;

import com.sigfec.services.AsaasService;
import com.sigfec.services.ConfiguracaoService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Configurações do sistema.
 *   GET  /api/configuracoes           (ADMIN) todos os parâmetros, segredos mascarados
 *   PUT  /api/configuracoes           (ADMIN) { "chave": "valor", ... } — vazio volta ao padrão
 *   POST /api/configuracoes/asaas/testar (ADMIN) testa a chave/ambiente atuais do Asaas
 *   GET  /api/configuracoes/publicas  (logado) dados da empresa e limites usados pelas telas
 */
@RestController
@RequestMapping("/api/configuracoes")
@RequiredArgsConstructor
public class ConfiguracaoController {

    private final ConfiguracaoService service;
    private final AsaasService asaasService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<ConfiguracaoService.Item> listar() {
        return service.listar();
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<ConfiguracaoService.Item> salvar(@RequestBody Map<String, String> valores) {
        return service.salvar(valores);
    }

    @PostMapping("/asaas/testar")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> testarAsaas() {
        return asaasService.testarConexao();
    }

    @GetMapping("/publicas")
    public Map<String, String> publicas() {
        return service.publicos();
    }
}

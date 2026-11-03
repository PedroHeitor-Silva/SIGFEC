package com.sigfec.controllers;

import com.sigfec.services.AsaasService;
import com.sigfec.services.ConfiguracaoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Recebe webhooks do Asaas. Endpoint público (configurado no SecurityConfig).
 * A autenticidade é validada por um token compartilhado enviado no header
 * "asaas-access-token" (configurado no painel do Asaas).
 */
@Slf4j
@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private final AsaasService asaasService;
    private final ConfiguracaoService configuracao;

    @PostMapping("/asaas")
    public ResponseEntity<Void> asaas(
            @RequestHeader(value = "asaas-access-token", required = false) String tokenRecebido,
            @RequestBody Map<String, Object> evento) {

        // Token de verificação (Configurações → Integração Asaas). Vazio = sem verificação (dev).
        String webhookToken = configuracao.valor(ConfiguracaoService.ASAAS_WEBHOOK);

        // Valida autenticidade: se um token está configurado, ele DEVE bater.
        if (webhookToken != null && !webhookToken.isBlank()
                && !webhookToken.equals(tokenRecebido)) {
            log.warn("Webhook Asaas rejeitado: token inválido.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            asaasService.processarWebhookAsaas(evento);
        } catch (Exception e) {
            log.error("Erro ao processar webhook Asaas: {}", e.getMessage());
        }
        // Sempre 200 (quando autenticado) — Asaas reenviaria em caso de erro
        return ResponseEntity.ok().build();
    }
}

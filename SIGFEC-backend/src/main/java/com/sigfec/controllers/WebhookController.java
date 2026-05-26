package com.sigfec.controllers;

import com.sigfec.services.AsaasService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Recebe webhooks do Asaas. Endpoint público (configurado no SecurityConfig).
 */
@Slf4j
@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private final AsaasService asaasService;

    @PostMapping("/asaas")
    public ResponseEntity<Void> asaas(@RequestBody Map<String, Object> evento) {
        try {
            asaasService.processarWebhookAsaas(evento);
        } catch (Exception e) {
            log.error("Erro ao processar webhook Asaas: {}", e.getMessage());
        }
        // Sempre 200 — Asaas reenviaria em caso de erro
        return ResponseEntity.ok().build();
    }
}

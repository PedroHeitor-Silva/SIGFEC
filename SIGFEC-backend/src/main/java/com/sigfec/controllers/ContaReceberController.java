package com.sigfec.controllers;

import com.sigfec.services.AsaasException;
import com.sigfec.services.AsaasService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Geração de cobrança real (PIX / Boleto) via Asaas para Contas a Receber.
 * Não substitui o CRUD existente — apenas adiciona as ações de cobrança.
 */
@Slf4j
@RestController
@RequestMapping("/api/contas-receber")
@RequiredArgsConstructor
public class ContaReceberController {

    private final AsaasService asaasService;

    /** Gera cobrança PIX e retorna a ContaReceber com QR Code + copia e cola. */
    @PostMapping("/{id}/gerar-pix")
    public ResponseEntity<?> gerarPix(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(asaasService.gerarPixParaContaReceber(id));
        } catch (AsaasException e) {
            log.error("Falha ao gerar PIX (conta #{}): {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Gera cobrança via Boleto e retorna a ContaReceber com link + linha digitável. */
    @PostMapping("/{id}/gerar-boleto")
    public ResponseEntity<?> gerarBoleto(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(asaasService.gerarBoletoParaContaReceber(id));
        } catch (AsaasException e) {
            log.error("Falha ao gerar Boleto (conta #{}): {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

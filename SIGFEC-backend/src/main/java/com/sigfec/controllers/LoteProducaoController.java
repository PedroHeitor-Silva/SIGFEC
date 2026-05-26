package com.sigfec.controllers;

import com.sigfec.domain.entities.LoteProducao;
import com.sigfec.domain.enums.EnumStatusLote;
import com.sigfec.services.LoteProducaoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/lotes")
@RequiredArgsConstructor
public class LoteProducaoController {

    private final LoteProducaoService service;

    @GetMapping
    public List<LoteProducao> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> buscar(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.buscar(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> criar(@RequestBody LoteProducao lote) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(lote));
        } catch (RuntimeException e) {
            log.error("Falha ao criar lote: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> atualizarStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            EnumStatusLote novo = EnumStatusLote.valueOf(body.get("status"));
            return ResponseEntity.ok(service.mudarStatus(id, novo));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status inválido."));
        } catch (RuntimeException e) {
            log.error("Falha ao mudar status lote #{}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Long id) {
        try {
            service.deletar(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

package com.sigfec.controllers;

import com.sigfec.domain.entities.Venda;
import com.sigfec.services.VendaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Vendas: ORCAMENTO → CONFIRMADA (baixa estoque + conta a receber) → FATURADA (nota).
 * Erros de regra chegam ao cliente com a mensagem real via GlobalExceptionHandler.
 */
@RestController
@RequestMapping("/api/vendas")
@RequiredArgsConstructor
public class VendaController {

    private final VendaService service;

    @GetMapping
    public List<Venda> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Venda> buscar(@PathVariable Long id) {
        return service.buscar(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Venda> criar(@RequestBody Venda venda) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(venda));
    }

    @PutMapping("/{id}")
    public Venda atualizar(@PathVariable Long id, @RequestBody Venda venda) {
        return service.atualizar(id, venda);
    }

    @PatchMapping("/{id}/confirmar")
    public Venda confirmar(@PathVariable Long id) {
        return service.confirmar(id);
    }

    @PatchMapping("/{id}/faturar")
    public Venda faturar(@PathVariable Long id) {
        return service.faturar(id);
    }

    @PatchMapping("/{id}/cancelar")
    public Venda cancelar(@PathVariable Long id) {
        return service.cancelar(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}

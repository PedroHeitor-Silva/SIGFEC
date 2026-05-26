package com.sigfec.controllers;

import com.sigfec.domain.dto.ParceiroResumoDTO;
import com.sigfec.domain.entities.Parceiro;
import com.sigfec.services.ParceiroService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parceiros")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ParceiroController {

    private final ParceiroService service;

    @GetMapping
    public List<Parceiro> listarTodos() {
        return service.listarTodos();
    }

    @GetMapping("/resumo")
    public List<ParceiroResumoDTO> listarResumo() {
        return service.listarResumo();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Parceiro> buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Parceiro> salvar(@RequestBody Parceiro parceiro) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.salvar(parceiro));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Parceiro> atualizar(@PathVariable Long id, @RequestBody Parceiro parceiro) {
        try {
            return ResponseEntity.ok(service.atualizar(id, parceiro));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}

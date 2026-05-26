package com.sigfec.controllers;

import com.sigfec.domain.entities.AnaliseLaboratorio;
import com.sigfec.services.AnaliseLaboratorioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/laboratorio")
@RequiredArgsConstructor
public class AnaliseLaboratorioController {

    private final AnaliseLaboratorioService service;

    @GetMapping
    public List<AnaliseLaboratorio> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    public ResponseEntity<AnaliseLaboratorio> buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/pesagem/{pesagemId}")
    public ResponseEntity<AnaliseLaboratorio> realizarAnalise(
            @PathVariable Long pesagemId,
            @RequestBody AnaliseLaboratorio analise) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.realizarAnalise(pesagemId, analise));
    }
}

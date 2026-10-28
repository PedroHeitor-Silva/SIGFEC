package com.sigfec.controllers;

import com.sigfec.domain.dto.fila.ChecklistCargaDTO;
import com.sigfec.domain.dto.fila.FilaRequests;
import com.sigfec.services.ChecklistCargaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Checklist de inspeção da carga, sempre acessado pela entrada da fila (relação 1:1). */
@RestController
@RequestMapping("/api/checklists")
@RequiredArgsConstructor
public class ChecklistCargaController {

    private final ChecklistCargaService service;

    /** Checklist de uma entrada. 204 se ainda não foi preenchido. */
    @GetMapping("/entrada/{entradaId}")
    public ResponseEntity<ChecklistCargaDTO> porEntrada(@PathVariable Long entradaId) {
        return service.buscarPorEntrada(entradaId)
                .map(c -> ResponseEntity.ok(ChecklistCargaDTO.of(c)))
                .orElse(ResponseEntity.noContent().build());
    }

    /** Cria ou atualiza as respostas. O status (pendente/aprovado/reprovado) é calculado no servidor. */
    @PutMapping("/entrada/{entradaId}")
    public ChecklistCargaDTO salvar(@PathVariable Long entradaId, @RequestBody FilaRequests.Checklist req) {
        return ChecklistCargaDTO.of(service.salvar(entradaId, req));
    }
}

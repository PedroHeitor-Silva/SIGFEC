package com.sigfec.controllers;

import com.sigfec.domain.dto.PesagemResponseDTO;
import com.sigfec.domain.entities.Pesagem;
import com.sigfec.services.PesagemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pesagens")
@RequiredArgsConstructor
public class PesagemController {

    private final PesagemService service;

    @GetMapping
    public List<PesagemResponseDTO> listarTodas(
            @RequestParam(value = "disponiveis", required = false) Boolean disponiveis) {
        return Boolean.TRUE.equals(disponiveis) ? service.listarDisponiveis() : service.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Pesagem> buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Registra a pesagem. Com ?entradaFila={id}, vincula à senha da fila e a finaliza. */
    @PostMapping
    public ResponseEntity<Pesagem> salvar(@RequestBody Pesagem pesagem,
                                          @RequestParam(value = "entradaFila", required = false) Long entradaFilaId) {
        Pesagem salva = service.salvar(pesagem, entradaFilaId);
        return ResponseEntity.status(HttpStatus.CREATED).body(salva);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}

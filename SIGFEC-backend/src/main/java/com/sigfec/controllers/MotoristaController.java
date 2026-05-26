package com.sigfec.controllers;

import com.sigfec.domain.entities.Motorista;
import com.sigfec.repositories.MotoristaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/motoristas")
@RequiredArgsConstructor
public class MotoristaController {

    private final MotoristaRepository repository;

    @GetMapping
    public List<Motorista> listar() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Motorista> buscar(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Motorista> salvar(@RequestBody Motorista motorista) {
        if (motorista.getDataCadastro() == null) motorista.setDataCadastro(LocalDate.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(motorista));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Motorista> atualizar(@PathVariable Long id, @RequestBody Motorista payload) {
        return repository.findById(id).map(m -> {
            if (payload.getNome() != null) m.setNome(payload.getNome());
            if (payload.getDocumento() != null) m.setDocumento(payload.getDocumento());
            if (payload.getEmail() != null) m.setEmail(payload.getEmail());
            if (payload.getTelefone() != null) m.setTelefone(payload.getTelefone());
            if (payload.getCnh() != null) m.setCnh(payload.getCnh());
            return ResponseEntity.ok(repository.save(m));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

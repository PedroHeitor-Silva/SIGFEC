package com.sigfec.controllers;

import com.sigfec.domain.entities.Parceiro;
import com.sigfec.domain.enums.EnumTipoParceiro;
import com.sigfec.repositories.ParceiroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/produtores")
@RequiredArgsConstructor
public class ProdutorController {

    private final ParceiroRepository repository;

    @PostMapping
    public ResponseEntity<Parceiro> salvar(@RequestBody Parceiro produtor) {
        produtor.setTipoParceiro(EnumTipoParceiro.PRODUTOR);
        if (produtor.getDataCadastro() == null) {
            produtor.setDataCadastro(LocalDate.now());
        }
        Parceiro salvo = repository.save(produtor);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @GetMapping
    public List<Parceiro> listarTodos() {
        // Filtra para retornar apenas os que são do tipo PRODUTOR
        return repository.findAll().stream()
                .filter(p -> p.getTipoParceiro() == EnumTipoParceiro.PRODUTOR)
                .collect(Collectors.toList());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

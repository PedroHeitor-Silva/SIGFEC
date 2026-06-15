package com.sigfec.controllers;

import com.sigfec.domain.entities.Veiculo;
import com.sigfec.repositories.VeiculoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/veiculos")
@RequiredArgsConstructor
public class VeiculoController {

    private final VeiculoRepository repository;

    @GetMapping
    public List<Veiculo> listar() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Veiculo> buscar(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> salvar(@RequestBody Veiculo veiculo) {
        veiculo.setPlaca(normalizarPlaca(veiculo.getPlaca()));
        if (veiculo.getPlaca() == null || veiculo.getPlaca().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Placa é obrigatória."));
        }
        if (repository.existsByPlaca(veiculo.getPlaca())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Já existe um veículo com a placa " + veiculo.getPlaca() + "."));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(veiculo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @RequestBody Veiculo payload) {
        return repository.findById(id).map(v -> {
            String novaPlaca = normalizarPlaca(payload.getPlaca());
            // Bloqueia se a nova placa já é de outro veículo
            if (novaPlaca != null && !novaPlaca.isBlank() && !novaPlaca.equals(v.getPlaca())
                    && repository.existsByPlaca(novaPlaca)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body((Object) Map.of("error", "Já existe um veículo com a placa " + novaPlaca + "."));
            }
            if (novaPlaca != null && !novaPlaca.isBlank()) v.setPlaca(novaPlaca);
            if (payload.getMarca() != null) v.setMarca(payload.getMarca());
            if (payload.getModelo() != null) v.setModelo(payload.getModelo());
            if (payload.getTara() != null) v.setTara(payload.getTara());
            if (payload.getCapacidadeKg() != null) v.setCapacidadeKg(payload.getCapacidadeKg());
            if (payload.getTipoVeiculo() != null) v.setTipoVeiculo(payload.getTipoVeiculo());
            if (payload.getEixos() != null) v.setEixos(payload.getEixos());
            if (payload.getMotorista() != null) v.setMotorista(payload.getMotorista());
            if (payload.getDataLicenciamento() != null) v.setDataLicenciamento(payload.getDataLicenciamento());
            if (payload.getObservacao() != null) v.setObservacao(payload.getObservacao());
            v.setStatusAtivo(payload.isStatusAtivo());
            return ResponseEntity.ok((Object) repository.save(v));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /** Remove hífen e espaços, mantém só letras/números maiúsculos. */
    private String normalizarPlaca(String placa) {
        return placa == null ? null : placa.toUpperCase().replaceAll("[^A-Z0-9]", "");
    }
}

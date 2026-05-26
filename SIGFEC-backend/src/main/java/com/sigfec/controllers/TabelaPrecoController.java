package com.sigfec.controllers;

import com.sigfec.domain.entities.TabelaPreco;
import com.sigfec.repositories.ProdutoRepository;
import com.sigfec.repositories.TabelaPrecoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tabelas-preco")
@RequiredArgsConstructor
public class TabelaPrecoController {

    private final TabelaPrecoRepository repository;
    private final ProdutoRepository produtoRepository;

    @GetMapping
    public List<TabelaPreco> listar() {
        return repository.findAll();
    }

    @GetMapping("/produto/{produtoId}")
    public List<TabelaPreco> listarPorProduto(@PathVariable Long produtoId) {
        return repository.findByProdutoIdOrderByDataInicioDesc(produtoId);
    }

    @GetMapping("/produto/{produtoId}/vigente")
    public ResponseEntity<Map<String, Object>> consultarVigente(
            @PathVariable Long produtoId,
            @RequestParam(value = "data", required = false) String dataStr) {
        LocalDate data = (dataStr != null && !dataStr.isBlank()) ? LocalDate.parse(dataStr) : LocalDate.now();
        BigDecimal valor = repository.findVigente(produtoId, data)
                .map(TabelaPreco::getValor)
                .orElseGet(() -> produtoRepository.findById(produtoId)
                        .map(p -> p.getPrecoBase())
                        .orElse(BigDecimal.ZERO));
        return ResponseEntity.ok(Map.of(
                "produtoId", produtoId,
                "data", data.toString(),
                "valor", valor,
                "fonte", repository.findVigente(produtoId, data).isPresent() ? "tabela" : "produto"
        ));
    }

    @PostMapping
    public ResponseEntity<TabelaPreco> criar(@RequestBody TabelaPreco tabela) {
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(tabela));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

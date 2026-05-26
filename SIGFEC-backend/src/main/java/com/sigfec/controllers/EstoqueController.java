package com.sigfec.controllers;

import com.sigfec.domain.entities.Estoque;
import com.sigfec.repositories.EstoqueRepository;
import com.sigfec.repositories.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/estoque")
@RequiredArgsConstructor
public class EstoqueController {

    private final EstoqueRepository repository;
    private final ProdutoRepository produtoRepository;

    @GetMapping
    public List<Estoque> listar() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Estoque> buscar(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> salvar(@RequestBody Estoque estoque) {
        // hidrata o produto a partir do id enviado
        if (estoque.getProduto() != null && estoque.getProduto().getId() != null) {
            var produto = produtoRepository.findById(estoque.getProduto().getId()).orElse(null);
            if (produto == null) {
                return ResponseEntity.badRequest().body("Produto não encontrado.");
            }
            estoque.setProduto(produto);
            // impede duplicar estoque do mesmo produto
            if (repository.findByProduto_Id(produto.getId()).isPresent()) {
                return ResponseEntity.badRequest().body("Este produto já tem registro de estoque. Edite o existente.");
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(estoque));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Estoque> atualizar(@PathVariable Long id, @RequestBody Estoque payload) {
        return repository.findById(id).map(e -> {
            if (payload.getQuantidadeAtual() != null) e.setQuantidadeAtual(payload.getQuantidadeAtual());
            if (payload.getQuantidadeMinima() != null) e.setQuantidadeMinima(payload.getQuantidadeMinima());
            return ResponseEntity.ok(repository.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

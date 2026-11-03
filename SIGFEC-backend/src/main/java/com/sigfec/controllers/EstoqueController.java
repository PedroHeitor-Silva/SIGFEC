package com.sigfec.controllers;

import com.sigfec.domain.entities.Estoque;
import com.sigfec.domain.enums.EnumTipoMovEstoque;
import com.sigfec.repositories.EstoqueRepository;
import com.sigfec.repositories.ProdutoRepository;
import com.sigfec.services.MovimentacaoEstoqueService;
import com.sigfec.services.RegraNegocioException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Registro de estoque por produto. O SALDO só muda pelo Kardex (MovimentacaoEstoqueService):
 * aqui se cria o registro (saldo inicial vira um AJUSTE_ENTRADA) e se altera o mínimo.
 * Ajustes de saldo: POST /api/movimentacoes-estoque/ajuste.
 */
@RestController
@RequestMapping("/api/estoque")
@RequiredArgsConstructor
public class EstoqueController {

    private final EstoqueRepository repository;
    private final ProdutoRepository produtoRepository;
    private final MovimentacaoEstoqueService movimentacaoService;

    @GetMapping
    public List<Estoque> listar() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Estoque> buscar(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Estoque> salvar(@RequestBody Estoque payload) {
        if (payload.getProduto() == null || payload.getProduto().getId() == null) {
            throw RegraNegocioException.invalida("Selecione o produto.");
        }
        var produto = produtoRepository.findById(payload.getProduto().getId())
                .orElseThrow(() -> RegraNegocioException.naoEncontrada("Produto não encontrado."));
        if (repository.findByProduto_Id(produto.getId()).isPresent()) {
            throw RegraNegocioException.conflito("Este produto já tem registro de estoque. Use \"Ajustar saldo\".");
        }
        Estoque estoque = new Estoque();
        estoque.setProduto(produto);
        estoque.setQuantidadeAtual(0.0);
        estoque.setQuantidadeMinima(payload.getQuantidadeMinima() != null ? Math.max(0, payload.getQuantidadeMinima()) : 0.0);
        estoque = repository.save(estoque);
        double inicial = payload.getQuantidadeAtual() != null ? payload.getQuantidadeAtual() : 0;
        if (inicial > 0) {
            movimentacaoService.aplicar(produto, EnumTipoMovEstoque.AJUSTE_ENTRADA, inicial, "Saldo inicial", "AJUSTE_MANUAL", null);
            estoque = repository.findById(estoque.getId()).orElse(estoque);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(estoque);
    }

    /** Só o estoque mínimo é editável aqui; o saldo vem do Kardex. */
    @PutMapping("/{id}")
    public ResponseEntity<Estoque> atualizar(@PathVariable Long id, @RequestBody Estoque payload) {
        return repository.findById(id).map(e -> {
            if (payload.getQuantidadeMinima() != null) {
                if (payload.getQuantidadeMinima() < 0) throw RegraNegocioException.invalida("O mínimo não pode ser negativo.");
                e.setQuantidadeMinima(payload.getQuantidadeMinima());
            }
            return ResponseEntity.ok(repository.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

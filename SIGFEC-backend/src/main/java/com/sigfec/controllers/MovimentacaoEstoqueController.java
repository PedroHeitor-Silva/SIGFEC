package com.sigfec.controllers;

import com.sigfec.domain.entities.MovimentacaoEstoque;
import com.sigfec.domain.entities.Produto;
import com.sigfec.domain.enums.EnumTipoMovEstoque;
import com.sigfec.repositories.MovimentacaoEstoqueRepository;
import com.sigfec.repositories.ProdutoRepository;
import com.sigfec.services.MovimentacaoEstoqueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/movimentacoes-estoque")
@RequiredArgsConstructor
public class MovimentacaoEstoqueController {

    private final MovimentacaoEstoqueRepository repository;
    private final ProdutoRepository produtoRepository;
    private final MovimentacaoEstoqueService service;

    @GetMapping
    public List<MovimentacaoEstoque> listar(@RequestParam(value = "produtoId", required = false) Long produtoId) {
        return produtoId != null
                ? repository.findByProduto_IdOrderByDataHoraDesc(produtoId)
                : repository.findAllByOrderByDataHoraDesc();
    }

    /** Ajuste manual de estoque (entrada/saída). */
    @PostMapping("/ajuste")
    public ResponseEntity<MovimentacaoEstoque> ajuste(@RequestBody Map<String, Object> body) {
        Long produtoId = Long.valueOf(body.get("produtoId").toString());
        EnumTipoMovEstoque tipo = EnumTipoMovEstoque.valueOf(body.get("tipo").toString());
        double qtd = Double.parseDouble(body.get("quantidade").toString());
        String motivo = body.get("motivo") != null ? body.get("motivo").toString() : null;
        Produto p = produtoRepository.findById(produtoId)
                .orElseThrow(() -> com.sigfec.services.RegraNegocioException.naoEncontrada("Produto não encontrado."));
        var mov = service.aplicar(p, tipo, qtd, motivo, "AJUSTE_MANUAL", null);
        return ResponseEntity.status(HttpStatus.CREATED).body(mov);
    }
}

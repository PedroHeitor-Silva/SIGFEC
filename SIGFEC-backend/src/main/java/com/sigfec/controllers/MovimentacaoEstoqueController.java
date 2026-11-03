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
        if (body.get("produtoId") == null || body.get("tipo") == null || body.get("quantidade") == null) {
            throw com.sigfec.services.RegraNegocioException.invalida("Informe produto, tipo e quantidade do ajuste.");
        }
        Long produtoId = Long.valueOf(body.get("produtoId").toString());
        EnumTipoMovEstoque tipo;
        try { tipo = EnumTipoMovEstoque.valueOf(body.get("tipo").toString()); }
        catch (IllegalArgumentException e) { throw com.sigfec.services.RegraNegocioException.invalida("Tipo de ajuste inválido."); }
        if (tipo != EnumTipoMovEstoque.AJUSTE_ENTRADA && tipo != EnumTipoMovEstoque.AJUSTE_SAIDA) {
            throw com.sigfec.services.RegraNegocioException.invalida("Ajuste manual só pode ser AJUSTE_ENTRADA ou AJUSTE_SAIDA.");
        }
        double qtd;
        try { qtd = Double.parseDouble(body.get("quantidade").toString().replace(',', '.')); }
        catch (NumberFormatException e) { throw com.sigfec.services.RegraNegocioException.invalida("Quantidade inválida."); }
        String motivo = body.get("motivo") != null ? body.get("motivo").toString().trim() : "";
        if (motivo.isEmpty()) throw com.sigfec.services.RegraNegocioException.invalida("Informe o motivo do ajuste (ex.: inventário, avaria).");
        Produto p = produtoRepository.findById(produtoId)
                .orElseThrow(() -> com.sigfec.services.RegraNegocioException.naoEncontrada("Produto não encontrado."));
        var mov = service.aplicar(p, tipo, qtd, motivo, "AJUSTE_MANUAL", null);
        return ResponseEntity.status(HttpStatus.CREATED).body(mov);
    }
}

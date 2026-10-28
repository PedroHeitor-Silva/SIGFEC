package com.sigfec.services;

import com.sigfec.domain.entities.Estoque;
import com.sigfec.domain.entities.MovimentacaoEstoque;
import com.sigfec.domain.entities.Produto;
import com.sigfec.domain.enums.EnumTipoMovEstoque;
import com.sigfec.repositories.EstoqueRepository;
import com.sigfec.repositories.MovimentacaoEstoqueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Aplica movimentação de estoque e grava no Kardex.
 * Toda alteração de saldo do estoque deve passar por aqui.
 */
@Service
@RequiredArgsConstructor
public class MovimentacaoEstoqueService {

    private final EstoqueRepository estoqueRepository;
    private final MovimentacaoEstoqueRepository movRepository;

    /** Aplica uma movimentação ao estoque e grava o histórico. */
    @Transactional
    public MovimentacaoEstoque aplicar(Produto produto, EnumTipoMovEstoque tipo, double qtd,
                                        String motivo, String origemTipo, Long origemId) {
        if (produto == null) throw RegraNegocioException.invalida("Produto obrigatório.");
        if (qtd <= 0) throw RegraNegocioException.invalida("Quantidade deve ser maior que zero.");

        Estoque estoque = estoqueRepository.findByProduto_Id(produto.getId())
                .orElseGet(() -> {
                    Estoque e = new Estoque();
                    e.setProduto(produto);
                    e.setQuantidadeAtual(0.0);
                    e.setQuantidadeMinima(0.0);
                    return e;
                });

        double atual = estoque.getQuantidadeAtual() != null ? estoque.getQuantidadeAtual() : 0.0;
        double novoSaldo = isEntrada(tipo) ? atual + qtd : atual - qtd;
        if (novoSaldo < 0) {
            throw RegraNegocioException.conflito("Saldo ficaria negativo (" + novoSaldo + "). Operação bloqueada.");
        }
        estoque.setQuantidadeAtual(novoSaldo);
        estoqueRepository.save(estoque);

        MovimentacaoEstoque mov = new MovimentacaoEstoque();
        mov.setProduto(produto);
        mov.setTipo(tipo);
        mov.setQuantidade(qtd);
        mov.setSaldoPos(novoSaldo);
        mov.setMotivo(motivo);
        mov.setOrigemTipo(origemTipo);
        mov.setOrigemId(origemId);
        mov.setUsuario(usuarioAtual());
        return movRepository.save(mov);
    }

    private boolean isEntrada(EnumTipoMovEstoque tipo) {
        return tipo == EnumTipoMovEstoque.ENTRADA_PRODUCAO
            || tipo == EnumTipoMovEstoque.AJUSTE_ENTRADA
            || tipo == EnumTipoMovEstoque.DEVOLUCAO;
    }

    private String usuarioAtual() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            return auth != null ? auth.getName() : "sistema";
        } catch (Exception e) { return "sistema"; }
    }
}

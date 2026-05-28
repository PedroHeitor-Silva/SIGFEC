package com.sigfec.services;

import com.sigfec.domain.entities.*;
import com.sigfec.domain.enums.EnumStatusFinanceiro;
import com.sigfec.domain.enums.EnumStatusVenda;
import com.sigfec.repositories.ContaReceberRepository;
import com.sigfec.repositories.EstoqueRepository;
import com.sigfec.repositories.ProdutoRepository;
import com.sigfec.repositories.VendaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class VendaService {

    private final VendaRepository vendaRepository;
    private final ProdutoRepository produtoRepository;
    private final EstoqueRepository estoqueRepository;
    private final ContaReceberRepository contaReceberRepository;
    private final MovimentacaoEstoqueService movEstoqueService;
    private final AuditService auditService;

    public List<Venda> listar() {
        return vendaRepository.findAll();
    }

    public Optional<Venda> buscar(Long id) {
        return vendaRepository.findById(id);
    }

    /** Cria/atualiza venda. Hidrata produtos dos itens e religa a referência pai. */
    @Transactional
    public Venda salvar(Venda venda) {
        if (venda.getItens() != null) {
            for (ItemVenda item : venda.getItens()) {
                item.setVenda(venda);
                if (item.getProduto() != null && item.getProduto().getId() != null) {
                    produtoRepository.findById(item.getProduto().getId())
                            .ifPresent(item::setProduto);
                }
                item.calcularSubtotal();
            }
        }
        venda.recalcular();
        return vendaRepository.save(venda);
    }

    /** Confirma a venda — gera Conta a Receber e baixa o estoque dos produtos vendidos. */
    @Transactional
    public Venda confirmar(Long id) {
        Venda venda = vendaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venda não encontrada"));
        if (venda.getStatusVenda() == EnumStatusVenda.CONFIRMADA
                || venda.getStatusVenda() == EnumStatusVenda.FATURADA) {
            return venda; // já processada
        }

        // 1. VALIDA estoque suficiente antes de baixar qualquer item
        for (ItemVenda item : venda.getItens()) {
            if (item.getProduto() == null) continue;
            double pedido = item.getQuantidade() != null ? item.getQuantidade().doubleValue() : 0.0;
            var estoque = estoqueRepository.findByProduto_Id(item.getProduto().getId()).orElse(null);
            String nomeProduto = item.getProduto().getNome() != null
                    ? item.getProduto().getNome() : "produto #" + item.getProduto().getId();
            if (estoque == null) {
                throw new RuntimeException("Sem estoque cadastrado para " + nomeProduto + ".");
            }
            double disponivel = estoque.getQuantidadeAtual() != null ? estoque.getQuantidadeAtual() : 0.0;
            if (pedido > disponivel) {
                throw new RuntimeException(
                        "Estoque insuficiente de " + nomeProduto
                        + " — disponível: " + disponivel + ", pedido: " + pedido + ".");
            }
        }

        // 2. Baixa de estoque via Kardex (registra movimentação)
        for (ItemVenda item : venda.getItens()) {
            if (item.getProduto() == null) continue;
            double baixa = item.getQuantidade() != null ? item.getQuantidade().doubleValue() : 0.0;
            if (baixa <= 0) continue;
            movEstoqueService.aplicar(
                    item.getProduto(),
                    com.sigfec.domain.enums.EnumTipoMovEstoque.SAIDA_VENDA,
                    baixa,
                    "Venda #" + venda.getId(),
                    "VENDA",
                    venda.getId()
            );
        }

        // 2. Gera Conta a Receber do cliente
        ContaReceber conta = new ContaReceber();
        conta.setCliente(venda.getCliente());
        conta.setValorOriginal(venda.getValorTotal());
        conta.setDataEmissao(LocalDate.now());
        conta.setDataVencimento(LocalDate.now().plusDays(30));
        conta.setStatusFinanceiro(EnumStatusFinanceiro.ABERTO);
        conta.setDescricao("Venda #" + venda.getId());
        contaReceberRepository.save(conta);

        venda.setStatusVenda(EnumStatusVenda.CONFIRMADA);
        Venda salva = vendaRepository.save(venda);
        auditService.log("VENDA_CONFIRMADA", "Venda", venda.getId(),
                "total=" + venda.getValorTotal() + " cliente=" +
                (venda.getCliente() != null ? venda.getCliente().getNome() : "?"));
        return salva;
    }

    /** Fatura a venda — gera número de nota sequencial. */
    @Transactional
    public Venda faturar(Long id) {
        Venda venda = vendaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venda não encontrada"));
        if (venda.getNumeroNota() == null) {
            Venda ultima = vendaRepository.findTopByNumeroNotaNotNullOrderByNumeroNotaDesc();
            int proximo = (ultima != null && ultima.getNumeroNota() != null)
                    ? ultima.getNumeroNota() + 1 : 1;
            venda.setNumeroNota(proximo);
        }
        venda.setStatusVenda(EnumStatusVenda.FATURADA);
        return vendaRepository.save(venda);
    }

    @Transactional
    public Venda cancelar(Long id) {
        Venda venda = vendaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venda não encontrada"));
        venda.setStatusVenda(EnumStatusVenda.CANCELADA);
        return vendaRepository.save(venda);
    }

    @Transactional
    public void deletar(Long id) {
        vendaRepository.deleteById(id);
    }
}

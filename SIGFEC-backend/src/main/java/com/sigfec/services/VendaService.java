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

    /** Cria a venda sempre como ORÇAMENTO: status e nota nunca vêm do cliente. */
    @Transactional
    public Venda criar(Venda venda) {
        venda.setId(null);
        venda.setStatusVenda(EnumStatusVenda.ORCAMENTO);
        venda.setNumeroNota(null);
        return montarESalvar(venda);
    }

    /** Só orçamentos podem ser alterados (depois de confirmada, estoque e conta já foram gerados). */
    @Transactional
    public Venda atualizar(Long id, Venda venda) {
        Venda atual = carregar(id);
        if (atual.getStatusVenda() != EnumStatusVenda.ORCAMENTO) {
            throw RegraNegocioException.conflito("Só orçamentos podem ser alterados: a venda #" + id
                    + " está " + atual.getStatusVenda().name().toLowerCase() + ".");
        }
        venda.setId(id);
        venda.setStatusVenda(EnumStatusVenda.ORCAMENTO);
        venda.setNumeroNota(null);
        return montarESalvar(venda);
    }

    /** Hidrata produtos dos itens, religa a referência pai e recalcula os totais. */
    private Venda montarESalvar(Venda venda) {
        normalizarPagamento(venda);
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
        Venda venda = carregar(id);
        if (venda.getStatusVenda() == EnumStatusVenda.CONFIRMADA
                || venda.getStatusVenda() == EnumStatusVenda.FATURADA) {
            return venda; // já processada (idempotente: duplo clique não baixa estoque duas vezes)
        }
        if (venda.getStatusVenda() == EnumStatusVenda.CANCELADA) {
            throw RegraNegocioException.conflito("A venda #" + id + " está cancelada e não pode ser confirmada.");
        }
        if (venda.getItens() == null || venda.getItens().isEmpty()) {
            throw RegraNegocioException.invalida("A venda #" + id + " não tem itens.");
        }

        // 1. VALIDA estoque suficiente antes de baixar qualquer item
        for (ItemVenda item : venda.getItens()) {
            if (item.getProduto() == null) continue;
            double pedido = item.getQuantidade() != null ? item.getQuantidade().doubleValue() : 0.0;
            var estoque = estoqueRepository.findByProduto_Id(item.getProduto().getId()).orElse(null);
            String nomeProduto = item.getProduto().getNome() != null
                    ? item.getProduto().getNome() : "produto #" + item.getProduto().getId();
            if (estoque == null) {
                throw RegraNegocioException.conflito("Sem estoque cadastrado para " + nomeProduto + ".");
            }
            double disponivel = estoque.getQuantidadeAtual() != null ? estoque.getQuantidadeAtual() : 0.0;
            if (pedido > disponivel) {
                throw RegraNegocioException.conflito(
                        "Estoque insuficiente de " + nomeProduto
                        + " — disponível: " + qtd(disponivel) + ", pedido: " + qtd(pedido) + ".");
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

        // 3. Gera as Contas a Receber do cliente — uma por parcela
        gerarContasReceber(venda);

        venda.setStatusVenda(EnumStatusVenda.CONFIRMADA);
        Venda salva = vendaRepository.save(venda);
        auditService.log("VENDA_CONFIRMADA", "Venda", venda.getId(),
                "total=" + venda.getValorTotal() + " cliente=" +
                (venda.getCliente() != null ? venda.getCliente().getNome() : "?"));
        return salva;
    }

    /** Fatura a venda — gera número de nota sequencial. Exige venda CONFIRMADA. */
    @Transactional
    public Venda faturar(Long id) {
        Venda venda = carregar(id);
        if (venda.getStatusVenda() == EnumStatusVenda.FATURADA) return venda;
        if (venda.getStatusVenda() != EnumStatusVenda.CONFIRMADA) {
            throw RegraNegocioException.conflito("Confirme a venda #" + id + " antes de emitir a nota (situação atual: "
                    + venda.getStatusVenda().name().toLowerCase() + ").");
        }
        if (venda.getNumeroNota() == null) {
            Venda ultima = vendaRepository.findTopByNumeroNotaNotNullOrderByNumeroNotaDesc();
            int proximo = (ultima != null && ultima.getNumeroNota() != null)
                    ? ultima.getNumeroNota() + 1 : 1;
            venda.setNumeroNota(proximo);
        }
        venda.setStatusVenda(EnumStatusVenda.FATURADA);
        return vendaRepository.save(venda);
    }

    /**
     * Cancela a venda. Se já estava CONFIRMADA, desfaz os efeitos: devolve o estoque (Kardex DEVOLUCAO)
     * e cancela a conta a receber gerada. Venda faturada (nota emitida) não pode ser cancelada.
     */
    @Transactional
    public Venda cancelar(Long id) {
        Venda venda = carregar(id);
        switch (venda.getStatusVenda()) {
            case CANCELADA -> { return venda; }
            case FATURADA -> throw RegraNegocioException.conflito(
                    "A venda #" + id + " já tem nota fiscal emitida e não pode ser cancelada.");
            case CONFIRMADA -> desfazerConfirmacao(venda);
            case ORCAMENTO -> { /* nada a desfazer */ }
        }
        venda.setStatusVenda(EnumStatusVenda.CANCELADA);
        Venda salva = vendaRepository.save(venda);
        auditService.log("VENDA_CANCELADA", "Venda", id, "total=" + venda.getValorTotal());
        return salva;
    }

    /** Exclusão só de orçamento ou venda cancelada (as demais têm estoque e conta vinculados). */
    @Transactional
    public void deletar(Long id) {
        Venda venda = carregar(id);
        if (venda.getStatusVenda() != EnumStatusVenda.ORCAMENTO && venda.getStatusVenda() != EnumStatusVenda.CANCELADA) {
            throw RegraNegocioException.conflito("A venda #" + id + " está " + venda.getStatusVenda().name().toLowerCase()
                    + ": cancele antes de excluir.");
        }
        vendaRepository.delete(venda);
    }

    private void desfazerConfirmacao(Venda venda) {
        List<ContaReceber> contas = contasDaVenda(venda.getId());
        // valida tudo antes de alterar qualquer coisa
        for (ContaReceber c : contas) {
            if (c.getValorPago() != null && c.getValorPago().signum() > 0) {
                throw RegraNegocioException.conflito("A conta a receber da venda #" + venda.getId()
                        + " já tem recebimento: estorne o recebimento antes de cancelar.");
            }
        }
        for (ItemVenda item : venda.getItens()) {
            if (item.getProduto() == null || item.getQuantidade() == null || item.getQuantidade().signum() <= 0) continue;
            movEstoqueService.aplicar(item.getProduto(), com.sigfec.domain.enums.EnumTipoMovEstoque.DEVOLUCAO,
                    item.getQuantidade().doubleValue(), "Cancelamento da venda #" + venda.getId(), "VENDA", venda.getId());
        }
        for (ContaReceber c : contas) {
            c.setStatusFinanceiro(EnumStatusFinanceiro.CANCELADO);
            contaReceberRepository.save(c);
            if (c.getAsaasPaymentId() != null) {
                auditService.log("COBRANCA_PENDENTE_CANCELAR", "ContaReceber", c.getId(),
                        "Venda cancelada; cancelar também a cobrança Asaas " + c.getAsaasPaymentId());
            }
        }
    }

    /** 2000.0 → "2.000"; 12.5 → "12,5" (mensagens para o usuário). */
    private static String qtd(double v) {
        java.text.NumberFormat nf = java.text.NumberFormat.getNumberInstance(new java.util.Locale("pt", "BR"));
        nf.setMaximumFractionDigits(2);
        return nf.format(v);
    }

    /**
     * Forma de pagamento e parcelas: à vista (dinheiro, PIX, débito) é sempre 1 parcela;
     * as demais aceitam de 1 a 12. Sem forma informada, mantém o padrão antigo (1 parcela em 30 dias).
     */
    private void normalizarPagamento(Venda venda) {
        int parcelas = venda.getParcelas() == null ? 1 : venda.getParcelas();
        if (venda.getFormaPagamento() != null && venda.getFormaPagamento().aVista()) parcelas = 1;
        Parcelamento.validar(parcelas);
        venda.setParcelas(parcelas);
    }

    /** Uma conta a receber por parcela, de 30 em 30 dias (à vista: vence no dia, já com a forma de pagamento). */
    private void gerarContasReceber(Venda venda) {
        int n = venda.getParcelas() == null ? 1 : venda.getParcelas();
        boolean aVista = venda.getFormaPagamento() != null && venda.getFormaPagamento().aVista();
        List<java.math.BigDecimal> valores = Parcelamento.dividir(venda.getValorTotal(), n);
        LocalDate hoje = LocalDate.now();
        for (int i = 1; i <= n; i++) {
            ContaReceber conta = new ContaReceber();
            conta.setCliente(venda.getCliente());
            conta.setValorOriginal(valores.get(i - 1));
            conta.setDataEmissao(hoje);
            conta.setDataVencimento(aVista ? hoje : hoje.plusDays(30L * i));
            conta.setStatusFinanceiro(EnumStatusFinanceiro.ABERTO);
            conta.setDescricao("Venda #" + venda.getId() + Parcelamento.sufixo(i, n));
            if (venda.getFormaPagamento() != null) conta.setFormaPagamento(venda.getFormaPagamento().name());
            contaReceberRepository.save(conta);
        }
    }

    /** Contas geradas pela venda: "Venda #id" ou "Venda #id - parcela i/N". */
    private List<ContaReceber> contasDaVenda(Long vendaId) {
        String base = "Venda #" + vendaId;
        return contaReceberRepository.findByDescricaoOrDescricaoStartingWith(base, base + " - parcela ");
    }

    private Venda carregar(Long id) {
        return vendaRepository.findById(id)
                .orElseThrow(() -> RegraNegocioException.naoEncontrada("Venda #" + id + " não encontrada."));
    }
}

package com.sigfec.services;

import com.sigfec.domain.entities.ContaReceber;
import com.sigfec.domain.entities.ItemVenda;
import com.sigfec.domain.entities.Produto;
import com.sigfec.domain.entities.Venda;
import com.sigfec.domain.enums.EnumStatusFinanceiro;
import com.sigfec.domain.enums.EnumStatusVenda;
import com.sigfec.domain.enums.EnumTipoMovEstoque;
import com.sigfec.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Ciclo da venda: faturar exige confirmação; cancelar confirmada desfaz estoque e conta a receber. */
class VendaServiceTest {

    private VendaRepository vendaRepo;
    private ContaReceberRepository contaRepo;
    private MovimentacaoEstoqueService mov;
    private VendaService service;

    @BeforeEach
    void setUp() {
        vendaRepo = mock(VendaRepository.class);
        contaRepo = mock(ContaReceberRepository.class);
        mov = mock(MovimentacaoEstoqueService.class);
        service = new VendaService(vendaRepo, mock(ProdutoRepository.class), mock(EstoqueRepository.class),
                contaRepo, mov, mock(AuditService.class));
        when(vendaRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private Venda venda(EnumStatusVenda status) {
        Produto p = new Produto();
        p.setId(1L);
        ItemVenda item = new ItemVenda();
        item.setProduto(p);
        item.setQuantidade(new BigDecimal("50"));
        Venda v = new Venda();
        v.setId(7L);
        v.setStatusVenda(status);
        v.setItens(new ArrayList<>(List.of(item)));
        when(vendaRepo.findById(7L)).thenReturn(Optional.of(v));
        return v;
    }

    @Test
    @DisplayName("Não fatura orçamento sem confirmação")
    void naoFaturaOrcamento() {
        venda(EnumStatusVenda.ORCAMENTO);
        RegraNegocioException ex = assertThrows(RegraNegocioException.class, () -> service.faturar(7L));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    @DisplayName("Não confirma venda cancelada")
    void naoConfirmaCancelada() {
        venda(EnumStatusVenda.CANCELADA);
        assertThrows(RegraNegocioException.class, () -> service.confirmar(7L));
    }

    @Test
    @DisplayName("Cancelar venda confirmada devolve estoque e cancela a conta a receber")
    void cancelarConfirmadaDesfaz() {
        Venda v = venda(EnumStatusVenda.CONFIRMADA);
        ContaReceber conta = new ContaReceber();
        conta.setValorPago(BigDecimal.ZERO);
        when(contaRepo.findByDescricaoOrDescricaoStartingWith("Venda #7", "Venda #7 - parcela ")).thenReturn(List.of(conta));

        service.cancelar(7L);

        verify(mov).aplicar(any(Produto.class), eq(EnumTipoMovEstoque.DEVOLUCAO), eq(50.0), anyString(), eq("VENDA"), eq(7L));
        assertEquals(EnumStatusFinanceiro.CANCELADO, conta.getStatusFinanceiro());
        assertEquals(EnumStatusVenda.CANCELADA, v.getStatusVenda());
    }

    @Test
    @DisplayName("Não cancela venda cuja conta já foi recebida")
    void naoCancelaRecebida() {
        venda(EnumStatusVenda.CONFIRMADA);
        ContaReceber conta = new ContaReceber();
        conta.setValorPago(new BigDecimal("100"));
        when(contaRepo.findByDescricaoOrDescricaoStartingWith("Venda #7", "Venda #7 - parcela ")).thenReturn(List.of(conta));

        assertThrows(RegraNegocioException.class, () -> service.cancelar(7L));
        verifyNoInteractions(mov);
    }

    @Test
    @DisplayName("Não cancela venda faturada")
    void naoCancelaFaturada() {
        venda(EnumStatusVenda.FATURADA);
        assertThrows(RegraNegocioException.class, () -> service.cancelar(7L));
    }

    @Test
    @DisplayName("Não exclui venda confirmada")
    void naoExcluiConfirmada() {
        venda(EnumStatusVenda.CONFIRMADA);
        assertThrows(RegraNegocioException.class, () -> service.deletar(7L));
        verify(vendaRepo, never()).delete(any());
    }

    @Test
    @DisplayName("Criação ignora status e nota enviados pelo cliente")
    void criarSempreOrcamento() {
        Venda v = new Venda();
        v.setId(99L);
        v.setStatusVenda(EnumStatusVenda.FATURADA);
        v.setNumeroNota(123);
        v.setItens(new ArrayList<>());

        Venda salva = service.criar(v);

        assertNull(salva.getId());
        assertEquals(EnumStatusVenda.ORCAMENTO, salva.getStatusVenda());
        assertNull(salva.getNumeroNota());
    }

    /** Venda pronta para confirmar: 1 item, estoque suficiente, total informado. */
    private Venda vendaParaConfirmar(String total, com.sigfec.domain.enums.EnumFormaPagamento forma, Integer parcelas) {
        EstoqueRepository estoqueRepo = mock(EstoqueRepository.class);
        com.sigfec.domain.entities.Estoque est = new com.sigfec.domain.entities.Estoque();
        est.setQuantidadeAtual(1000.0);
        when(estoqueRepo.findByProduto_Id(1L)).thenReturn(Optional.of(est));
        service = new VendaService(vendaRepo, mock(ProdutoRepository.class), estoqueRepo, contaRepo, mov, mock(AuditService.class));
        Venda v = venda(EnumStatusVenda.ORCAMENTO);
        v.setValorTotal(new BigDecimal(total));
        v.setFormaPagamento(forma);
        v.setParcelas(parcelas);
        return v;
    }

    @Test
    @DisplayName("Cartão de crédito em 3x gera 3 contas a receber (30/60/90 dias) que somam o total")
    void parcelaEmTres() {
        vendaParaConfirmar("1000.00", com.sigfec.domain.enums.EnumFormaPagamento.CARTAO_CREDITO, 3);
        service.confirmar(7L);
        var captor = org.mockito.ArgumentCaptor.forClass(ContaReceber.class);
        verify(contaRepo, times(3)).save(captor.capture());
        List<ContaReceber> contas = captor.getAllValues();
        assertEquals(0, new BigDecimal("1000.00").compareTo(contas.stream().map(ContaReceber::getValorOriginal).reduce(BigDecimal.ZERO, BigDecimal::add)));
        assertEquals(0, new BigDecimal("333.34").compareTo(contas.get(2).getValorOriginal()), "centavo de arredondamento na última");
        assertEquals(java.time.LocalDate.now().plusDays(90), contas.get(2).getDataVencimento());
        assertEquals("Venda #7 - parcela 2/3", contas.get(1).getDescricao());
        assertEquals("CARTAO_CREDITO", contas.get(0).getFormaPagamento());
    }

    @Test
    @DisplayName("Débito é à vista: 1 conta, vencendo hoje, mesmo pedindo parcelas")
    void debitoAVista() {
        Venda v = vendaParaConfirmar("500.00", com.sigfec.domain.enums.EnumFormaPagamento.CARTAO_DEBITO, 4);
        v.getItens().get(0).setValorUnitario(new BigDecimal("10")); // 50 × R$ 10 = R$ 500 (atualizar recalcula o total)
        service.atualizar(7L, v);
        service.confirmar(7L);
        var captor = org.mockito.ArgumentCaptor.forClass(ContaReceber.class);
        verify(contaRepo, times(1)).save(captor.capture());
        assertEquals(java.time.LocalDate.now(), captor.getValue().getDataVencimento());
        assertEquals("Venda #7", captor.getValue().getDescricao());
    }

    @Test
    @DisplayName("Recusa mais de 12 parcelas")
    void recusaTrezeParcelas() {
        Venda v = vendaParaConfirmar("500.00", com.sigfec.domain.enums.EnumFormaPagamento.BOLETO, 13);
        assertThrows(RegraNegocioException.class, () -> service.atualizar(7L, v));
    }
}

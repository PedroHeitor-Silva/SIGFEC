package com.sigfec.services;

import com.sigfec.domain.entities.*;
import com.sigfec.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Laudo laboratorial: uma análise por pesagem, pagamento sobre o peso final e conta a pagar ao produtor. */
class AnaliseLaboratorioServiceTest {

    private AnaliseLaboratorioRepository repo;
    private PesagemRepository pesagemRepo;
    private ContaPagarRepository contaPagarRepo;
    private AnaliseLaboratorioService service;
    private Pesagem pesagem;

    @BeforeEach
    void setUp() {
        repo = mock(AnaliseLaboratorioRepository.class);
        pesagemRepo = mock(PesagemRepository.class);
        contaPagarRepo = mock(ContaPagarRepository.class);
        TabelaPrecoRepository tabelaRepo = mock(TabelaPrecoRepository.class);
        service = new AnaliseLaboratorioService(repo, pesagemRepo, tabelaRepo, contaPagarRepo, mock(AuditService.class));

        Produto mandioca = new Produto();
        mandioca.setId(1L);
        mandioca.setPrecoBase(new BigDecimal("0.10")); // R$ por tonelada × grama de renda
        Parceiro produtor = new Parceiro();
        produtor.setId(7L);
        produtor.setNome("Produtor 7");

        pesagem = new Pesagem();
        pesagem.setId(10L);
        pesagem.setProduto(mandioca);
        pesagem.setProdutor(produtor);
        pesagem.setPesoLiquido(new BigDecimal("12000")); // 12 t
        pesagem.setPesoFinal(new BigDecimal("10000"));   // 10 t depois da impureza

        when(pesagemRepo.findById(10L)).thenReturn(Optional.of(pesagem));
        when(tabelaRepo.findVigente(anyLong(), any())).thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private static AnaliseLaboratorio analise(String... rendas) {
        AnaliseLaboratorio a = new AnaliseLaboratorio();
        List<Amostra> lista = new ArrayList<>();
        for (String r : rendas) {
            Amostra am = new Amostra();
            am.setRendaGramas(new BigDecimal(r));
            lista.add(am);
        }
        a.setAmostras(lista);
        return a;
    }

    @Test
    @DisplayName("Paga sobre o peso final (com desconto de impureza) e gera a conta a pagar do produtor")
    void pagaPesoFinalEGeraConta() {
        service.realizarAnalise(10L, analise("500", "500"));

        // 10 t × 500 g × 0,10 = 500,00 (sobre o peso líquido seriam 600,00)
        assertEquals(0, new BigDecimal("500.00").compareTo(pesagem.getValorTotal()));
        ArgumentCaptor<ContaPagar> conta = ArgumentCaptor.forClass(ContaPagar.class);
        verify(contaPagarRepo).save(conta.capture());
        assertEquals(0, new BigDecimal("500.00").compareTo(conta.getValue().getValorOriginal()));
        assertEquals(7L, conta.getValue().getFornecedor().getId());
        assertNotNull(conta.getValue().getDataVencimento());
    }

    @Test
    @DisplayName("Carga reprovada não gera conta a pagar")
    void reprovadaNaoGeraConta() {
        service.realizarAnalise(10L, analise("200", "250"));
        verify(contaPagarRepo, never()).save(any());
    }

    @Test
    @DisplayName("Recusa segunda análise da mesma pesagem")
    void recusaDuplicada() {
        when(repo.existsByPesagemId(10L)).thenReturn(true);
        RegraNegocioException ex = assertThrows(RegraNegocioException.class,
                () -> service.realizarAnalise(10L, analise("500", "500")));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("Recusa análise sem nenhuma renda informada")
    void recusaSemAmostras() {
        RegraNegocioException ex = assertThrows(RegraNegocioException.class,
                () -> service.realizarAnalise(10L, analise("0")));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }
}

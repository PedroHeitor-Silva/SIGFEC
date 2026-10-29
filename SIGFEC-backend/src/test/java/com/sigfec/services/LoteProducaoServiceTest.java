package com.sigfec.services;

import com.sigfec.domain.entities.AnaliseLaboratorio;
import com.sigfec.domain.entities.LoteProducao;
import com.sigfec.domain.entities.Pesagem;
import com.sigfec.domain.entities.Produto;
import com.sigfec.domain.enums.EnumStatusQualidade;
import com.sigfec.domain.enums.EnumUnidadeMedida;
import com.sigfec.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Só carga com laudo e não reprovada entra na produção; o produto do lote é carregado completo. */
class LoteProducaoServiceTest {

    private PesagemRepository pesagemRepo;
    private AnaliseLaboratorioRepository analiseRepo;
    private LoteProducaoRepository loteRepo;
    private LoteProducaoService service;

    @BeforeEach
    void setUp() {
        pesagemRepo = mock(PesagemRepository.class);
        analiseRepo = mock(AnaliseLaboratorioRepository.class);
        loteRepo = mock(LoteProducaoRepository.class);
        ProdutoRepository produtoRepo = mock(ProdutoRepository.class);
        service = new LoteProducaoService(loteRepo, pesagemRepo, produtoRepo, analiseRepo,
                mock(EstoqueRepository.class), mock(MovimentacaoEstoqueService.class), mock(AuditService.class));

        Produto fecula = new Produto();
        fecula.setId(4L);
        fecula.setUnidadeMedida(EnumUnidadeMedida.SACO_25KG);
        when(produtoRepo.findById(4L)).thenReturn(Optional.of(fecula));
        when(loteRepo.findByCodigoLote(any())).thenReturn(Optional.empty());
        when(loteRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Pesagem p = new Pesagem();
        p.setId(10L);
        p.setPesoFinal(new BigDecimal("10000"));
        when(pesagemRepo.findById(10L)).thenReturn(Optional.of(p));
    }

    private LoteProducao lote() {
        Produto ref = new Produto();
        ref.setId(4L);
        Pesagem stub = new Pesagem();
        stub.setId(10L);
        LoteProducao l = new LoteProducao();
        l.setProduto(ref);
        l.setQuantidadeProduzida(new BigDecimal("100")); // 100 sacos de 25 kg
        l.setPesagensConsumidas(Set.of(stub));
        return l;
    }

    private void laudo(EnumStatusQualidade status) {
        AnaliseLaboratorio a = new AnaliseLaboratorio();
        a.setStatusQualidade(status);
        when(analiseRepo.findByPesagemId(10L)).thenReturn(Optional.of(a));
    }

    @Test
    @DisplayName("Recusa carga sem laudo")
    void recusaSemLaudo() {
        when(analiseRepo.findByPesagemId(10L)).thenReturn(Optional.empty());
        RegraNegocioException ex = assertThrows(RegraNegocioException.class, () -> service.criar(lote()));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    @DisplayName("Recusa carga reprovada no laboratório")
    void recusaReprovada() {
        laudo(EnumStatusQualidade.REPROVADO);
        assertThrows(RegraNegocioException.class, () -> service.criar(lote()));
    }

    @Test
    @DisplayName("Rendimento converte sacos em kg: 100 sacos × 25 kg / 10.000 kg = 25%")
    void rendimentoEmKg() {
        laudo(EnumStatusQualidade.APROVADO);
        LoteProducao salvo = service.criar(lote());
        salvo.recalcular();
        assertEquals(0, new BigDecimal("25.00").compareTo(salvo.getRendimentoReal()));
    }
}

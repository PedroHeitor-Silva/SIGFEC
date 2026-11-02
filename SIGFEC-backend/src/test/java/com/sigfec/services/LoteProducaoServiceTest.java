package com.sigfec.services;

import com.sigfec.domain.entities.AnaliseLaboratorio;
import com.sigfec.domain.entities.LoteProducao;
import com.sigfec.domain.entities.Pesagem;
import com.sigfec.domain.entities.Produto;
import com.sigfec.domain.enums.EnumCategoriaProduto;
import com.sigfec.domain.enums.EnumStatusLote;
import com.sigfec.domain.enums.EnumStatusQualidade;
import com.sigfec.domain.enums.EnumTipoMovEstoque;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Só carga com laudo e não reprovada entra na produção; o produto do lote é carregado completo. */
class LoteProducaoServiceTest {

    private PesagemRepository pesagemRepo;
    private AnaliseLaboratorioRepository analiseRepo;
    private LoteProducaoRepository loteRepo;
    private LoteProducaoService service;
    private MovimentacaoEstoqueService movService;
    private ProdutoRepository produtoRepo;
    private Produto fecula;

    @BeforeEach
    void setUp() {
        pesagemRepo = mock(PesagemRepository.class);
        analiseRepo = mock(AnaliseLaboratorioRepository.class);
        loteRepo = mock(LoteProducaoRepository.class);
        produtoRepo = mock(ProdutoRepository.class);
        movService = mock(MovimentacaoEstoqueService.class);
        service = new LoteProducaoService(loteRepo, pesagemRepo, produtoRepo, analiseRepo,
                mock(EstoqueRepository.class), movService, mock(AuditService.class));

        fecula = new Produto();
        fecula.setId(4L);
        fecula.setUnidadeMedida(EnumUnidadeMedida.SACO_25KG);
        fecula.setCategoria(EnumCategoriaProduto.FECULA);
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

    @Test
    @DisplayName("Finalizar lote gera entrada do produto e do resíduo fibroso (12% do peso final, em toneladas)")
    void finalizarGeraResiduo() {
        Produto residuo = new Produto();
        residuo.setId(10L);
        residuo.setCategoria(EnumCategoriaProduto.RESIDUO_FIBROSO);
        when(produtoRepo.findFirstByCategoria(EnumCategoriaProduto.RESIDUO_FIBROSO)).thenReturn(Optional.of(residuo));
        Pesagem p = new Pesagem();
        p.setId(10L);
        p.setPesoFinal(new BigDecimal("10000"));
        LoteProducao lote = new LoteProducao();
        lote.setId(1L);
        lote.setCodigoLote("LOT-TESTE");
        lote.setProduto(fecula);
        lote.setQuantidadeProduzida(new BigDecimal("100"));
        lote.setStatusLote(EnumStatusLote.EM_PRODUCAO);
        lote.setPesagensConsumidas(Set.of(p));
        when(loteRepo.findById(1L)).thenReturn(Optional.of(lote));

        service.mudarStatus(1L, EnumStatusLote.FINALIZADO);

        verify(movService).aplicar(eq(fecula), eq(EnumTipoMovEstoque.ENTRADA_PRODUCAO), eq(100.0), anyString(), eq("LOTE"), eq(1L));
        verify(movService).aplicar(eq(residuo), eq(EnumTipoMovEstoque.ENTRADA_PRODUCAO), eq(1.2), anyString(), eq("LOTE"), eq(1L));
    }
}

package com.sigfec.services;

import com.sigfec.domain.entities.Parceiro;
import com.sigfec.domain.entities.Pesagem;
import com.sigfec.domain.enums.EnumTipoParceiro;
import com.sigfec.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Validações da pesagem no servidor (antes só o front validava). */
class PesagemServiceTest {

    private PesagemRepository repo;
    private ParceiroRepository parceiroRepo;
    private PesagemService service;

    @BeforeEach
    void setUp() {
        repo = mock(PesagemRepository.class);
        parceiroRepo = mock(ParceiroRepository.class);
        service = new PesagemService(repo, mock(FilaService.class), mock(EntradaFilaRepository.class),
                mock(AnaliseLaboratorioRepository.class), parceiroRepo);
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private Parceiro parceiro(long id, EnumTipoParceiro tipo) {
        Parceiro p = new Parceiro();
        p.setId(id);
        p.setNome("Parceiro " + id);
        p.setTipoParceiro(tipo);
        when(parceiroRepo.findById(id)).thenReturn(Optional.of(p));
        return p;
    }

    private static Pesagem pesagem(long produtorId, String bruto, String tara) {
        Parceiro ref = new Parceiro();
        ref.setId(produtorId);
        Pesagem p = new Pesagem();
        p.setProdutor(ref);
        p.setPesoBruto(new BigDecimal(bruto));
        p.setPesoTara(new BigDecimal(tara));
        return p;
    }

    @Test
    @DisplayName("Recusa cliente no lugar de produtor")
    void recusaCliente() {
        parceiro(4, EnumTipoParceiro.CLIENTE);
        RegraNegocioException ex = assertThrows(RegraNegocioException.class,
                () -> service.salvar(pesagem(4, "30000", "18500"), null));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Recusa bruto menor ou igual à tara")
    void recusaBrutoMenorQueTara() {
        parceiro(3, EnumTipoParceiro.PRODUTOR);
        assertThrows(RegraNegocioException.class, () -> service.salvar(pesagem(3, "10000", "18500"), null));
        assertThrows(RegraNegocioException.class, () -> service.salvar(pesagem(3, "18500", "18500"), null));
    }

    @Test
    @DisplayName("Ignora id, valor e 'consumida' enviados pelo cliente")
    void ignoraCamposDeSistema() {
        parceiro(3, EnumTipoParceiro.PRODUTOR);
        Pesagem p = pesagem(3, "30000", "18500");
        p.setId(1L);
        p.setConsumida(true);
        p.setValorTotal(new BigDecimal("999999"));

        Pesagem salva = service.salvar(p, null);

        assertNull(salva.getId());
        assertFalse(salva.isConsumida());
        assertNull(salva.getValorTotal());
    }
}

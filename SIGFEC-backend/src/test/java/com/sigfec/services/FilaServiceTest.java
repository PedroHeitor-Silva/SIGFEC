package com.sigfec.services;

import com.sigfec.domain.dto.fila.EntradaFilaDTO;
import com.sigfec.domain.dto.fila.FilaRequests;
import com.sigfec.domain.entities.*;
import com.sigfec.domain.enums.EnumStatusChecklist;
import com.sigfec.domain.enums.EnumStatusEntrada;
import com.sigfec.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static com.sigfec.domain.enums.EnumStatusEntrada.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Máquina de estados da fila: chamada condicionada ao checklist, local de chamada e transições válidas. */
class FilaServiceTest {

    private EntradaFilaRepository repo;
    private ChecklistCargaRepository checklistRepo;
    private VeiculoRepository veiculoRepo;
    private MotoristaRepository motoristaRepo;
    private FilaService service;

    @BeforeEach
    void setUp() {
        repo = mock(EntradaFilaRepository.class);
        checklistRepo = mock(ChecklistCargaRepository.class);
        veiculoRepo = mock(VeiculoRepository.class);
        motoristaRepo = mock(MotoristaRepository.class);
        service = new FilaService(repo, checklistRepo, veiculoRepo, motoristaRepo,
                mock(ParceiroRepository.class), mock(AuditService.class), List.of("Balança 1", "Balança 2"));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(repo.saveAndFlush(any())).thenAnswer(i -> { EntradaFila e = i.getArgument(0); e.setId(99L); return e; });
    }

    private EntradaFila entrada(EnumStatusEntrada status) {
        Veiculo v = new Veiculo();
        v.setId(10L);
        v.setPlaca("ABC1D23");
        EntradaFila e = new EntradaFila();
        e.setId(1L);
        e.setSenhaDiaria(3);
        e.setDataReferencia(LocalDate.now());
        e.setStatus(status);
        e.setVeiculo(v);
        e.setDataHoraEntrada(LocalDateTime.now());
        when(repo.findById(1L)).thenReturn(Optional.of(e));
        return e;
    }

    private void checklist(EnumStatusChecklist status) {
        ChecklistCarga c = new ChecklistCarga();
        c.setStatus(status);
        when(checklistRepo.findByEntradaFilaId(1L)).thenReturn(Optional.of(c));
    }

    private static HttpStatus statusDe(Runnable r) {
        return assertThrows(RegraNegocioException.class, r::run).getStatus();
    }

    // ---------------------------------------------------------------- chamada

    @Test
    @DisplayName("Não chama sem checklist preenchido")
    void naoChamaSemChecklist() {
        entrada(AGUARDANDO);
        when(checklistRepo.findByEntradaFilaId(1L)).thenReturn(Optional.empty());
        assertEquals(HttpStatus.CONFLICT, statusDe(() -> service.chamar(1L, "Balança 1")));
    }

    @Test
    @DisplayName("Não chama com checklist reprovado")
    void naoChamaReprovado() {
        entrada(AGUARDANDO);
        checklist(EnumStatusChecklist.REPROVADO);
        RegraNegocioException ex = assertThrows(RegraNegocioException.class, () -> service.chamar(1L, "Balança 1"));
        assertTrue(ex.getMessage().contains("reprovado"));
    }

    @Test
    @DisplayName("Chama com checklist aprovado e registra o local")
    void chamaAprovado() {
        EntradaFila e = entrada(AGUARDANDO);
        checklist(EnumStatusChecklist.APROVADO);
        when(repo.findFirstByLocalChamadaAndStatusIn(eq("Balança 1"), any())).thenReturn(Optional.empty());

        EntradaFilaDTO dto = service.chamar(1L, "balança 1");

        assertEquals(CHAMADO, e.getStatus());
        assertEquals("Balança 1", e.getLocalChamada()); // normalizado para o nome configurado
        assertNotNull(e.getDataHoraChamada());
        assertEquals("Balança 1", dto.localChamada());
    }

    @Test
    @DisplayName("Local de chamada é obrigatório e precisa existir")
    void localInvalido() {
        entrada(AGUARDANDO);
        checklist(EnumStatusChecklist.APROVADO);
        assertEquals(HttpStatus.BAD_REQUEST, statusDe(() -> service.chamar(1L, " ")));
        assertEquals(HttpStatus.BAD_REQUEST, statusDe(() -> service.chamar(1L, "Moega 9")));
    }

    @Test
    @DisplayName("Não chama para um local ocupado por outra senha")
    void localOcupado() {
        entrada(AGUARDANDO);
        checklist(EnumStatusChecklist.APROVADO);
        EntradaFila ocupante = new EntradaFila();
        ocupante.setSenhaDiaria(2);
        Veiculo v = new Veiculo();
        v.setPlaca("XYZ9Z99");
        ocupante.setVeiculo(v);
        when(repo.findFirstByLocalChamadaAndStatusIn(eq("Balança 1"), any())).thenReturn(Optional.of(ocupante));

        RegraNegocioException ex = assertThrows(RegraNegocioException.class, () -> service.chamar(1L, "Balança 1"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("#002"));
    }

    @Test
    @DisplayName("Não chama quem não está aguardando")
    void naoChamaFinalizado() {
        entrada(FINALIZADO);
        assertEquals(HttpStatus.CONFLICT, statusDe(() -> service.chamar(1L, "Balança 1")));
    }

    // ---------------------------------------------------------------- transições

    @Test
    @DisplayName("Atender exige estar CHAMADO")
    void atenderSoChamado() {
        entrada(AGUARDANDO);
        assertEquals(HttpStatus.CONFLICT, statusDe(() -> service.atender(1L)));
    }

    @Test
    @DisplayName("Devolver à fila limpa o local e volta a AGUARDANDO")
    void devolver() {
        EntradaFila e = entrada(CHAMADO);
        e.setLocalChamada("Balança 1");
        e.setDataHoraChamada(LocalDateTime.now());

        service.devolverParaFila(1L);

        assertEquals(AGUARDANDO, e.getStatus());
        assertNull(e.getLocalChamada());
        assertNull(e.getDataHoraChamada());
    }

    @Test
    @DisplayName("Cancelar exige motivo")
    void cancelarSemMotivo() {
        entrada(AGUARDANDO);
        assertEquals(HttpStatus.BAD_REQUEST, statusDe(() -> service.cancelar(1L, "  ")));
    }

    @Test
    @DisplayName("Não cancela entrada já finalizada")
    void naoCancelaFinalizada() {
        entrada(FINALIZADO);
        assertEquals(HttpStatus.CONFLICT, statusDe(() -> service.cancelar(1L, "desistiu")));
    }

    @Test
    @DisplayName("Pesagem só é registrada com a senha EM_ATENDIMENTO")
    void pesagemSoEmAtendimento() {
        entrada(CHAMADO);
        assertEquals(HttpStatus.CONFLICT, statusDe(() -> service.prepararPesagem(1L, new Pesagem())));
    }

    @Test
    @DisplayName("Pesagem de outro veículo é recusada")
    void pesagemOutroVeiculo() {
        entrada(EM_ATENDIMENTO);
        Pesagem p = new Pesagem();
        Veiculo outro = new Veiculo();
        outro.setId(77L);
        p.setVeiculo(outro);
        assertEquals(HttpStatus.BAD_REQUEST, statusDe(() -> service.prepararPesagem(1L, p)));
    }

    // ---------------------------------------------------------------- chegada

    @Test
    @DisplayName("Mesmo veículo não entra duas vezes na fila")
    void veiculoDuplicado() {
        Veiculo v = new Veiculo();
        v.setId(10L);
        v.setPlaca("ABC1D23");
        v.setStatusAtivo(true);
        Motorista m = new Motorista();
        m.setId(5L);
        m.setNome("Robison");
        m.setStatusAtivo(true);
        when(veiculoRepo.findById(10L)).thenReturn(Optional.of(v));
        when(motoristaRepo.findById(5L)).thenReturn(Optional.of(m));
        when(repo.existsByVeiculoIdAndStatusIn(eq(10L), any())).thenReturn(true);

        assertEquals(HttpStatus.CONFLICT, statusDe(() ->
                service.registrarChegada(new FilaRequests.RegistrarChegada(10L, 5L, null, null))));
    }

    @Test
    @DisplayName("Motorista com CNH vencida não entra na fila")
    void cnhVencida() {
        Veiculo v = new Veiculo();
        v.setId(10L);
        v.setStatusAtivo(true);
        Motorista m = new Motorista();
        m.setId(5L);
        m.setNome("Robison");
        m.setStatusAtivo(true);
        m.setValidadeCnh(LocalDate.now().minusDays(1));
        when(veiculoRepo.findById(10L)).thenReturn(Optional.of(v));
        when(motoristaRepo.findById(5L)).thenReturn(Optional.of(m));

        assertEquals(HttpStatus.CONFLICT, statusDe(() ->
                service.registrarChegada(new FilaRequests.RegistrarChegada(10L, 5L, null, null))));
    }

    @Test
    @DisplayName("Chegada válida emite a próxima senha do dia")
    void chegadaEmiteSenha() {
        Veiculo v = new Veiculo();
        v.setId(10L);
        v.setStatusAtivo(true);
        Motorista m = new Motorista();
        m.setId(5L);
        m.setStatusAtivo(true);
        when(veiculoRepo.findById(10L)).thenReturn(Optional.of(v));
        when(motoristaRepo.findById(5L)).thenReturn(Optional.of(m));
        EntradaFila ultima = new EntradaFila();
        ultima.setSenhaDiaria(4);
        when(repo.findTopByDataReferenciaOrderBySenhaDiariaDesc(any())).thenReturn(Optional.of(ultima));

        EntradaFilaDTO dto = service.registrarChegada(new FilaRequests.RegistrarChegada(10L, 5L, null, null));

        assertEquals(5, dto.senhaDiaria());
        assertEquals(AGUARDANDO, dto.status());
        assertEquals(EnumStatusChecklist.PENDENTE, dto.checklistStatus());
    }
}

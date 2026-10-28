package com.sigfec.services;

import com.sigfec.domain.dto.fila.EntradaFilaDTO;
import com.sigfec.domain.dto.fila.FilaRequests;
import com.sigfec.domain.entities.*;
import com.sigfec.domain.enums.EnumStatusChecklist;
import com.sigfec.domain.enums.EnumStatusEntrada;
import com.sigfec.domain.enums.EnumTipoParceiro;
import com.sigfec.repositories.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static com.sigfec.domain.enums.EnumStatusEntrada.*;

/**
 * Regras da fila de descarga. Transições permitidas:
 * <pre>
 *   AGUARDANDO ──chamar (checklist APROVADO + local livre)──▶ CHAMADO
 *   CHAMADO ──atender──▶ EM_ATENDIMENTO ──pesagem registrada──▶ FINALIZADO
 *   CHAMADO ──devolver (não compareceu)──▶ AGUARDANDO
 *   AGUARDANDO | CHAMADO | EM_ATENDIMENTO ──cancelar (motivo)──▶ CANCELADO
 * </pre>
 */
@Service
public class FilaService {

    static final Set<EnumStatusEntrada> ATIVOS = EnumSet.of(AGUARDANDO, CHAMADO, EM_ATENDIMENTO);
    private static final Set<EnumStatusEntrada> OCUPANDO_LOCAL = EnumSet.of(CHAMADO, EM_ATENDIMENTO);

    private final EntradaFilaRepository repository;
    private final ChecklistCargaRepository checklistRepository;
    private final VeiculoRepository veiculoRepository;
    private final MotoristaRepository motoristaRepository;
    private final ParceiroRepository parceiroRepository;
    private final AuditService auditService;
    private final List<String> locaisChamada;

    public FilaService(EntradaFilaRepository repository,
                       ChecklistCargaRepository checklistRepository,
                       VeiculoRepository veiculoRepository,
                       MotoristaRepository motoristaRepository,
                       ParceiroRepository parceiroRepository,
                       AuditService auditService,
                       @Value("${sigfec.fila.locais-chamada:Balança 1}") List<String> locaisChamada) {
        this.repository = repository;
        this.checklistRepository = checklistRepository;
        this.veiculoRepository = veiculoRepository;
        this.motoristaRepository = motoristaRepository;
        this.parceiroRepository = parceiroRepository;
        this.auditService = auditService;
        this.locaisChamada = locaisChamada.stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    // ------------------------------------------------------------------ consultas

    /** Locais para onde um veículo pode ser chamado (configurável em application.properties). */
    public List<String> locaisChamada() {
        return locaisChamada;
    }

    /** Fila do dia mais as entradas ainda ativas de dias anteriores. Filtro opcional por status. */
    @Transactional(readOnly = true)
    public List<EntradaFilaDTO> listar(LocalDate data, EnumStatusEntrada status) {
        List<EntradaFila> entradas = repository
                .findByDataReferenciaOrStatusInOrderByDataReferenciaAscSenhaDiariaAsc(data, ATIVOS);
        if (status != null) {
            entradas = entradas.stream().filter(e -> e.getStatus() == status).toList();
        }
        return comChecklist(entradas);
    }

    @Transactional(readOnly = true)
    public EntradaFilaDTO buscar(Long id) {
        EntradaFila e = carregar(id);
        return EntradaFilaDTO.of(e, statusChecklist(id));
    }

    /** Próximo veículo apto: o mais antigo AGUARDANDO com checklist APROVADO. */
    @Transactional(readOnly = true)
    public Optional<EntradaFilaDTO> proximoApto() {
        return comChecklist(repository.findByStatusInOrderByDataReferenciaAscSenhaDiariaAsc(Set.of(AGUARDANDO)))
                .stream()
                .filter(d -> d.checklistStatus() == EnumStatusChecklist.APROVADO)
                .findFirst();
    }

    // ------------------------------------------------------------------ chegada

    /**
     * Registra a chegada e emite a próxima senha do dia.
     * Sem transação externa: cada tentativa grava e confirma sozinha, e a restrição única
     * (data, senha) resolve a concorrência entre dois cadastros simultâneos.
     */
    public synchronized EntradaFilaDTO registrarChegada(FilaRequests.RegistrarChegada req) {
        if (req == null || req.veiculoId() == null) throw RegraNegocioException.invalida("Veículo é obrigatório.");
        if (req.motoristaId() == null) throw RegraNegocioException.invalida("Motorista é obrigatório.");

        Veiculo veiculo = veiculoRepository.findById(req.veiculoId())
                .orElseThrow(() -> RegraNegocioException.naoEncontrada("Veículo não encontrado."));
        if (!veiculo.isStatusAtivo()) throw RegraNegocioException.conflito("Veículo " + veiculo.getPlaca() + " está inativo.");

        Motorista motorista = motoristaRepository.findById(req.motoristaId())
                .orElseThrow(() -> RegraNegocioException.naoEncontrada("Motorista não encontrado."));
        if (!motorista.isStatusAtivo()) throw RegraNegocioException.conflito("Motorista " + motorista.getNome() + " está inativo.");
        if (motorista.getValidadeCnh() != null && motorista.getValidadeCnh().isBefore(LocalDate.now())) {
            throw RegraNegocioException.conflito("CNH do motorista " + motorista.getNome() + " está vencida.");
        }

        Parceiro produtor = null;
        if (req.produtorId() != null) {
            produtor = parceiroRepository.findById(req.produtorId())
                    .orElseThrow(() -> RegraNegocioException.naoEncontrada("Produtor não encontrado."));
            if (produtor.getTipoParceiro() != EnumTipoParceiro.PRODUTOR) {
                throw RegraNegocioException.invalida(produtor.getNome() + " não é um produtor.");
            }
        }

        if (repository.existsByVeiculoIdAndStatusIn(veiculo.getId(), ATIVOS)) {
            throw RegraNegocioException.conflito("O veículo " + veiculo.getPlaca() + " já está na fila.");
        }
        if (repository.existsByMotoristaIdAndStatusIn(motorista.getId(), ATIVOS)) {
            throw RegraNegocioException.conflito("O motorista " + motorista.getNome() + " já está na fila com outro veículo.");
        }

        LocalDate hoje = LocalDate.now();
        for (int tentativa = 1; ; tentativa++) {
            EntradaFila e = new EntradaFila();
            e.setVeiculo(veiculo);
            e.setMotorista(motorista);
            e.setProdutor(produtor);
            e.setObservacao(limpar(req.observacao()));
            e.setDataReferencia(hoje);
            e.setSenhaDiaria(proximaSenha(hoje));
            e.setStatus(AGUARDANDO);
            e.setDataHoraEntrada(LocalDateTime.now());
            try {
                EntradaFila salva = repository.saveAndFlush(e);
                auditService.log("FILA_CHEGADA", "EntradaFila", salva.getId(),
                        "senha=" + salva.getSenhaDiaria() + " placa=" + veiculo.getPlaca());
                return EntradaFilaDTO.of(salva, EnumStatusChecklist.PENDENTE);
            } catch (DataIntegrityViolationException ex) {
                if (tentativa >= 3) throw RegraNegocioException.conflito("Não foi possível emitir a senha. Tente novamente.");
            }
        }
    }

    /** Próxima senha sequencial do dia (começa em 1). */
    int proximaSenha(LocalDate data) {
        return repository.findTopByDataReferenciaOrderBySenhaDiariaDesc(data)
                .map(e -> (e.getSenhaDiaria() == null ? 0 : e.getSenhaDiaria()) + 1)
                .orElse(1);
    }

    // ------------------------------------------------------------------ chamada

    /** Chama um veículo para um local. Exige checklist APROVADO e local livre. */
    @Transactional
    public EntradaFilaDTO chamar(Long id, String local) {
        EntradaFila e = carregar(id);
        exigirStatus(e, AGUARDANDO, "chamar");
        EnumStatusChecklist checklist = statusChecklist(id);
        if (checklist != EnumStatusChecklist.APROVADO) {
            throw RegraNegocioException.conflito(checklist == EnumStatusChecklist.REPROVADO
                    ? "Checklist da senha " + senha(e) + " foi reprovado: o veículo não pode ser chamado."
                    : "Aprove o checklist da senha " + senha(e) + " antes de chamar.");
        }
        String destino = validarLocal(local);
        exigirLocalLivre(destino);

        e.setStatus(CHAMADO);
        e.setLocalChamada(destino);
        e.setDataHoraChamada(LocalDateTime.now());
        auditService.log("FILA_CHAMADA", "EntradaFila", e.getId(), "senha=" + e.getSenhaDiaria() + " local=" + destino);
        return EntradaFilaDTO.of(repository.save(e), checklist);
    }

    /** Chama o próximo veículo apto (ordem de chegada, checklist aprovado) para o local. */
    @Transactional
    public EntradaFilaDTO chamarProximo(String local) {
        EntradaFilaDTO proximo = proximoApto().orElseThrow(() ->
                RegraNegocioException.conflito("Nenhum veículo aguardando com checklist aprovado."));
        return chamar(proximo.id(), local);
    }

    /** Veículo chamado não compareceu: volta a aguardar, mantendo a senha (e a posição). */
    @Transactional
    public EntradaFilaDTO devolverParaFila(Long id) {
        EntradaFila e = carregar(id);
        exigirStatus(e, CHAMADO, "devolver à fila");
        String local = e.getLocalChamada();
        e.setStatus(AGUARDANDO);
        e.setLocalChamada(null);
        e.setDataHoraChamada(null);
        auditService.log("FILA_DEVOLVIDA", "EntradaFila", e.getId(), "senha=" + e.getSenhaDiaria() + " local=" + local);
        return EntradaFilaDTO.of(repository.save(e), statusChecklist(id));
    }

    /** Veículo chegou ao local de chamada: começa o atendimento na balança. */
    @Transactional
    public EntradaFilaDTO atender(Long id) {
        EntradaFila e = carregar(id);
        exigirStatus(e, CHAMADO, "iniciar o atendimento");
        e.setStatus(EM_ATENDIMENTO);
        auditService.log("FILA_ATENDIMENTO", "EntradaFila", e.getId(), "senha=" + e.getSenhaDiaria() + " local=" + e.getLocalChamada());
        return EntradaFilaDTO.of(repository.save(e), statusChecklist(id));
    }

    // ------------------------------------------------------------------ pesagem e encerramento

    /**
     * Valida a entrada para receber uma pesagem e completa veículo/produtor que faltarem.
     * Chamado pela PesagemService dentro da mesma transação do salvamento.
     */
    @Transactional
    public EntradaFila prepararPesagem(Long entradaId, Pesagem pesagem) {
        EntradaFila e = carregar(entradaId);
        exigirStatus(e, EM_ATENDIMENTO, "registrar a pesagem");
        if (e.getPesagem() != null) throw RegraNegocioException.conflito("A senha " + senha(e) + " já tem pesagem.");

        if (pesagem.getVeiculo() == null) {
            pesagem.setVeiculo(e.getVeiculo());
        } else if (!Objects.equals(pesagem.getVeiculo().getId(), e.getVeiculo().getId())) {
            throw RegraNegocioException.invalida("O veículo da pesagem difere do veículo da senha " + senha(e) + ".");
        }
        if (e.getProdutor() != null) {
            if (pesagem.getProdutor() == null) {
                pesagem.setProdutor(e.getProdutor());
            } else if (!Objects.equals(pesagem.getProdutor().getId(), e.getProdutor().getId())) {
                throw RegraNegocioException.invalida("O produtor da pesagem difere do produtor da senha " + senha(e) + ".");
            }
        }
        return e;
    }

    /** Vincula a pesagem salva e finaliza a entrada. */
    @Transactional
    public void finalizarComPesagem(EntradaFila e, Pesagem pesagem) {
        e.setPesagem(pesagem);
        if (e.getProdutor() == null) e.setProdutor(pesagem.getProdutor());
        e.setStatus(FINALIZADO);
        e.setDataHoraFinalizacao(LocalDateTime.now());
        repository.save(e);
        auditService.log("FILA_FINALIZADA", "EntradaFila", e.getId(), "senha=" + e.getSenhaDiaria() + " pesagem=" + pesagem.getId());
    }

    /** Cancela uma entrada ativa. O motivo é obrigatório e fica registrado. */
    @Transactional
    public EntradaFilaDTO cancelar(Long id, String motivo) {
        EntradaFila e = carregar(id);
        if (!e.isAtiva()) throw RegraNegocioException.conflito("A senha " + senha(e) + " já está " + e.getStatus().name().toLowerCase() + ".");
        String m = limpar(motivo);
        if (m == null) throw RegraNegocioException.invalida("Informe o motivo do cancelamento.");

        e.setStatus(CANCELADO);
        e.setLocalChamada(null);
        e.setDataHoraFinalizacao(LocalDateTime.now());
        String obs = e.getObservacao();
        e.setObservacao(((obs == null || obs.isBlank()) ? "" : obs + " | ") + "Cancelado: " + m);
        auditService.log("FILA_CANCELADA", "EntradaFila", e.getId(), "senha=" + e.getSenhaDiaria() + " motivo=" + m);
        return EntradaFilaDTO.of(repository.save(e), statusChecklist(id));
    }

    // ------------------------------------------------------------------ apoio

    EntradaFila carregar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> RegraNegocioException.naoEncontrada("Entrada da fila " + id + " não encontrada."));
    }

    private EnumStatusChecklist statusChecklist(Long entradaId) {
        return checklistRepository.findByEntradaFilaId(entradaId)
                .map(ChecklistCarga::getStatus)
                .orElse(EnumStatusChecklist.PENDENTE);
    }

    private List<EntradaFilaDTO> comChecklist(List<EntradaFila> entradas) {
        if (entradas.isEmpty()) return List.of();
        Map<Long, EnumStatusChecklist> porEntrada = checklistRepository
                .findByEntradaFilaIdIn(entradas.stream().map(EntradaFila::getId).toList())
                .stream()
                .collect(Collectors.toMap(c -> c.getEntradaFila().getId(), ChecklistCarga::getStatus, (a, b) -> a));
        return entradas.stream().map(e -> EntradaFilaDTO.of(e, porEntrada.get(e.getId()))).toList();
    }

    private void exigirStatus(EntradaFila e, EnumStatusEntrada esperado, String acao) {
        if (e.getStatus() != esperado) {
            throw RegraNegocioException.conflito("Não é possível " + acao + ": a senha " + senha(e)
                    + " está " + e.getStatus().name().toLowerCase().replace('_', ' ') + ".");
        }
    }

    private String validarLocal(String local) {
        String l = limpar(local);
        if (l == null) throw RegraNegocioException.invalida("Informe o local de chamada.");
        return locaisChamada.stream().filter(x -> x.equalsIgnoreCase(l)).findFirst()
                .orElseThrow(() -> RegraNegocioException.invalida("Local de chamada inválido: " + l + "."));
    }

    private void exigirLocalLivre(String local) {
        repository.findFirstByLocalChamadaAndStatusIn(local, OCUPANDO_LOCAL).ifPresent(o -> {
            throw RegraNegocioException.conflito(local + " está ocupada pela senha " + senha(o)
                    + " (" + o.getVeiculo().getPlaca() + "). Finalize ou devolva essa senha antes.");
        });
    }

    private static String senha(EntradaFila e) {
        return "#" + String.format("%03d", e.getSenhaDiaria() == null ? 0 : e.getSenhaDiaria());
    }

    private static String limpar(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}

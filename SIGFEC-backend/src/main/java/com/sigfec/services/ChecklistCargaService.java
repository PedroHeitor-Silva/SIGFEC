package com.sigfec.services;

import com.sigfec.domain.dto.fila.FilaRequests;
import com.sigfec.domain.entities.ChecklistCarga;
import com.sigfec.domain.entities.EntradaFila;
import com.sigfec.domain.enums.EnumStatusChecklist;
import com.sigfec.domain.enums.EnumStatusEntrada;
import com.sigfec.repositories.ChecklistCargaRepository;
import com.sigfec.repositories.EntradaFilaRepository;
import com.sigfec.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Checklist de inspeção da carga. O status é sempre calculado aqui a partir das respostas,
 * o avaliador vem do usuário autenticado, e só é possível avaliar enquanto a entrada aguarda chamada.
 */
@Service
@RequiredArgsConstructor
public class ChecklistCargaService {

    private final ChecklistCargaRepository repository;
    private final EntradaFilaRepository entradaRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public Optional<ChecklistCarga> buscarPorEntrada(Long entradaId) {
        return repository.findByEntradaFilaId(entradaId);
    }

    /** Cria ou atualiza o checklist da entrada (1:1). */
    @Transactional
    public ChecklistCarga salvar(Long entradaId, FilaRequests.Checklist req) {
        if (req == null) throw RegraNegocioException.invalida("Envie as respostas do checklist.");
        EntradaFila entrada = entradaRepository.findById(entradaId)
                .orElseThrow(() -> RegraNegocioException.naoEncontrada("Entrada da fila " + entradaId + " não encontrada."));
        if (entrada.getStatus() != EnumStatusEntrada.AGUARDANDO) {
            throw RegraNegocioException.conflito("O checklist só pode ser alterado enquanto o veículo aguarda chamada "
                    + "(situação atual: " + entrada.getStatus().name().toLowerCase().replace('_', ' ') + ").");
        }

        ChecklistCarga c = repository.findByEntradaFilaId(entradaId).orElseGet(() -> {
            ChecklistCarga novo = new ChecklistCarga();
            novo.setEntradaFila(entrada);
            return novo;
        });
        c.setSemVestigiosToxicos(req.semVestigiosToxicos());
        c.setHigieneLimpeza(req.higieneLimpeza());
        c.setEstruturaConservada(req.estruturaConservada());
        c.setLonaCordaOk(req.lonaCordaOk());
        c.setAusenciaPragas(req.ausenciaPragas());
        c.setSecosSemOdor(req.secosSemOdor());
        c.setForroOk(req.forroOk());
        c.setSacariaLimpa(req.sacariaLimpa());
        c.setSacariaSemAvaria(req.sacariaSemAvaria());
        c.setLonasAdequadas(req.lonasAdequadas());
        c.setObservacao(req.observacao() == null || req.observacao().isBlank() ? null : req.observacao().trim());

        EnumStatusChecklist status = c.calcularStatus();
        c.setStatus(status);
        if (status == EnumStatusChecklist.PENDENTE) {
            c.setAvaliadoPor(null);
            c.setDataHoraAvaliacao(null);
        } else {
            c.setDataHoraAvaliacao(LocalDateTime.now());
            usuarioRepository.findByLogin(loginAtual()).ifPresent(c::setAvaliadoPor);
        }

        ChecklistCarga salvo = repository.save(c);
        auditService.log("CHECKLIST_" + status.name(), "ChecklistCarga", salvo.getId(),
                "entrada=" + entradaId + " senha=" + entrada.getSenhaDiaria());
        return salvo;
    }

    private static String loginAtual() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }
}

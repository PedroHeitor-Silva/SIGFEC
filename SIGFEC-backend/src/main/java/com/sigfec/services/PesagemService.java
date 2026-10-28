package com.sigfec.services;

import com.sigfec.domain.dto.PesagemResponseDTO;
import com.sigfec.domain.entities.EntradaFila;
import com.sigfec.domain.entities.Parceiro;
import com.sigfec.domain.entities.Pesagem;
import com.sigfec.domain.enums.EnumTipoParceiro;
import com.sigfec.repositories.AnaliseLaboratorioRepository;
import com.sigfec.repositories.EntradaFilaRepository;
import com.sigfec.repositories.ParceiroRepository;
import com.sigfec.repositories.PesagemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PesagemService {

    private static final BigDecimal CEM = new BigDecimal("100");

    private final PesagemRepository repository;
    private final FilaService filaService;
    private final EntradaFilaRepository entradaFilaRepository;
    private final AnaliseLaboratorioRepository analiseRepository;
    private final ParceiroRepository parceiroRepository;

    public List<PesagemResponseDTO> listarTodos() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    /** Pesagens ainda não consumidas por nenhum lote — base p/ criação de lote. */
    public List<PesagemResponseDTO> listarDisponiveis() {
        return repository.findByConsumidaFalse().stream().map(this::toDto).toList();
    }

    public Optional<Pesagem> buscarPorId(Long id) {
        return repository.findById(id);
    }

    /**
     * Registra uma nova pesagem. Com {@code entradaFilaId}, a pesagem é da fila: o veículo/produtor
     * vêm da senha, e a entrada é finalizada na mesma transação (tudo ou nada).
     */
    @Transactional
    public Pesagem salvar(Pesagem pesagem, Long entradaFilaId) {
        // Sempre inclusão: campos de sistema nunca vêm do cliente.
        pesagem.setId(null);
        pesagem.setConsumida(false);
        pesagem.setValorTotal(null);   // preenchido pela análise laboratorial
        pesagem.setGramasAmido(null);  // idem
        if (pesagem.getDataHoraEntrada() == null) pesagem.setDataHoraEntrada(LocalDateTime.now());

        EntradaFila entrada = entradaFilaId != null ? filaService.prepararPesagem(entradaFilaId, pesagem) : null;
        validar(pesagem);

        Pesagem salva = repository.save(pesagem);
        if (entrada != null) filaService.finalizarComPesagem(entrada, salva);
        return salva;
    }

    /** Exclusão só para pesagem sem vínculos: consumida por lote, com laudo ou vinda da fila fica bloqueada. */
    @Transactional
    public void deletar(Long id) {
        Pesagem p = repository.findById(id)
                .orElseThrow(() -> RegraNegocioException.naoEncontrada("Pesagem " + id + " não encontrada."));
        if (p.isConsumida()) {
            throw RegraNegocioException.conflito("Pesagem já consumida por um lote de produção: não pode ser excluída.");
        }
        if (analiseRepository.existsByPesagemId(id)) {
            throw RegraNegocioException.conflito("Pesagem já tem análise laboratorial: não pode ser excluída.");
        }
        if (entradaFilaRepository.existsByPesagemId(id)) {
            throw RegraNegocioException.conflito("Pesagem vinculada a uma senha da fila: não pode ser excluída.");
        }
        repository.delete(p);
    }

    private void validar(Pesagem p) {
        if (p.getProdutor() == null || p.getProdutor().getId() == null) {
            throw RegraNegocioException.invalida("Produtor é obrigatório.");
        }
        Parceiro produtor = parceiroRepository.findById(p.getProdutor().getId())
                .orElseThrow(() -> RegraNegocioException.naoEncontrada("Produtor não encontrado."));
        if (produtor.getTipoParceiro() != EnumTipoParceiro.PRODUTOR) {
            throw RegraNegocioException.invalida(produtor.getNome() + " não é um produtor rural (cadastro como "
                    + produtor.getTipoParceiro().name().toLowerCase() + ").");
        }
        p.setProdutor(produtor);
        BigDecimal bruto = p.getPesoBruto();
        BigDecimal tara = p.getPesoTara() == null ? BigDecimal.ZERO : p.getPesoTara();
        if (bruto == null || bruto.signum() <= 0) throw RegraNegocioException.invalida("Informe o peso bruto.");
        if (tara.signum() < 0) throw RegraNegocioException.invalida("A tara não pode ser negativa.");
        if (bruto.compareTo(tara) <= 0) throw RegraNegocioException.invalida("O peso bruto deve ser maior que a tara.");
        p.setPesoTara(tara);
        BigDecimal imp = p.getPercentualImpureza() == null ? BigDecimal.ZERO : p.getPercentualImpureza();
        if (imp.signum() < 0 || imp.compareTo(CEM) > 0) {
            throw RegraNegocioException.invalida("A impureza deve estar entre 0% e 100%.");
        }
        p.setPercentualImpureza(imp);
    }

    private PesagemResponseDTO toDto(Pesagem p) {
        return new PesagemResponseDTO(
            p.getId(),
            p.getDataHoraEntrada(),
            p.getProdutor() != null ? p.getProdutor().getNome() : null,
            p.getProduto() != null ? p.getProduto().getNome() : null,
            p.getVeiculo() != null ? p.getVeiculo().getPlaca() : null,
            p.getPesoBruto(),
            p.getPesoTara(),
            p.getPesoLiquido(),
            p.getPercentualImpureza(),
            p.getPesoFinal(),
            p.getGramasAmido(),
            p.getValorTotal(),
            p.isConsumida()
        );
    }
}

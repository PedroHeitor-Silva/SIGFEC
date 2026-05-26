package com.sigfec.services;

import com.sigfec.domain.dto.PesagemResponseDTO;
import com.sigfec.domain.entities.Pesagem;
import com.sigfec.repositories.PesagemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PesagemService {

    private final PesagemRepository repository;

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

    public Pesagem salvar(Pesagem pesagem) {
        if (pesagem.getDataHoraEntrada() == null) {
            pesagem.setDataHoraEntrada(LocalDateTime.now());
        }
        return repository.save(pesagem);
    }

    public void deletar(Long id) {
        repository.deleteById(id);
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

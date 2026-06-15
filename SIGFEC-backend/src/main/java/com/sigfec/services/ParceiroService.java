package com.sigfec.services;

import com.sigfec.domain.dto.ParceiroResumoDTO;
import com.sigfec.domain.entities.Parceiro;
import com.sigfec.repositories.ParceiroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ParceiroService {

    private final ParceiroRepository repository;

    public List<Parceiro> listarTodos() {
        return repository.findAll();
    }

    public List<ParceiroResumoDTO> listarResumo() {
        return repository.findResumo();
    }

    public Optional<Parceiro> buscarPorId(Long id) {
        return repository.findById(id);
    }

    public Parceiro salvar(Parceiro parceiro) {
        return repository.save(parceiro);
    }

    @Transactional
    public Parceiro atualizar(Long id, Parceiro parceiroAtualizado) {
        return repository.findById(id).map(parceiro -> {
            parceiro.setNome(parceiroAtualizado.getNome());
            parceiro.setDocumento(parceiroAtualizado.getDocumento());
            parceiro.setEmail(parceiroAtualizado.getEmail());
            parceiro.setTelefone(parceiroAtualizado.getTelefone());
            parceiro.setEndereco(parceiroAtualizado.getEndereco());
            parceiro.setTipoParceiro(parceiroAtualizado.getTipoParceiro());
            parceiro.setInscricaoEstadual(parceiroAtualizado.getInscricaoEstadual());
            parceiro.setRg(parceiroAtualizado.getRg());
            parceiro.setLimiteCredito(parceiroAtualizado.getLimiteCredito());
            return repository.save(parceiro);
        }).orElseThrow(() -> new RuntimeException("Parceiro não encontrado"));
    }

    public void deletar(Long id) {
        repository.deleteById(id);
    }
}

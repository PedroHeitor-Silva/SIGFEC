package com.sigfec.services;

import com.sigfec.domain.entities.AnaliseLaboratorio;
import com.sigfec.domain.entities.Amostra;
import com.sigfec.domain.entities.Pesagem;
import com.sigfec.domain.entities.TabelaPreco;
import com.sigfec.repositories.AnaliseLaboratorioRepository;
import com.sigfec.repositories.PesagemRepository;
import com.sigfec.repositories.TabelaPrecoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AnaliseLaboratorioService {

    private final AnaliseLaboratorioRepository repository;
    private final PesagemRepository pesagemRepository;
    private final TabelaPrecoRepository tabelaPrecoRepository;

    public List<AnaliseLaboratorio> listar() {
        return repository.findAll();
    }

    public Optional<AnaliseLaboratorio> buscarPorId(Long id) {
        return repository.findById(id);
    }

    /**
     * Registra análise de uma pesagem. Vincula amostras, calcula renda média
     * e atualiza o valor a pagar ao produtor na pesagem.
     */
    public AnaliseLaboratorio realizarAnalise(Long pesagemId, AnaliseLaboratorio analise) {
        Pesagem pesagem = pesagemRepository.findById(pesagemId)
                .orElseThrow(() -> new RuntimeException("Pesagem não encontrada"));

        analise.setPesagem(pesagem);

        // Vincula bidirecionalmente cada amostra à análise
        if (analise.getAmostras() != null) {
            int num = 1;
            for (Amostra a : analise.getAmostras()) {
                a.setAnalise(analise);
                if (a.getNumeroAmostra() == null) a.setNumeroAmostra(num++);
            }
        }
        analise.recalcular();

        AnaliseLaboratorio salva = repository.save(analise);

        // Calcula pagamento ao produtor: peso(t) × renda(g) × preço/grama vigente
        atualizarPagamentoPesagem(pesagem, salva);

        return salva;
    }

    private void atualizarPagamentoPesagem(Pesagem pesagem, AnaliseLaboratorio analise) {
        if (analise.getRendaMedia() == null || pesagem.getPesoLiquido() == null) return;

        BigDecimal toneladas = pesagem.getPesoLiquido()
                .divide(new BigDecimal("1000"), 4, RoundingMode.HALF_UP);

        // Preço por grama-renda: tabela vigente do produto, ou fallback do produto
        BigDecimal precoGrama = BigDecimal.ZERO;
        if (pesagem.getProduto() != null) {
            precoGrama = tabelaPrecoRepository
                    .findVigente(pesagem.getProduto().getId(), LocalDate.now())
                    .map(TabelaPreco::getValor)
                    .orElseGet(() -> pesagem.getProduto().getPrecoBase() != null
                            ? pesagem.getProduto().getPrecoBase() : BigDecimal.ZERO);
        }

        BigDecimal valor = toneladas
                .multiply(analise.getRendaMedia())
                .multiply(precoGrama)
                .setScale(2, RoundingMode.HALF_UP);

        pesagem.setGramasAmido(analise.getRendaMedia());
        pesagem.setValorTotal(valor);
        pesagemRepository.save(pesagem);
    }
}

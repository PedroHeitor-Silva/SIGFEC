package com.sigfec.services;

import com.sigfec.domain.entities.Estoque;
import com.sigfec.domain.entities.LoteProducao;
import com.sigfec.domain.entities.Pesagem;
import com.sigfec.domain.enums.EnumStatusLote;
import com.sigfec.repositories.EstoqueRepository;
import com.sigfec.repositories.LoteProducaoRepository;
import com.sigfec.repositories.PesagemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Regras de negócio dos lotes de produção:
 *  - Cria lote travando as pesagens consumidas (não podem ser reutilizadas).
 *  - Transições de status válidas e seus efeitos no estoque.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoteProducaoService {

    private final LoteProducaoRepository loteRepository;
    private final PesagemRepository pesagemRepository;
    private final EstoqueRepository estoqueRepository;

    public List<LoteProducao> listar() {
        return loteRepository.findAll();
    }

    public LoteProducao buscar(Long id) {
        return loteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lote não encontrado."));
    }

    /** Cria lote, gera código se faltar e marca as pesagens informadas como consumidas. */
    @Transactional
    public LoteProducao criar(LoteProducao lote) {
        if (lote.getCodigoLote() == null || lote.getCodigoLote().isBlank()) {
            long seq = loteRepository.count() + 1;
            lote.setCodigoLote(String.format("LOT-%d-%05d", LocalDate.now().getYear(), seq));
        }
        if (lote.getStatusLote() == null) lote.setStatusLote(EnumStatusLote.EM_PRODUCAO);

        Set<Pesagem> hidratadas = new HashSet<>();
        if (lote.getPesagensConsumidas() != null) {
            for (Pesagem stub : lote.getPesagensConsumidas()) {
                if (stub.getId() == null) continue;
                Pesagem p = pesagemRepository.findById(stub.getId())
                        .orElseThrow(() -> new RuntimeException("Pesagem #" + stub.getId() + " não encontrada."));
                if (p.isConsumida()) {
                    throw new RuntimeException("Pesagem #" + p.getId()
                            + " já foi consumida por outro lote.");
                }
                p.setConsumida(true);
                pesagemRepository.save(p);
                hidratadas.add(p);
            }
        }
        lote.setPesagensConsumidas(hidratadas);
        return loteRepository.save(lote);
    }

    /**
     * Transições permitidas:
     *  EM_PRODUCAO → FINALIZADO  (entra no estoque)
     *  EM_PRODUCAO → CANCELADO   (libera pesagens)
     *  FINALIZADO  → EXPEDIDO    (saída p/ cliente — sem mexer estoque aqui)
     *  EXPEDIDO    → (terminal)
     *  CANCELADO   → (terminal)
     */
    @Transactional
    public LoteProducao mudarStatus(Long id, EnumStatusLote novo) {
        LoteProducao lote = buscar(id);
        EnumStatusLote atual = lote.getStatusLote();
        if (atual == novo) return lote;

        validarTransicao(atual, novo);

        // Efeitos colaterais
        if (atual == EnumStatusLote.EM_PRODUCAO && novo == EnumStatusLote.FINALIZADO) {
            entrarEstoque(lote);
        }
        if (atual == EnumStatusLote.EM_PRODUCAO && novo == EnumStatusLote.CANCELADO) {
            liberarPesagens(lote);
        }

        lote.setStatusLote(novo);
        return loteRepository.save(lote);
    }

    @Transactional
    public void deletar(Long id) {
        LoteProducao lote = buscar(id);
        if (lote.getStatusLote() == EnumStatusLote.FINALIZADO
                || lote.getStatusLote() == EnumStatusLote.EXPEDIDO) {
            throw new RuntimeException(
                    "Não é possível excluir lote já FINALIZADO/EXPEDIDO — cancele antes (libera pesagens).");
        }
        liberarPesagens(lote);
        loteRepository.deleteById(id);
    }

    // ===== Internos =====

    private void validarTransicao(EnumStatusLote atual, EnumStatusLote novo) {
        boolean ok = switch (atual) {
            case EM_PRODUCAO -> novo == EnumStatusLote.FINALIZADO || novo == EnumStatusLote.CANCELADO;
            case FINALIZADO  -> novo == EnumStatusLote.EXPEDIDO;
            case EXPEDIDO, CANCELADO -> false;
        };
        if (!ok) {
            throw new RuntimeException("Transição de status inválida: " + atual + " → " + novo);
        }
    }

    /** Soma a quantidade produzida no estoque do produto (cria estoque se não houver). */
    private void entrarEstoque(LoteProducao lote) {
        if (lote.getProduto() == null) {
            throw new RuntimeException("Lote sem produto vinculado — não dá pra entrar no estoque.");
        }
        if (lote.getQuantidadeProduzida() == null
                || lote.getQuantidadeProduzida().doubleValue() <= 0) {
            throw new RuntimeException("Quantidade produzida do lote é inválida.");
        }
        double qtd = lote.getQuantidadeProduzida().doubleValue();
        Estoque estoque = estoqueRepository.findByProduto_Id(lote.getProduto().getId())
                .orElseGet(() -> {
                    Estoque novo = new Estoque();
                    novo.setProduto(lote.getProduto());
                    novo.setQuantidadeAtual(0.0);
                    novo.setQuantidadeMinima(0.0);
                    return novo;
                });
        double atual = estoque.getQuantidadeAtual() != null ? estoque.getQuantidadeAtual() : 0.0;
        estoque.setQuantidadeAtual(atual + qtd);
        estoqueRepository.save(estoque);
        log.info("Lote #{} finalizado — +{} no estoque do produto #{}",
                lote.getId(), qtd, lote.getProduto().getId());
    }

    /** Marca as pesagens vinculadas ao lote como disponíveis novamente. */
    private void liberarPesagens(LoteProducao lote) {
        if (lote.getPesagensConsumidas() == null) return;
        for (Pesagem p : lote.getPesagensConsumidas()) {
            p.setConsumida(false);
            pesagemRepository.save(p);
        }
    }
}

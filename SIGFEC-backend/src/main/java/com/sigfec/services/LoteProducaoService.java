package com.sigfec.services;

import com.sigfec.domain.entities.Estoque;
import com.sigfec.domain.entities.LoteProducao;
import com.sigfec.domain.entities.Pesagem;
import com.sigfec.domain.enums.EnumStatusLote;
import com.sigfec.domain.enums.EnumStatusQualidade;
import com.sigfec.repositories.AnaliseLaboratorioRepository;
import com.sigfec.repositories.EstoqueRepository;
import com.sigfec.repositories.LoteProducaoRepository;
import com.sigfec.repositories.PesagemRepository;
import com.sigfec.repositories.ProdutoRepository;
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
    private final ProdutoRepository produtoRepository;
    private final AnaliseLaboratorioRepository analiseRepository;
    private final EstoqueRepository estoqueRepository;
    private final MovimentacaoEstoqueService movEstoqueService;
    private final AuditService auditService;

    public List<LoteProducao> listar() {
        return loteRepository.findAll();
    }

    public LoteProducao buscar(Long id) {
        return loteRepository.findById(id)
                .orElseThrow(() -> RegraNegocioException.naoEncontrada("Lote não encontrado."));
    }

    /** Cria lote, gera código se faltar e marca as pesagens informadas como consumidas. */
    @Transactional
    public LoteProducao criar(LoteProducao lote) {
        // Todo lote nasce EM_PRODUCAO: aceitar FINALIZADO aqui pularia a entrada no estoque.
        lote.setId(null);
        lote.setStatusLote(EnumStatusLote.EM_PRODUCAO);
        // Produto completo (unidade de medida): sem isso o rendimento trata sacos como kg.
        if (lote.getProduto() == null || lote.getProduto().getId() == null) {
            throw RegraNegocioException.invalida("Informe o produto do lote.");
        }
        lote.setProduto(produtoRepository.findById(lote.getProduto().getId())
                .orElseThrow(() -> RegraNegocioException.naoEncontrada("Produto #" + lote.getProduto().getId() + " não encontrado.")));
        if (lote.getCodigoLote() == null || lote.getCodigoLote().isBlank()) {
            // count()+1 colide depois de uma exclusão; avança até achar um código livre.
            long seq = loteRepository.count() + 1;
            String codigo;
            do {
                codigo = String.format("LOT-%d-%05d", LocalDate.now().getYear(), seq++);
            } while (loteRepository.findByCodigoLote(codigo).isPresent());
            lote.setCodigoLote(codigo);
        } else if (loteRepository.findByCodigoLote(lote.getCodigoLote().trim()).isPresent()) {
            throw RegraNegocioException.conflito("Já existe um lote com o código " + lote.getCodigoLote().trim() + ".");
        }

        Set<Pesagem> hidratadas = new HashSet<>();
        if (lote.getPesagensConsumidas() != null) {
            for (Pesagem stub : lote.getPesagensConsumidas()) {
                if (stub.getId() == null) continue;
                Pesagem p = pesagemRepository.findById(stub.getId())
                        .orElseThrow(() -> RegraNegocioException.naoEncontrada("Pesagem #" + stub.getId() + " não encontrada."));
                var laudo = analiseRepository.findByPesagemId(p.getId()).orElseThrow(() -> RegraNegocioException.conflito(
                        "Pesagem #" + p.getId() + " ainda não tem laudo do laboratório."));
                if (laudo.getStatusQualidade() == EnumStatusQualidade.REPROVADO) {
                    throw RegraNegocioException.conflito("Pesagem #" + p.getId() + " foi reprovada no laboratório e não pode ir para a produção.");
                }
                if (p.isConsumida()) {
                    throw RegraNegocioException.conflito("Pesagem #" + p.getId()
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
        LoteProducao salvo = loteRepository.save(lote);
        auditService.log("LOTE_" + novo.name(), "LoteProducao", lote.getId(),
                "transição " + atual + "→" + novo + " (" + lote.getCodigoLote() + ")");
        return salvo;
    }

    @Transactional
    public void deletar(Long id) {
        LoteProducao lote = buscar(id);
        if (lote.getStatusLote() == EnumStatusLote.FINALIZADO
                || lote.getStatusLote() == EnumStatusLote.EXPEDIDO) {
            throw RegraNegocioException.conflito(
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
            throw RegraNegocioException.conflito("Transição de status inválida: " + atual + " → " + novo);
        }
    }

    /** Soma a quantidade produzida no estoque via Kardex (cria estoque se não houver). */
    private void entrarEstoque(LoteProducao lote) {
        if (lote.getProduto() == null) {
            throw RegraNegocioException.invalida("Lote sem produto vinculado — não dá pra entrar no estoque.");
        }
        if (lote.getQuantidadeProduzida() == null
                || lote.getQuantidadeProduzida().doubleValue() <= 0) {
            throw RegraNegocioException.invalida("Quantidade produzida do lote é inválida.");
        }
        double qtd = lote.getQuantidadeProduzida().doubleValue();
        movEstoqueService.aplicar(
                lote.getProduto(),
                com.sigfec.domain.enums.EnumTipoMovEstoque.ENTRADA_PRODUCAO,
                qtd,
                "Lote " + lote.getCodigoLote(),
                "LOTE",
                lote.getId()
        );
        log.info("Lote #{} finalizado — +{} no estoque (Kardex) do produto #{}",
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

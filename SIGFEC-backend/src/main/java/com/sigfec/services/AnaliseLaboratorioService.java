package com.sigfec.services;

import com.sigfec.domain.entities.AnaliseLaboratorio;
import com.sigfec.domain.entities.Amostra;
import com.sigfec.domain.entities.ContaPagar;
import com.sigfec.domain.entities.Pesagem;
import com.sigfec.domain.entities.TabelaPreco;
import com.sigfec.domain.enums.EnumStatusQualidade;
import com.sigfec.repositories.AnaliseLaboratorioRepository;
import com.sigfec.repositories.ContaPagarRepository;
import com.sigfec.repositories.PesagemRepository;
import com.sigfec.repositories.TabelaPrecoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final ContaPagarRepository contaPagarRepository;
    private final AuditService auditService;

    /** Prazo (dias) para pagar o produtor depois do laudo. */
    @Value("${sigfec.pagamento-produtor.prazo-dias:7}")
    private int prazoPagamentoDias = 7;

    /** Quando presente, o prazo vem de Configurações (o @Value acima fica como padrão). */
    private ConfiguracaoService configuracao;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setConfiguracao(ConfiguracaoService configuracao) {
        this.configuracao = configuracao;
    }

    public List<AnaliseLaboratorio> listar() {
        return repository.findAll();
    }

    public Optional<AnaliseLaboratorio> buscarPorId(Long id) {
        return repository.findById(id);
    }

    /**
     * Registra a análise de uma pesagem (uma por pesagem). Vincula as amostras, calcula a renda média,
     * o valor a pagar ao produtor e gera a conta a pagar dele no financeiro — tudo na mesma transação.
     */
    @Transactional
    public AnaliseLaboratorio realizarAnalise(Long pesagemId, AnaliseLaboratorio analise) {
        Pesagem pesagem = pesagemRepository.findById(pesagemId)
                .orElseThrow(() -> RegraNegocioException.naoEncontrada("Pesagem #" + pesagemId + " não encontrada."));
        if (repository.existsByPesagemId(pesagemId)) {
            throw RegraNegocioException.conflito("A pesagem #" + pesagemId + " já tem análise laboratorial.");
        }
        if (analise.getAmostras() == null || analise.getAmostras().stream()
                .noneMatch(a -> a.getRendaGramas() != null && a.getRendaGramas().signum() > 0)) {
            throw RegraNegocioException.invalida("Informe a renda de pelo menos uma amostra.");
        }

        analise.setId(null);
        analise.setPesagem(pesagem);

        // Vincula bidirecionalmente cada amostra à análise
        int num = 1;
        for (Amostra a : analise.getAmostras()) {
            a.setAnalise(analise);
            if (a.getNumeroAmostra() == null) a.setNumeroAmostra(num++);
        }
        analise.recalcular();

        AnaliseLaboratorio salva = repository.save(analise);

        // Calcula pagamento ao produtor: peso final(t) × renda(g) × preço/grama vigente
        BigDecimal valor = atualizarPagamentoPesagem(pesagem, salva);
        gerarContaPagarProdutor(pesagem, salva, valor);

        return salva;
    }

    /** Valor a pagar sobre o peso FINAL (já com o desconto de impureza). */
    private BigDecimal atualizarPagamentoPesagem(Pesagem pesagem, AnaliseLaboratorio analise) {
        BigDecimal peso = pesagem.getPesoFinal() != null ? pesagem.getPesoFinal() : pesagem.getPesoLiquido();
        if (analise.getRendaMedia() == null || peso == null) return BigDecimal.ZERO;

        BigDecimal toneladas = peso.divide(new BigDecimal("1000"), 4, RoundingMode.HALF_UP);

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
        return valor;
    }

    /** Carga aprovada (com ou sem desconto) gera o título a pagar ao produtor; reprovada não gera. */
    private void gerarContaPagarProdutor(Pesagem pesagem, AnaliseLaboratorio analise, BigDecimal valor) {
        if (analise.getStatusQualidade() == EnumStatusQualidade.REPROVADO) return;
        if (valor == null || valor.signum() <= 0 || pesagem.getProdutor() == null) return;

        ContaPagar conta = new ContaPagar();
        conta.setFornecedor(pesagem.getProdutor());
        conta.setValorOriginal(valor);
        conta.setDataEmissao(LocalDate.now());
        conta.setDataVencimento(LocalDate.now().plusDays(configuracao != null ? configuracao.inteiro(ConfiguracaoService.PRODUTOR_PRAZO) : prazoPagamentoDias));
        conta.setDescricao(descricaoPagamento(pesagem.getId()));
        contaPagarRepository.save(conta);
        auditService.log("PAGAMENTO_PRODUTOR_GERADO", "Pesagem", pesagem.getId(),
                "valor=" + valor + " produtor=" + pesagem.getProdutor().getNome());
    }

    public static String descricaoPagamento(Long pesagemId) {
        return "Pagamento ao produtor - pesagem #" + pesagemId;
    }
}

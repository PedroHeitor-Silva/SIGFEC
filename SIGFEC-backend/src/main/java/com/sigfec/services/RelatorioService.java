package com.sigfec.services;

import com.sigfec.domain.dto.RelatorioDTO;
import com.sigfec.domain.dto.RelatorioDTO.Coluna;
import com.sigfec.domain.dto.RelatorioDTO.Indicador;
import com.sigfec.domain.dto.RelatorioDTO.Info;
import com.sigfec.domain.entities.*;
import com.sigfec.domain.enums.*;
import com.sigfec.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Relatórios gerenciais de todos os módulos, no formato tabular do {@link RelatorioDTO}.
 * Todos aceitam período (início/fim) e, quando faz sentido, um parceiro (produtor ou cliente).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RelatorioService {

    /** Catálogo na ordem do fluxo da fecularia: pátio → balança → laboratório → produção → estoque → vendas → financeiro. */
    public static final List<Info> CATALOGO = List.of(
            new Info("fila", "Fila do pátio", "Senhas por dia, tempos de espera e cancelamentos", "fila", true),
            new Info("recebimento", "Recebimento de mandioca", "Pesagens: bruto, tara, impureza e peso final", "pesagem", true),
            new Info("qualidade", "Qualidade (laboratório)", "Laudos: renda média, umidade, pH e classificação", "laboratorio", true),
            new Info("pagamento-produtores", "Pagamento a produtores", "Valor por produtor: peso final × renda × preço", "financeiro", true),
            new Info("producao", "Produção (lotes)", "Lotes por status, quantidade produzida e rendimento", "lotes", false),
            new Info("estoque", "Posição de estoque", "Saldo atual por produto e alerta de estoque mínimo", "estoque", false),
            new Info("kardex", "Movimentações de estoque (Kardex)", "Entradas, saídas e ajustes com saldo após cada movimento", "estoque", false),
            new Info("vendas", "Vendas", "Vendas por cliente e situação, com total faturado", "vendas", true),
            new Info("financeiro", "Contas a pagar e a receber", "Títulos por vencimento, valores pagos e saldo", "financeiro", true)
    );

    private static final Set<EnumTipoMovEstoque> SAIDAS =
            EnumSet.of(EnumTipoMovEstoque.SAIDA_VENDA, EnumTipoMovEstoque.AJUSTE_SAIDA, EnumTipoMovEstoque.PERDA);

    private final EntradaFilaRepository filaRepo;
    private final PesagemRepository pesagemRepo;
    private final AnaliseLaboratorioRepository analiseRepo;
    private final ContaPagarRepository contaPagarRepo;
    private final LoteProducaoRepository loteRepo;
    private final EstoqueRepository estoqueRepo;
    private final MovimentacaoEstoqueRepository movRepo;
    private final VendaRepository vendaRepo;
    private final FinanceiroRepository tituloRepo;

    public Optional<Info> info(String chave) {
        return CATALOGO.stream().filter(i -> i.chave().equals(chave)).findFirst();
    }

    public RelatorioDTO gerar(String chave, LocalDate inicio, LocalDate fim, Long parceiroId) {
        Info info = info(chave).orElseThrow(() -> RegraNegocioException.naoEncontrada("Relatório '" + chave + "' não existe."));
        if (inicio != null && fim != null && inicio.isAfter(fim)) {
            throw RegraNegocioException.invalida("A data inicial deve ser anterior à final.");
        }
        Periodo p = new Periodo(inicio, fim);
        return switch (chave) {
            case "fila" -> fila(info, p, parceiroId);
            case "recebimento" -> recebimento(info, p, parceiroId);
            case "qualidade" -> qualidade(info, p, parceiroId);
            case "pagamento-produtores" -> pagamentoProdutores(info, p, parceiroId);
            case "producao" -> producao(info, p);
            case "estoque" -> estoque(info);
            case "kardex" -> kardex(info, p);
            case "vendas" -> vendas(info, p, parceiroId);
            case "financeiro" -> financeiro(info, p, parceiroId);
            default -> throw RegraNegocioException.naoEncontrada("Relatório '" + chave + "' não existe.");
        };
    }

    // ===================== Relatórios =====================

    private RelatorioDTO fila(Info info, Periodo p, Long parceiroId) {
        List<EntradaFila> lista = filaRepo.findAll().stream()
                .filter(e -> p.contem(e.getDataReferencia()))
                .filter(e -> mesmoParceiro(e.getProdutor(), parceiroId))
                .sorted(Comparator.comparing(EntradaFila::getDataReferencia, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(EntradaFila::getSenhaDiaria, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        List<Map<String, Object>> linhas = new ArrayList<>();
        List<Long> esperas = new ArrayList<>();
        for (EntradaFila e : lista) {
            Long espera = minutos(e.getDataHoraEntrada(), e.getDataHoraChamada());
            if (espera != null) esperas.add(espera);
            linhas.add(linha(
                    "data", e.getDataReferencia(),
                    "senha", e.getSenhaDiaria() != null ? String.format("#%03d", e.getSenhaDiaria()) : null,
                    "placa", e.getVeiculo() != null ? e.getVeiculo().getPlaca() : null,
                    "motorista", nome(e.getMotorista()),
                    "produtor", nome(e.getProdutor()),
                    "status", rotulo(e.getStatus()),
                    "local", e.getLocalChamada(),
                    "chegada", e.getDataHoraEntrada(),
                    "chamada", e.getDataHoraChamada(),
                    "espera", espera,
                    "observacao", e.getObservacao()));
        }
        long finalizadas = lista.stream().filter(e -> e.getStatus() == EnumStatusEntrada.FINALIZADO).count();
        long canceladas = lista.stream().filter(e -> e.getStatus() == EnumStatusEntrada.CANCELADO).count();
        double esperaMedia = esperas.stream().mapToLong(Long::longValue).average().orElse(0);

        return new RelatorioDTO(info.chave(), info.titulo(), info.descricao(),
                List.of(col("data", "Data", "data"), col("senha", "Senha", "texto"), col("placa", "Placa", "texto"),
                        col("motorista", "Motorista", "texto"), col("produtor", "Produtor", "texto"),
                        col("status", "Situação", "texto"), col("local", "Local", "texto"),
                        col("chegada", "Chegada", "datahora"), col("chamada", "Chamada", "datahora"),
                        col("espera", "Espera (min)", "numero"), col("observacao", "Observação", "texto")),
                linhas,
                linha("data", "Total", "senha", lista.size() + " senhas"),
                List.of(ind("Senhas emitidas", lista.size(), "numero"),
                        ind("Finalizadas (pesadas)", finalizadas, "numero"),
                        ind("Canceladas", canceladas, "numero"),
                        ind("Espera média até a chamada (min)", Math.round(esperaMedia), "numero")));
    }

    private RelatorioDTO recebimento(Info info, Periodo p, Long parceiroId) {
        List<Pesagem> lista = pesagensDoPeriodo(p, parceiroId);
        List<Map<String, Object>> linhas = lista.stream().map(x -> linha(
                "data", x.getDataHoraEntrada(),
                "id", x.getId(),
                "produtor", nome(x.getProdutor()),
                "placa", x.getVeiculo() != null ? x.getVeiculo().getPlaca() : null,
                "produto", x.getProduto() != null ? x.getProduto().getNome() : null,
                "bruto", x.getPesoBruto(),
                "tara", x.getPesoTara(),
                "liquido", x.getPesoLiquido(),
                "impureza", x.getPercentualImpureza(),
                "final", x.getPesoFinal())).toList();

        BigDecimal liquido = soma(lista, Pesagem::getPesoLiquido);
        BigDecimal pesoFinal = soma(lista, Pesagem::getPesoFinal);
        return new RelatorioDTO(info.chave(), info.titulo(), info.descricao(),
                List.of(col("data", "Data/hora", "datahora"), col("id", "Pesagem", "numero"), col("produtor", "Produtor", "texto"),
                        col("placa", "Placa", "texto"), col("produto", "Produto", "texto"), col("bruto", "Bruto", "peso"),
                        col("tara", "Tara", "peso"), col("liquido", "Líquido", "peso"),
                        col("impureza", "Impureza", "percentual"), col("final", "Peso final", "peso")),
                linhas,
                linha("data", "Total", "bruto", soma(lista, Pesagem::getPesoBruto), "tara", soma(lista, Pesagem::getPesoTara),
                        "liquido", liquido, "final", pesoFinal),
                List.of(ind("Cargas recebidas", lista.size(), "numero"),
                        ind("Peso líquido", liquido, "peso"),
                        ind("Peso final (pago)", pesoFinal, "peso"),
                        ind("Desconto de impureza", liquido.subtract(pesoFinal), "peso")));
    }

    private RelatorioDTO qualidade(Info info, Periodo p, Long parceiroId) {
        List<AnaliseLaboratorio> lista = analiseRepo.findAll().stream()
                .filter(a -> p.contem(a.getDataCriacao()))
                .filter(a -> a.getPesagem() != null && mesmoParceiro(a.getPesagem().getProdutor(), parceiroId))
                .sorted(Comparator.comparing(AnaliseLaboratorio::getDataCriacao, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        List<Map<String, Object>> linhas = lista.stream().map(a -> linha(
                "data", a.getDataCriacao(),
                "pesagem", a.getPesagem().getId(),
                "produtor", nome(a.getPesagem().getProdutor()),
                "amostras", a.getAmostras() != null ? a.getAmostras().size() : 0,
                "renda", a.getRendaMedia(),
                "umidade", a.getUmidade(),
                "ph", a.getPh(),
                "acidez", a.getAcidez(),
                "status", rotulo(a.getStatusQualidade()))).toList();

        Map<EnumStatusQualidade, Long> porStatus = lista.stream()
                .filter(a -> a.getStatusQualidade() != null)
                .collect(Collectors.groupingBy(AnaliseLaboratorio::getStatusQualidade, Collectors.counting()));
        BigDecimal rendaMedia = media(lista.stream().map(AnaliseLaboratorio::getRendaMedia).toList());
        return new RelatorioDTO(info.chave(), info.titulo(), info.descricao(),
                List.of(col("data", "Data", "datahora"), col("pesagem", "Pesagem", "numero"), col("produtor", "Produtor", "texto"),
                        col("amostras", "Amostras", "numero"), col("renda", "Renda média (g)", "numero"),
                        col("umidade", "Umidade", "percentual"), col("ph", "pH", "numero"),
                        col("acidez", "Acidez", "numero"), col("status", "Classificação", "texto")),
                linhas,
                linha("data", "Média", "renda", rendaMedia),
                List.of(ind("Laudos emitidos", lista.size(), "numero"),
                        ind("Renda média (g)", rendaMedia, "numero"),
                        ind("Aprovadas", porStatus.getOrDefault(EnumStatusQualidade.APROVADO, 0L), "numero"),
                        ind("Com desconto", porStatus.getOrDefault(EnumStatusQualidade.APROVADO_COM_DESCONTO, 0L), "numero"),
                        ind("Reprovadas", porStatus.getOrDefault(EnumStatusQualidade.REPROVADO, 0L), "numero")));
    }

    private RelatorioDTO pagamentoProdutores(Info info, Periodo p, Long parceiroId) {
        List<Pesagem> pesagens = pesagensDoPeriodo(p, parceiroId).stream()
                .filter(x -> x.getValorTotal() != null && x.getProdutor() != null).toList();

        // Pago/saldo vêm da conta a pagar gerada no laudo de cada pesagem
        Map<String, ContaPagar> contas = contaPagarRepo.findAll().stream()
                .filter(c -> c.getDescricao() != null)
                .collect(Collectors.toMap(ContaPagar::getDescricao, Function.identity(), (a, b) -> a));

        Map<Long, List<Pesagem>> porProdutor = pesagens.stream()
                .collect(Collectors.groupingBy(x -> x.getProdutor().getId(), LinkedHashMap::new, Collectors.toList()));

        List<Map<String, Object>> linhas = new ArrayList<>();
        BigDecimal totalValor = BigDecimal.ZERO, totalPago = BigDecimal.ZERO, totalPeso = BigDecimal.ZERO;
        for (List<Pesagem> grupo : porProdutor.values()) {
            BigDecimal peso = soma(grupo, Pesagem::getPesoFinal);
            BigDecimal valor = soma(grupo, Pesagem::getValorTotal);
            BigDecimal pago = BigDecimal.ZERO;
            for (Pesagem x : grupo) {
                ContaPagar c = contas.get(AnaliseLaboratorioService.descricaoPagamento(x.getId()));
                if (c != null && c.getValorPago() != null) pago = pago.add(c.getValorPago());
            }
            // renda média ponderada pelo peso de cada carga
            BigDecimal pond = BigDecimal.ZERO;
            for (Pesagem x : grupo) {
                if (x.getGramasAmido() != null && x.getPesoFinal() != null) pond = pond.add(x.getGramasAmido().multiply(x.getPesoFinal()));
            }
            BigDecimal renda = peso.signum() > 0 ? pond.divide(peso, 2, RoundingMode.HALF_UP) : null;
            linhas.add(linha(
                    "produtor", nome(grupo.get(0).getProdutor()),
                    "documento", grupo.get(0).getProdutor().getDocumento(),
                    "cargas", grupo.size(),
                    "peso", peso,
                    "renda", renda,
                    "valor", valor,
                    "pago", pago,
                    "saldo", valor.subtract(pago).max(BigDecimal.ZERO)));
            totalValor = totalValor.add(valor);
            totalPago = totalPago.add(pago);
            totalPeso = totalPeso.add(peso);
        }
        linhas.sort(Comparator.comparing(l -> (BigDecimal) l.get("valor"), Comparator.reverseOrder()));
        BigDecimal saldo = totalValor.subtract(totalPago).max(BigDecimal.ZERO);
        return new RelatorioDTO(info.chave(), info.titulo(), info.descricao(),
                List.of(col("produtor", "Produtor", "texto"), col("documento", "CPF/CNPJ", "texto"), col("cargas", "Cargas", "numero"),
                        col("peso", "Peso final", "peso"), col("renda", "Renda média (g)", "numero"),
                        col("valor", "Valor", "moeda"), col("pago", "Pago", "moeda"), col("saldo", "A pagar", "moeda")),
                linhas,
                linha("produtor", "Total", "cargas", pesagens.size(), "peso", totalPeso, "valor", totalValor,
                        "pago", totalPago, "saldo", saldo),
                List.of(ind("Produtores", linhas.size(), "numero"),
                        ind("Valor total", totalValor, "moeda"),
                        ind("Já pago", totalPago, "moeda"),
                        ind("A pagar", saldo, "moeda")));
    }

    private RelatorioDTO producao(Info info, Periodo p) {
        List<LoteProducao> lista = loteRepo.findAll().stream()
                .filter(l -> p.contem(l.getDataFabricacao() != null ? l.getDataFabricacao()
                        : l.getDataCriacao() != null ? l.getDataCriacao().toLocalDate() : null))
                .sorted(Comparator.comparing(LoteProducao::getCodigoLote, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        List<Map<String, Object>> linhas = lista.stream().map(l -> linha(
                "codigo", l.getCodigoLote(),
                "produto", l.getProduto() != null ? l.getProduto().getNome() : null,
                "fabricacao", l.getDataFabricacao(),
                "validade", l.getValidade(),
                "cargas", l.getPesagensConsumidas() != null ? l.getPesagensConsumidas().size() : 0,
                "quantidade", l.getQuantidadeProduzida(),
                "rendimento", l.getRendimentoReal(),
                "custo", l.getCustoTotal(),
                "status", rotulo(l.getStatusLote()))).toList();

        List<LoteProducao> concluidos = lista.stream()
                .filter(l -> l.getStatusLote() == EnumStatusLote.FINALIZADO || l.getStatusLote() == EnumStatusLote.EXPEDIDO).toList();
        BigDecimal produzido = soma(concluidos, LoteProducao::getQuantidadeProduzida);
        return new RelatorioDTO(info.chave(), info.titulo(), info.descricao(),
                List.of(col("codigo", "Lote", "texto"), col("produto", "Produto", "texto"), col("fabricacao", "Fabricação", "data"),
                        col("validade", "Validade", "data"), col("cargas", "Cargas", "numero"),
                        col("quantidade", "Qtd. produzida", "numero"), col("rendimento", "Rendimento", "percentual"),
                        col("custo", "Custo total", "moeda"), col("status", "Situação", "texto")),
                linhas,
                linha("codigo", "Total", "quantidade", soma(lista, LoteProducao::getQuantidadeProduzida),
                        "custo", soma(lista, LoteProducao::getCustoTotal)),
                List.of(ind("Lotes", lista.size(), "numero"),
                        ind("Em produção", lista.stream().filter(l -> l.getStatusLote() == EnumStatusLote.EM_PRODUCAO).count(), "numero"),
                        ind("Concluídos", concluidos.size(), "numero"),
                        ind("Produzido (concluídos)", produzido, "numero")));
    }

    private RelatorioDTO estoque(Info info) {
        List<Estoque> lista = estoqueRepo.findAll().stream()
                .sorted(Comparator.comparing(e -> e.getProduto() != null ? e.getProduto().getNome() : ""))
                .toList();
        long abaixo = 0;
        List<Map<String, Object>> linhas = new ArrayList<>();
        for (Estoque e : lista) {
            double saldo = e.getQuantidadeAtual() != null ? e.getQuantidadeAtual() : 0;
            double minimo = e.getQuantidadeMinima() != null ? e.getQuantidadeMinima() : 0;
            boolean alerta = minimo > 0 && saldo < minimo;
            if (alerta) abaixo++;
            Produto prod = e.getProduto();
            linhas.add(linha(
                    "produto", prod != null ? prod.getNome() : null,
                    "categoria", prod != null ? rotulo(prod.getCategoria()) : null,
                    "unidade", prod != null && prod.getUnidadeMedida() != null ? prod.getUnidadeMedida().name() : null,
                    "saldo", saldo,
                    "minimo", minimo,
                    "situacao", alerta ? "ABAIXO DO MÍNIMO" : "Normal",
                    "atualizacao", e.getUltimaAtualizacao()));
        }
        return new RelatorioDTO(info.chave(), info.titulo(), info.descricao(),
                List.of(col("produto", "Produto", "texto"), col("categoria", "Categoria", "texto"), col("unidade", "Unidade", "texto"),
                        col("saldo", "Saldo atual", "numero"), col("minimo", "Mínimo", "numero"),
                        col("situacao", "Situação", "texto"), col("atualizacao", "Última movimentação", "datahora")),
                linhas,
                linha("produto", lista.size() + " produtos"),
                List.of(ind("Produtos em estoque", lista.size(), "numero"),
                        ind("Abaixo do mínimo", abaixo, "numero")));
    }

    private RelatorioDTO kardex(Info info, Periodo p) {
        List<MovimentacaoEstoque> lista = movRepo.findAll().stream()
                .filter(m -> p.contem(m.getDataHora()))
                .sorted(Comparator.comparing(MovimentacaoEstoque::getDataHora, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        double entradas = 0, saidas = 0;
        List<Map<String, Object>> linhas = new ArrayList<>();
        for (MovimentacaoEstoque m : lista) {
            double q = m.getQuantidade() != null ? m.getQuantidade() : 0;
            boolean saida = SAIDAS.contains(m.getTipo());
            if (saida) saidas += q; else entradas += q;
            linhas.add(linha(
                    "data", m.getDataHora(),
                    "produto", m.getProduto() != null ? m.getProduto().getNome() : null,
                    "tipo", rotulo(m.getTipo()),
                    "quantidade", saida ? -q : q,
                    "saldo", m.getSaldoPos(),
                    "motivo", m.getMotivo(),
                    "usuario", m.getUsuario()));
        }
        return new RelatorioDTO(info.chave(), info.titulo(), info.descricao(),
                List.of(col("data", "Data/hora", "datahora"), col("produto", "Produto", "texto"), col("tipo", "Movimento", "texto"),
                        col("quantidade", "Quantidade", "numero"), col("saldo", "Saldo após", "numero"),
                        col("motivo", "Motivo / origem", "texto"), col("usuario", "Usuário", "texto")),
                linhas,
                linha("data", "Saldo do período", "quantidade", entradas - saidas),
                List.of(ind("Movimentações", lista.size(), "numero"),
                        ind("Entradas", entradas, "numero"),
                        ind("Saídas", saidas, "numero")));
    }

    private RelatorioDTO vendas(Info info, Periodo p, Long parceiroId) {
        List<Venda> lista = vendaRepo.findAll().stream()
                .filter(v -> p.contem(v.getDataVenda() != null ? v.getDataVenda()
                        : v.getDataCriacao() != null ? v.getDataCriacao().toLocalDate() : null))
                .filter(v -> mesmoParceiro(v.getCliente(), parceiroId))
                .sorted(Comparator.comparing(Venda::getId))
                .toList();
        List<Map<String, Object>> linhas = lista.stream().map(v -> linha(
                "id", v.getId(),
                "data", v.getDataVenda(),
                "cliente", nome(v.getCliente()),
                "itens", v.getItens() != null ? v.getItens().size() : 0,
                "total", v.getValorTotal(),
                "status", rotulo(v.getStatusVenda()),
                "nota", v.getNumeroNota())).toList();

        List<Venda> efetivadas = lista.stream()
                .filter(v -> v.getStatusVenda() == EnumStatusVenda.CONFIRMADA || v.getStatusVenda() == EnumStatusVenda.FATURADA).toList();
        BigDecimal vendido = soma(efetivadas, Venda::getValorTotal);
        return new RelatorioDTO(info.chave(), info.titulo(), info.descricao(),
                List.of(col("id", "Venda", "numero"), col("data", "Data", "data"), col("cliente", "Cliente", "texto"),
                        col("itens", "Itens", "numero"), col("total", "Total", "moeda"),
                        col("status", "Situação", "texto"), col("nota", "Nota nº", "numero")),
                linhas,
                linha("id", "Total", "total", soma(lista, Venda::getValorTotal)),
                List.of(ind("Vendas", lista.size(), "numero"),
                        ind("Vendido (confirmadas + faturadas)", vendido, "moeda"),
                        ind("Orçamentos em aberto", lista.stream().filter(v -> v.getStatusVenda() == EnumStatusVenda.ORCAMENTO).count(), "numero"),
                        ind("Canceladas", lista.stream().filter(v -> v.getStatusVenda() == EnumStatusVenda.CANCELADA).count(), "numero")));
    }

    private RelatorioDTO financeiro(Info info, Periodo p, Long parceiroId) {
        List<TituloFinanceiro> lista = tituloRepo.findAll().stream()
                .filter(t -> p.contem(t.getDataVencimento()))
                .filter(t -> mesmoParceiro(parceiroDo(t), parceiroId))
                .sorted(Comparator.comparing(TituloFinanceiro::getDataVencimento, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        BigDecimal receber = BigDecimal.ZERO, pagar = BigDecimal.ZERO;
        long atrasados = 0;
        List<Map<String, Object>> linhas = new ArrayList<>();
        for (TituloFinanceiro t : lista) {
            boolean ehReceber = t instanceof ContaReceber;
            boolean ativo = t.getStatusFinanceiro() != EnumStatusFinanceiro.CANCELADO;
            if (ativo && ehReceber) receber = receber.add(t.getSaldo());
            if (ativo && !ehReceber) pagar = pagar.add(t.getSaldo());
            if (t.getStatusFinanceiro() == EnumStatusFinanceiro.ATRASADO) atrasados++;
            linhas.add(linha(
                    "tipo", ehReceber ? "A receber" : "A pagar",
                    "descricao", t.getDescricao(),
                    "parceiro", nome(parceiroDo(t)),
                    "emissao", t.getDataEmissao(),
                    "vencimento", t.getDataVencimento(),
                    "valor", t.getValorOriginal(),
                    "pago", t.getValorPago(),
                    "saldo", t.getStatusFinanceiro() == EnumStatusFinanceiro.CANCELADO ? BigDecimal.ZERO : t.getSaldo(),
                    "status", rotulo(t.getStatusFinanceiro())));
        }
        return new RelatorioDTO(info.chave(), info.titulo(), info.descricao(),
                List.of(col("tipo", "Tipo", "texto"), col("descricao", "Descrição", "texto"), col("parceiro", "Parceiro", "texto"),
                        col("emissao", "Emissão", "data"), col("vencimento", "Vencimento", "data"),
                        col("valor", "Valor", "moeda"), col("pago", "Pago", "moeda"), col("saldo", "Saldo", "moeda"),
                        col("status", "Situação", "texto")),
                linhas,
                linha("tipo", "Total", "valor", soma(lista, TituloFinanceiro::getValorOriginal),
                        "pago", soma(lista, TituloFinanceiro::getValorPago)),
                List.of(ind("A receber (saldo)", receber, "moeda"),
                        ind("A pagar (saldo)", pagar, "moeda"),
                        ind("Saldo projetado", receber.subtract(pagar), "moeda"),
                        ind("Títulos atrasados", atrasados, "numero")));
    }

    // ===================== Apoio =====================

    private List<Pesagem> pesagensDoPeriodo(Periodo p, Long parceiroId) {
        return pesagemRepo.findAll().stream()
                .filter(x -> p.contem(x.getDataHoraEntrada()))
                .filter(x -> mesmoParceiro(x.getProdutor(), parceiroId))
                .sorted(Comparator.comparing(Pesagem::getDataHoraEntrada, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private static Parceiro parceiroDo(TituloFinanceiro t) {
        if (t instanceof ContaReceber r) return r.getCliente();
        if (t instanceof ContaPagar pg) return pg.getFornecedor();
        return null;
    }

    private static boolean mesmoParceiro(Pessoa pessoa, Long parceiroId) {
        return parceiroId == null || (pessoa != null && parceiroId.equals(pessoa.getId()));
    }

    private static String nome(Pessoa p) {
        return p != null ? p.getNome() : null;
    }

    /** Enum como texto legível: APROVADO_COM_DESCONTO → "Aprovado com desconto". */
    private static String rotulo(Enum<?> e) {
        if (e == null) return null;
        String s = e.name().replace('_', ' ').toLowerCase();
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static Long minutos(LocalDateTime de, LocalDateTime ate) {
        return de != null && ate != null ? Duration.between(de, ate).toMinutes() : null;
    }

    private static <T> BigDecimal soma(Collection<T> lista, Function<T, BigDecimal> campo) {
        return lista.stream().map(campo).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal media(List<BigDecimal> valores) {
        List<BigDecimal> v = valores.stream().filter(Objects::nonNull).toList();
        if (v.isEmpty()) return null;
        return v.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(v.size()), 2, RoundingMode.HALF_UP);
    }

    private static Coluna col(String chave, String rotulo, String tipo) {
        return new Coluna(chave, rotulo, tipo);
    }

    private static Indicador ind(String rotulo, Object valor, String tipo) {
        return new Indicador(rotulo, valor, tipo);
    }

    /** Linha com ordem preservada e valores nulos permitidos (Map.of não aceita null). */
    private static Map<String, Object> linha(Object... chaveValor) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < chaveValor.length; i += 2) m.put((String) chaveValor[i], chaveValor[i + 1]);
        return m;
    }

    /** Período fechado [início, fim]; extremos nulos = sem limite. */
    record Periodo(LocalDate inicio, LocalDate fim) {
        boolean contem(LocalDate d) {
            if (d == null) return inicio == null && fim == null;
            return (inicio == null || !d.isBefore(inicio)) && (fim == null || !d.isAfter(fim));
        }

        boolean contem(LocalDateTime dt) {
            return contem(dt != null ? dt.toLocalDate() : null);
        }
    }
}

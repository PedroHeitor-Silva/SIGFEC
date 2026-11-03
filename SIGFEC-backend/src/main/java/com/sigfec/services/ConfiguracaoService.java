package com.sigfec.services;

import com.sigfec.domain.entities.ParametroSistema;
import com.sigfec.repositories.ParametroSistemaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Configurações e parâmetros do sistema, editáveis pelo administrador.
 * O valor salvo no banco vence; sem valor salvo, vale o padrão do application.properties / variável de ambiente.
 * Segredos (chaves de API, tokens) nunca são devolvidos pela API — só "configurado" e os 4 últimos caracteres.
 */
@Service
public class ConfiguracaoService {

    public enum Tipo { TEXTO, INTEIRO, PERCENTUAL, LISTA, OPCAO, SEGREDO }

    /** Definição de um parâmetro: grupo da tela, rótulo, tipo, limites e se é visível para todos os usuários. */
    public record Definicao(String chave, String grupo, String rotulo, String ajuda, Tipo tipo,
                            Integer minimo, Integer maximo, List<String> opcoes, boolean publico) {}

    /** O que a tela recebe (o valor de um segredo vem mascarado). */
    public record Item(String chave, String grupo, String rotulo, String ajuda, String tipo, Integer minimo, Integer maximo,
                       List<String> opcoes, String valor, String padrao, boolean personalizado, boolean configurado,
                       String atualizadoEm, String atualizadoPor) {}

    public static final String EMPRESA_RAZAO = "empresa.razao-social";
    public static final String EMPRESA_CNPJ = "empresa.cnpj";
    public static final String EMPRESA_IE = "empresa.inscricao-estadual";
    public static final String EMPRESA_ENDERECO = "empresa.endereco";
    public static final String EMPRESA_CIDADE = "empresa.cidade-uf";
    public static final String EMPRESA_TELEFONE = "empresa.telefone";
    public static final String EMPRESA_EMAIL = "empresa.email";
    public static final String FILA_LOCAIS = "fila.locais-chamada";
    public static final String PRODUTOR_PRAZO = "produtor.prazo-pagamento-dias";
    public static final String PRODUCAO_RESIDUO = "producao.residuo-percentual";
    public static final String VENDAS_PRAZO = "vendas.intervalo-parcelas-dias";
    public static final String VENDAS_MAX_PARCELAS = "vendas.max-parcelas";
    public static final String ALERTA_CNH = "alertas.cnh-dias";
    public static final String SESSAO_HORAS = "seguranca.sessao-horas";
    public static final String ASAAS_AMBIENTE = "asaas.ambiente";
    public static final String ASAAS_CHAVE = "asaas.api-key";
    public static final String ASAAS_WEBHOOK = "asaas.webhook-token";

    public static final String URL_SANDBOX = "https://api-sandbox.asaas.com/v3";
    public static final String URL_PRODUCAO = "https://api.asaas.com/v3";

    private final ParametroSistemaRepository repository;
    private final AuditService auditService;
    private final List<Definicao> catalogo;
    private final Map<String, String> padroes = new LinkedHashMap<>();
    private final Map<String, Optional<ParametroSistema>> cache = new ConcurrentHashMap<>();

    public ConfiguracaoService(ParametroSistemaRepository repository, AuditService auditService,
                               @Value("${sigfec.fila.locais-chamada:Balança 1}") String locais,
                               @Value("${sigfec.pagamento-produtor.prazo-dias:7}") int prazoProdutor,
                               @Value("${sigfec.producao.fator-residuo:0.12}") double fatorResiduo,
                               @Value("${sigfec.jwt.expiration-ms:28800000}") long sessaoMs,
                               @Value("${asaas.base-url:" + URL_SANDBOX + "}") String asaasUrl,
                               @Value("${asaas.api-key:}") String asaasChave,
                               @Value("${asaas.webhook-token:}") String asaasWebhook) {
        this.repository = repository;
        this.auditService = auditService;
        this.catalogo = List.of(
            d(EMPRESA_RAZAO, "Empresa", "Razão social", "Aparece no cabeçalho de notas, laudos, relatórios e comprovantes.", Tipo.TEXTO, null, null, null, true),
            d(EMPRESA_CNPJ, "Empresa", "CNPJ", null, Tipo.TEXTO, null, null, null, true),
            d(EMPRESA_IE, "Empresa", "Inscrição estadual", null, Tipo.TEXTO, null, null, null, true),
            d(EMPRESA_ENDERECO, "Empresa", "Endereço", "Rua, número e bairro.", Tipo.TEXTO, null, null, null, true),
            d(EMPRESA_CIDADE, "Empresa", "Cidade / UF", null, Tipo.TEXTO, null, null, null, true),
            d(EMPRESA_TELEFONE, "Empresa", "Telefone", null, Tipo.TEXTO, null, null, null, true),
            d(EMPRESA_EMAIL, "Empresa", "E-mail", null, Tipo.TEXTO, null, null, null, true),
            d(FILA_LOCAIS, "Fila do pátio", "Locais de chamada", "Balanças / docas para onde o caminhão é chamado. Um por linha.", Tipo.LISTA, null, null, null, true),
            d(PRODUTOR_PRAZO, "Laboratório e produção", "Prazo de pagamento ao produtor (dias)", "Vencimento da conta a pagar gerada pelo laudo aprovado.", Tipo.INTEIRO, 0, 120, null, false),
            d(PRODUCAO_RESIDUO, "Laboratório e produção", "Resíduo fibroso gerado (%)", "Percentual do peso final da mandioca que vira resíduo no estoque ao finalizar um lote.", Tipo.PERCENTUAL, 0, 60, null, false),
            d(VENDAS_PRAZO, "Vendas e financeiro", "Intervalo entre parcelas (dias)", "Venda a prazo: a 1ª parcela vence nesse prazo e as demais a cada intervalo.", Tipo.INTEIRO, 1, 120, null, true),
            d(VENDAS_MAX_PARCELAS, "Vendas e financeiro", "Máximo de parcelas", null, Tipo.INTEIRO, 1, 24, null, true),
            d(ALERTA_CNH, "Alertas", "Avisar CNH a vencer com antecedência de (dias)", null, Tipo.INTEIRO, 1, 180, null, true),
            d(SESSAO_HORAS, "Segurança", "Duração da sessão (horas)", "Depois disso o usuário precisa entrar de novo. Vale para os próximos logins.", Tipo.INTEIRO, 1, 72, null, false),
            d(ASAAS_AMBIENTE, "Integração Asaas (PIX / Boleto)", "Ambiente", "Sandbox = testes, sem cobrança real. Produção = cobranças reais.", Tipo.OPCAO, null, null, List.of("SANDBOX", "PRODUCAO"), false),
            d(ASAAS_CHAVE, "Integração Asaas (PIX / Boleto)", "Chave de API", "Painel Asaas → Integrações → Chaves de API. Sandbox começa com $aact_hmlg_.", Tipo.SEGREDO, null, null, null, false),
            d(ASAAS_WEBHOOK, "Integração Asaas (PIX / Boleto)", "Token do webhook", "O mesmo token configurado no webhook do painel Asaas. Vazio = sem verificação.", Tipo.SEGREDO, null, null, null, false)
        );
        padroes.put(EMPRESA_RAZAO, "Fecularia Loanda");
        padroes.put(EMPRESA_CIDADE, "Loanda — PR");
        padroes.put(FILA_LOCAIS, Arrays.stream(locais.split(",")).map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.joining("\n")));
        padroes.put(PRODUTOR_PRAZO, String.valueOf(prazoProdutor));
        padroes.put(PRODUCAO_RESIDUO, new BigDecimal(String.valueOf(fatorResiduo)).multiply(BigDecimal.valueOf(100)).stripTrailingZeros().toPlainString());
        padroes.put(VENDAS_PRAZO, "30");
        padroes.put(VENDAS_MAX_PARCELAS, "12");
        padroes.put(ALERTA_CNH, "30");
        padroes.put(SESSAO_HORAS, String.valueOf(Math.max(1, sessaoMs / 3_600_000L)));
        padroes.put(ASAAS_AMBIENTE, asaasUrl.contains("sandbox") ? "SANDBOX" : "PRODUCAO");
        padroes.put(ASAAS_CHAVE, asaasChave == null ? "" : asaasChave.trim());
        padroes.put(ASAAS_WEBHOOK, asaasWebhook == null ? "" : asaasWebhook.trim());
    }

    private static Definicao d(String chave, String grupo, String rotulo, String ajuda, Tipo tipo, Integer min, Integer max,
                               List<String> opcoes, boolean publico) {
        return new Definicao(chave, grupo, rotulo, ajuda, tipo, min, max, opcoes, publico);
    }

    // ===================== leitura =====================

    private Optional<ParametroSistema> salvo(String chave) {
        return cache.computeIfAbsent(chave, repository::findById);
    }

    /** Valor efetivo: o salvo pelo administrador ou o padrão. */
    public String valor(String chave) {
        return salvo(chave).map(ParametroSistema::getValor).filter(v -> !v.isBlank()).orElse(padroes.getOrDefault(chave, ""));
    }

    public int inteiro(String chave) {
        try { return Integer.parseInt(valor(chave).trim()); }
        catch (NumberFormatException e) { return Integer.parseInt(padroes.getOrDefault(chave, "0")); }
    }

    /** Percentual salvo como "12" → 0.12. */
    public double fracao(String chave) {
        try { return new BigDecimal(valor(chave).trim().replace(',', '.')).divide(BigDecimal.valueOf(100)).doubleValue(); }
        catch (NumberFormatException e) { return 0; }
    }

    public List<String> lista(String chave) {
        return Arrays.stream(valor(chave).split("[\\n,]")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    public String asaasUrl() {
        return "PRODUCAO".equals(valor(ASAAS_AMBIENTE)) ? URL_PRODUCAO : URL_SANDBOX;
    }

    // ===================== telas =====================

    /** Todos os parâmetros, para a tela do administrador (segredos mascarados). */
    public List<Item> listar() {
        return catalogo.stream().map(this::item).toList();
    }

    /** Parâmetros que qualquer usuário logado pode ler (cabeçalho dos documentos, limites de tela). */
    public Map<String, String> publicos() {
        Map<String, String> m = new LinkedHashMap<>();
        catalogo.stream().filter(Definicao::publico).forEach(dfn -> m.put(dfn.chave(), valor(dfn.chave())));
        return m;
    }

    private Item item(Definicao dfn) {
        Optional<ParametroSistema> p = salvo(dfn.chave());
        boolean personalizado = p.map(x -> x.getValor() != null && !x.getValor().isBlank()).orElse(false);
        String efetivo = valor(dfn.chave());
        boolean segredo = dfn.tipo() == Tipo.SEGREDO;
        String mostrar = segredo ? (efetivo.isBlank() ? "" : "••••" + efetivo.substring(Math.max(0, efetivo.length() - 4))) : efetivo;
        String padrao = segredo ? (padroes.getOrDefault(dfn.chave(), "").isBlank() ? "" : "definido no arquivo/ambiente") : padroes.getOrDefault(dfn.chave(), "");
        return new Item(dfn.chave(), dfn.grupo(), dfn.rotulo(), dfn.ajuda(), dfn.tipo().name(), dfn.minimo(), dfn.maximo(), dfn.opcoes(),
                mostrar, padrao, personalizado, !efetivo.isBlank(),
                p.map(x -> x.getAtualizadoEm() != null ? x.getAtualizadoEm().toString() : null).orElse(null),
                p.map(ParametroSistema::getAtualizadoPor).orElse(null));
    }

    // ===================== gravação =====================

    /**
     * Salva os valores informados. Valor vazio = volta ao padrão. Segredo: só é alterado quando vem um valor novo
     * (o mascarado "••••" é ignorado). Valida tipo e limites; tudo ou nada.
     */
    @Transactional
    public List<Item> salvar(Map<String, String> valores) {
        Map<String, Definicao> porChave = catalogo.stream().collect(Collectors.toMap(Definicao::chave, x -> x));
        Map<String, String> normalizados = new LinkedHashMap<>();
        for (var e : valores.entrySet()) {
            Definicao dfn = porChave.get(e.getKey());
            if (dfn == null) throw RegraNegocioException.invalida("Parâmetro desconhecido: " + e.getKey());
            String v = e.getValue() == null ? "" : e.getValue().trim();
            if (dfn.tipo() == Tipo.SEGREDO && v.startsWith("••••")) continue;
            normalizados.put(dfn.chave(), validar(dfn, v));
        }
        String usuario = usuarioAtual();
        List<String> alterados = new ArrayList<>();
        for (var e : normalizados.entrySet()) {
            String atual = salvo(e.getKey()).map(ParametroSistema::getValor).orElse("");
            if (Objects.equals(atual == null ? "" : atual, e.getValue())) continue;
            ParametroSistema p = salvo(e.getKey()).orElseGet(() -> { ParametroSistema n = new ParametroSistema(); n.setChave(e.getKey()); return n; });
            p.setValor(e.getValue());
            p.setAtualizadoEm(LocalDateTime.now());
            p.setAtualizadoPor(usuario);
            cache.put(e.getKey(), Optional.of(repository.save(p)));
            alterados.add(e.getKey());
        }
        if (!alterados.isEmpty()) {
            // registra só QUAIS parâmetros mudaram — nunca o valor de um segredo
            auditService.log("CONFIGURACAO_ALTERADA", "ParametroSistema", null, String.join(", ", alterados));
        }
        return listar();
    }

    private String validar(Definicao dfn, String v) {
        if (v.isEmpty()) return "";
        switch (dfn.tipo()) {
            case INTEIRO -> {
                int n;
                try { n = Integer.parseInt(v); } catch (NumberFormatException e) { throw RegraNegocioException.invalida(dfn.rotulo() + ": informe um número inteiro."); }
                if ((dfn.minimo() != null && n < dfn.minimo()) || (dfn.maximo() != null && n > dfn.maximo())) {
                    throw RegraNegocioException.invalida(dfn.rotulo() + ": use um valor de " + dfn.minimo() + " a " + dfn.maximo() + ".");
                }
                return String.valueOf(n);
            }
            case PERCENTUAL -> {
                BigDecimal n;
                try { n = new BigDecimal(v.replace(',', '.')); } catch (NumberFormatException e) { throw RegraNegocioException.invalida(dfn.rotulo() + ": informe um número."); }
                if (n.signum() < 0 || (dfn.maximo() != null && n.compareTo(BigDecimal.valueOf(dfn.maximo())) > 0)) {
                    throw RegraNegocioException.invalida(dfn.rotulo() + ": use de 0 a " + dfn.maximo() + "%.");
                }
                return n.stripTrailingZeros().toPlainString();
            }
            case LISTA -> {
                List<String> itens = Arrays.stream(v.split("[\\n,]")).map(String::trim).filter(s -> !s.isEmpty()).distinct().toList();
                if (itens.isEmpty()) throw RegraNegocioException.invalida(dfn.rotulo() + ": informe pelo menos um item.");
                return String.join("\n", itens);
            }
            case OPCAO -> {
                if (!dfn.opcoes().contains(v)) throw RegraNegocioException.invalida(dfn.rotulo() + ": opção inválida.");
                return v;
            }
            case SEGREDO -> {
                if (ASAAS_CHAVE.equals(dfn.chave()) && !v.startsWith("$aact_")) {
                    throw RegraNegocioException.invalida("A chave do Asaas começa com $aact_ (copie a chave inteira do painel).");
                }
                return v;
            }
            default -> {
                if (v.length() > 300) throw RegraNegocioException.invalida(dfn.rotulo() + ": no máximo 300 caracteres.");
                return v;
            }
        }
    }

    private String usuarioAtual() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            return auth != null ? auth.getName() : "sistema";
        } catch (Exception e) { return "sistema"; }
    }
}

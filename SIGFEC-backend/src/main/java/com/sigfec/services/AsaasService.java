package com.sigfec.services;

import com.sigfec.domain.dto.asaas.*;
import com.sigfec.domain.entities.ContaReceber;
import com.sigfec.domain.entities.Parceiro;
import com.sigfec.domain.enums.EnumStatusFinanceiro;
import com.sigfec.repositories.ContaReceberRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.Map;

/**
 * Integração com o gateway de pagamento Asaas.
 * Gera cobranças reais (PIX e Boleto) para Contas a Receber.
 * Chave de API e URL base vêm de variáveis de ambiente.
 */
@Service
@Slf4j
public class AsaasService {

    private final ContaReceberRepository contaReceberRepository;
    private final ConfiguracaoService configuracao;
    private final RestTemplate rest;

    public AsaasService(ContaReceberRepository contaReceberRepository, ConfiguracaoService configuracao) {
        this.contaReceberRepository = contaReceberRepository;
        this.configuracao = configuracao;
        this.rest = new RestTemplate();
    }

    /** URL do ambiente escolhido em Configurações (sandbox ou produção). */
    private String url() {
        return configuracao.asaasUrl();
    }

    /** Headers com token de acesso Asaas — chave e ambiente vêm de Configurações (ou do arquivo/ambiente). */
    private HttpHeaders headers() {
        String apiKey = configuracao.valor(ConfiguracaoService.ASAAS_CHAVE);
        if (apiKey == null || apiKey.isBlank()) {
            throw new AsaasException("Chave da API Asaas não configurada. Informe-a em Configurações → Integração Asaas.");
        }
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.set("access_token", apiKey);
        h.set("User-Agent", "SIGFEC"); // exigido pelo Asaas nas contas novas
        return h;
    }

    /**
     * Traduz a resposta de erro do Asaas numa mensagem útil para o usuário
     * (antes: "Erro ao criar cliente no Asaas: " com o corpo vazio).
     */
    private AsaasException erroAsaas(String acao, HttpStatusCodeException e) {
        String corpo = e.getResponseBodyAsString();
        if (e.getStatusCode().value() == 401 || corpo.contains("invalid_access_token")) {
            return new AsaasException("Chave da API Asaas inválida ou expirada (ou de outro ambiente). Gere uma nova chave no painel "
                    + "Asaas → Integrações → Chaves de API e informe-a em Configurações → Integração Asaas.");
        }
        String detalhe = corpo.replaceAll(".*\"description\":\"([^\"]+)\".*", "$1");
        if (detalhe.isBlank() || detalhe.equals(corpo) && corpo.length() > 200) detalhe = "HTTP " + e.getStatusCode().value();
        return new AsaasException(acao + ": " + detalhe);
    }

    /** Teste da tela de Configurações: consulta 1 cliente com a chave/ambiente atuais. */
    public Map<String, Object> testarConexao() {
        String ambiente = configuracao.valor(ConfiguracaoService.ASAAS_AMBIENTE);
        try {
            rest.exchange(url() + "/customers?limit=1", HttpMethod.GET, new HttpEntity<>(headers()), String.class);
            return Map.of("ok", true, "ambiente", ambiente, "mensagem", "Conexão com o Asaas (" + ambiente + ") funcionando.");
        } catch (HttpStatusCodeException e) {
            return Map.of("ok", false, "ambiente", ambiente, "mensagem", erroAsaas("Falha na conexão", e).getMessage());
        } catch (AsaasException e) {
            return Map.of("ok", false, "ambiente", ambiente, "mensagem", e.getMessage());
        } catch (Exception e) {
            return Map.of("ok", false, "ambiente", ambiente, "mensagem", "Asaas inacessível: " + e.getMessage());
        }
    }

    // ============================ CLIENTE ============================

    /** Localiza cliente no Asaas pelo CPF/CNPJ; cria se não existir. Retorna o id Asaas. */
    public String criarOuBuscarCliente(Parceiro parceiro) {
        if (parceiro == null) throw new AsaasException("Conta a receber sem cliente vinculado.");
        String doc = parceiro.getDocumento() != null ? parceiro.getDocumento().replaceAll("\\D", "") : "";
        if (doc.isBlank()) {
            throw new AsaasException("Cliente sem CPF/CNPJ — obrigatório para gerar cobrança.");
        }

        // 1. Busca por CPF/CNPJ
        try {
            ResponseEntity<AsaasCustomerResponse> busca = rest.exchange(
                    url() + "/customers?cpfCnpj=" + doc,
                    HttpMethod.GET, new HttpEntity<>(headers()), AsaasCustomerResponse.class);
            AsaasCustomerResponse body = busca.getBody();
            if (body != null && body.data() != null && !body.data().isEmpty()) {
                return body.data().get(0).id();
            }
        } catch (HttpStatusCodeException e) {
            log.warn("Falha ao buscar cliente Asaas: {}", e.getResponseBodyAsString());
            if (e.getStatusCode().value() == 401) throw erroAsaas("Erro ao consultar cliente no Asaas", e);
        }

        // 2. Não existe — cria
        AsaasCustomerRequest req = new AsaasCustomerRequest(
                parceiro.getNome(), doc, parceiro.getEmail(),
                parceiro.getTelefone() != null ? parceiro.getTelefone().replaceAll("\\D", "") : null
        );
        try {
            ResponseEntity<AsaasCustomerResponse> resp = rest.exchange(
                    url() + "/customers", HttpMethod.POST,
                    new HttpEntity<>(req, headers()), AsaasCustomerResponse.class);
            if (resp.getBody() == null || resp.getBody().id() == null) {
                throw new AsaasException("Asaas não retornou ID do cliente.");
            }
            return resp.getBody().id();
        } catch (HttpStatusCodeException e) {
            throw erroAsaas("Erro ao criar cliente no Asaas", e);
        }
    }

    // ============================ COBRANÇAS ============================

    /** Gera cobrança PIX para a Conta a Receber. */
    public ContaReceber gerarPixParaContaReceber(Long contaReceberId) {
        ContaReceber conta = obterContaValida(contaReceberId);

        if (conta.getAsaasPaymentId() == null) {
            AsaasPaymentResponse pagamento = criarCobranca(conta, "PIX");
            conta.setAsaasPaymentId(pagamento.id());
            conta.setStatusPagamento(pagamento.status());
            conta.setLinkPagamento(pagamento.invoiceUrl());
            conta = contaReceberRepository.save(conta);
        }

        // Busca/atualiza QR Code PIX
        AsaasPixQrCodeResponse qr = buscarQrCodePix(conta.getAsaasPaymentId());
        conta.setQrCodePix(qr.encodedImage());
        conta.setCopiaEColaPix(qr.payload());
        return contaReceberRepository.save(conta);
    }

    /** Gera cobrança via Boleto para a Conta a Receber. */
    public ContaReceber gerarBoletoParaContaReceber(Long contaReceberId) {
        ContaReceber conta = obterContaValida(contaReceberId);

        if (conta.getAsaasPaymentId() == null) {
            AsaasPaymentResponse pagamento = criarCobranca(conta, "BOLETO");
            conta.setAsaasPaymentId(pagamento.id());
            conta.setStatusPagamento(pagamento.status());
            conta.setLinkPagamento(pagamento.invoiceUrl());
            conta.setLinkBoleto(pagamento.bankSlipUrl());
            conta = contaReceberRepository.save(conta);
        }

        // Busca linha digitável / código de barras
        try {
            ResponseEntity<AsaasIdentificationFieldResponse> resp = rest.exchange(
                    url() + "/payments/" + conta.getAsaasPaymentId() + "/identificationField",
                    HttpMethod.GET, new HttpEntity<>(headers()), AsaasIdentificationFieldResponse.class);
            AsaasIdentificationFieldResponse body = resp.getBody();
            if (body != null) {
                conta.setLinhaDigitavel(body.identificationField());
                conta.setCodigoBarrasBoleto(body.barCode());
            }
        } catch (HttpStatusCodeException e) {
            log.warn("Linha digitável indisponível: {}", e.getResponseBodyAsString());
        }
        return contaReceberRepository.save(conta);
    }

    /** Consulta o QR Code PIX de uma cobrança no Asaas. */
    public AsaasPixQrCodeResponse buscarQrCodePix(String asaasPaymentId) {
        try {
            ResponseEntity<AsaasPixQrCodeResponse> resp = rest.exchange(
                    url() + "/payments/" + asaasPaymentId + "/pixQrCode",
                    HttpMethod.GET, new HttpEntity<>(headers()), AsaasPixQrCodeResponse.class);
            if (resp.getBody() == null) throw new AsaasException("QR Code PIX não retornado pelo Asaas.");
            return resp.getBody();
        } catch (HttpStatusCodeException e) {
            throw erroAsaas("Erro ao obter QR Code PIX", e);
        }
    }

    // ============================ WEBHOOK ============================

    /**
     * Processa evento de webhook do Asaas.
     * Em pagamento confirmado/recebido, marca a ContaReceber como PAGA.
     */
    public void processarWebhookAsaas(Map<String, Object> evento) {
        String event = (String) evento.get("event");
        Object pagObj = evento.get("payment");
        if (event == null || !(pagObj instanceof Map)) return;

        @SuppressWarnings("unchecked")
        Map<String, Object> payment = (Map<String, Object>) pagObj;
        String paymentId = (String) payment.get("id");
        String status = (String) payment.get("status");
        if (paymentId == null) return;

        contaReceberRepository.findByAsaasPaymentId(paymentId).ifPresent(conta -> {
            conta.setStatusPagamento(status);
            // Eventos de quitação
            if ("PAYMENT_RECEIVED".equals(event) || "PAYMENT_CONFIRMED".equals(event)
                    || "RECEIVED".equals(status) || "CONFIRMED".equals(status)) {
                conta.setValorPago(conta.getValorOriginal());
                conta.setDataPagamento(LocalDate.now());
                conta.setStatusFinanceiro(EnumStatusFinanceiro.PAGO);
                if (conta.getFormaPagamento() == null) {
                    conta.setFormaPagamento("ASAAS");
                }
            }
            contaReceberRepository.save(conta);
            log.info("Webhook Asaas: conta #{} atualizada — evento {}", conta.getId(), event);
        });
    }

    // ============================ INTERNOS ============================

    /** Carrega a conta e valida regras antes de gerar cobrança. */
    private ContaReceber obterContaValida(Long id) {
        ContaReceber conta = contaReceberRepository.findById(id)
                .orElseThrow(() -> new AsaasException("Conta a receber não encontrada."));
        if (conta.getStatusFinanceiro() == EnumStatusFinanceiro.PAGO) {
            throw new AsaasException("Conta já está paga — não é possível gerar cobrança.");
        }
        if (conta.getStatusFinanceiro() == EnumStatusFinanceiro.CANCELADO) {
            throw new AsaasException("Conta cancelada — não é possível gerar cobrança.");
        }
        if (conta.getValorOriginal() == null || conta.getValorOriginal().doubleValue() <= 0) {
            throw new AsaasException("Conta sem valor válido.");
        }
        return conta;
    }

    /** Cria a cobrança no Asaas (PIX ou BOLETO). */
    private AsaasPaymentResponse criarCobranca(ContaReceber conta, String billingType) {
        String customerId = criarOuBuscarCliente(conta.getCliente());

        // Vencimento: usa o da conta se for futuro, senão hoje + 3 dias
        LocalDate venc = conta.getDataVencimento();
        if (venc == null || venc.isBefore(LocalDate.now())) {
            venc = LocalDate.now().plusDays(3);
        }

        AsaasPaymentRequest req = new AsaasPaymentRequest(
                customerId,
                billingType,
                conta.getValorOriginal().doubleValue(),
                venc.toString(),
                "SIGFEC — Conta a Receber #" + conta.getId(),
                String.valueOf(conta.getId())
        );

        try {
            ResponseEntity<AsaasPaymentResponse> resp = rest.exchange(
                    url() + "/payments", HttpMethod.POST,
                    new HttpEntity<>(req, headers()), AsaasPaymentResponse.class);
            if (resp.getBody() == null || resp.getBody().id() == null) {
                throw new AsaasException("Asaas não retornou a cobrança.");
            }
            return resp.getBody();
        } catch (HttpStatusCodeException e) {
            throw erroAsaas("Erro ao criar cobrança no Asaas", e);
        }
    }
}

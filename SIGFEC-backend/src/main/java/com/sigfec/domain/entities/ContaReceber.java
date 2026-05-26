package com.sigfec.domain.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Entity
@DiscriminatorValue("RECEBER")
public class ContaReceber extends TituloFinanceiro {

    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Parceiro cliente;

    // ---- Integração ASAAS (cobrança real) ----

    /** ID da cobrança no Asaas (ex: pay_xxxxx). */
    @Column(name = "asaas_payment_id")
    private String asaasPaymentId;

    /** Status do pagamento no Asaas: PENDING, RECEIVED, CONFIRMED, OVERDUE... */
    @Column(name = "status_pagamento")
    private String statusPagamento;

    /** PIX — imagem base64 do QR Code. */
    @Column(name = "qr_code_pix", columnDefinition = "TEXT")
    private String qrCodePix;

    /** PIX — payload copia e cola. */
    @Column(name = "copia_e_cola_pix", columnDefinition = "TEXT")
    private String copiaEColaPix;

    /** Link da fatura/pagamento (página Asaas). */
    @Column(name = "link_pagamento")
    private String linkPagamento;

    /** BOLETO — link do PDF do boleto. */
    @Column(name = "link_boleto")
    private String linkBoleto;

    /** BOLETO — linha digitável. */
    @Column(name = "linha_digitavel")
    private String linhaDigitavel;

    /** BOLETO — código de barras. */
    @Column(name = "codigo_barras_boleto")
    private String codigoBarrasBoleto;
}

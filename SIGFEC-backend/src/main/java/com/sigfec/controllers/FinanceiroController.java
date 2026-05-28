package com.sigfec.controllers;

import com.sigfec.domain.entities.ContaPagar;
import com.sigfec.domain.entities.ContaReceber;
import com.sigfec.domain.entities.TituloFinanceiro;
import com.sigfec.repositories.ContaPagarRepository;
import com.sigfec.repositories.ContaReceberRepository;
import com.sigfec.repositories.FinanceiroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/financeiro")
@RequiredArgsConstructor
public class FinanceiroController {

    private final FinanceiroRepository tituloRepo;
    private final ContaPagarRepository pagarRepo;
    private final ContaReceberRepository receberRepo;

    @GetMapping
    public List<TituloFinanceiro> listarTodos() {
        return tituloRepo.findAll();
    }

    @GetMapping("/pagar")
    public List<ContaPagar> listarPagar() {
        return pagarRepo.findAll();
    }

    @GetMapping("/receber")
    public List<ContaReceber> listarReceber() {
        return receberRepo.findAll();
    }

    @PostMapping("/pagar")
    public ResponseEntity<ContaPagar> criarPagar(@RequestBody ContaPagar conta) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pagarRepo.save(conta));
    }

    @PostMapping("/receber")
    public ResponseEntity<ContaReceber> criarReceber(@RequestBody ContaReceber conta) {
        return ResponseEntity.status(HttpStatus.CREATED).body(receberRepo.save(conta));
    }

    /** Baixa (quitação) de um título — registra pagamento total ou parcial. */
    @PatchMapping("/{id}/baixar")
    public ResponseEntity<TituloFinanceiro> baixar(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return tituloRepo.findById(id).map(titulo -> {
            Object valorObj = body.get("valorPago");
            java.math.BigDecimal valorPago = valorObj != null
                    ? new java.math.BigDecimal(valorObj.toString())
                    : titulo.getValorOriginal();
            titulo.setValorPago(valorPago);
            Object dataObj = body.get("dataPagamento");
            titulo.setDataPagamento(dataObj != null
                    ? java.time.LocalDate.parse(dataObj.toString())
                    : java.time.LocalDate.now());
            if (body.get("formaPagamento") != null) {
                titulo.setFormaPagamento(body.get("formaPagamento").toString());
            }
            // status recalculado no @PreUpdate
            return ResponseEntity.ok(tituloRepo.save(titulo));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Estorna a baixa — volta título para ABERTO. */
    @PatchMapping("/{id}/estornar")
    public ResponseEntity<TituloFinanceiro> estornar(@PathVariable Long id) {
        return tituloRepo.findById(id).map(titulo -> {
            titulo.setValorPago(java.math.BigDecimal.ZERO);
            titulo.setDataPagamento(null);
            titulo.setFormaPagamento(null);
            return ResponseEntity.ok(tituloRepo.save(titulo));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        tituloRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Fluxo de caixa projetado — agrupa entradas (a receber) e saídas (a pagar)
     * por dia nos próximos N dias. Útil pra dashboard de gestão.
     * GET /api/financeiro/fluxo-caixa?dias=30
     */
    @GetMapping("/fluxo-caixa")
    public Map<String, Object> fluxoCaixa(@RequestParam(value = "dias", defaultValue = "30") int dias) {
        java.time.LocalDate hoje = java.time.LocalDate.now();
        java.time.LocalDate fim = hoje.plusDays(dias);

        java.util.Map<java.time.LocalDate, java.math.BigDecimal> entradas = new java.util.TreeMap<>();
        java.util.Map<java.time.LocalDate, java.math.BigDecimal> saidas = new java.util.TreeMap<>();

        receberRepo.findAll().forEach(c -> {
            if (c.getStatusFinanceiro() == com.sigfec.domain.enums.EnumStatusFinanceiro.PAGO
                    || c.getStatusFinanceiro() == com.sigfec.domain.enums.EnumStatusFinanceiro.CANCELADO) return;
            if (c.getDataVencimento() == null || c.getDataVencimento().isBefore(hoje)
                    || c.getDataVencimento().isAfter(fim)) return;
            entradas.merge(c.getDataVencimento(),
                    c.getSaldo() != null ? c.getSaldo() : java.math.BigDecimal.ZERO,
                    java.math.BigDecimal::add);
        });

        pagarRepo.findAll().forEach(c -> {
            if (c.getStatusFinanceiro() == com.sigfec.domain.enums.EnumStatusFinanceiro.PAGO
                    || c.getStatusFinanceiro() == com.sigfec.domain.enums.EnumStatusFinanceiro.CANCELADO) return;
            if (c.getDataVencimento() == null || c.getDataVencimento().isBefore(hoje)
                    || c.getDataVencimento().isAfter(fim)) return;
            saidas.merge(c.getDataVencimento(),
                    c.getSaldo() != null ? c.getSaldo() : java.math.BigDecimal.ZERO,
                    java.math.BigDecimal::add);
        });

        java.math.BigDecimal totalEntradas = entradas.values().stream()
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        java.math.BigDecimal totalSaidas = saidas.values().stream()
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        return Map.of(
                "dias", dias,
                "entradas", entradas,
                "saidas", saidas,
                "totalEntradas", totalEntradas,
                "totalSaidas", totalSaidas,
                "saldoProjetado", totalEntradas.subtract(totalSaidas)
        );
    }
}

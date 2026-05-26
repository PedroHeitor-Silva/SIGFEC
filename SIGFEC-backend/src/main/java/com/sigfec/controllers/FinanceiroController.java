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
}

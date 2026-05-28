package com.sigfec.controllers;

import com.sigfec.domain.dto.ParceiroResumoDTO;
import com.sigfec.domain.entities.Parceiro;
import com.sigfec.repositories.ContaPagarRepository;
import com.sigfec.repositories.ContaReceberRepository;
import com.sigfec.repositories.PesagemRepository;
import com.sigfec.repositories.VendaRepository;
import com.sigfec.services.ParceiroService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/parceiros")
@RequiredArgsConstructor
public class ParceiroController {

    private final ParceiroService service;
    private final PesagemRepository pesagemRepository;
    private final VendaRepository vendaRepository;
    private final ContaPagarRepository contaPagarRepository;
    private final ContaReceberRepository contaReceberRepository;

    @GetMapping
    public List<Parceiro> listarTodos() {
        return service.listarTodos();
    }

    @GetMapping("/resumo")
    public List<ParceiroResumoDTO> listarResumo() {
        return service.listarResumo();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Parceiro> buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Parceiro> salvar(@RequestBody Parceiro parceiro) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.salvar(parceiro));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @RequestBody Parceiro parceiro) {
        try {
            return ResponseEntity.ok(service.atualizar(id, parceiro));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Long id) {
        // Bloqueia delete se tem vínculos — protege integridade referencial
        long pesagens = pesagemRepository.findAll().stream()
                .filter(p -> p.getProdutor() != null && id.equals(p.getProdutor().getId())).count();
        long vendas = vendaRepository.findAll().stream()
                .filter(v -> v.getCliente() != null && id.equals(v.getCliente().getId())).count();
        long pagar = contaPagarRepository.findAll().stream()
                .filter(c -> c.getFornecedor() != null && id.equals(c.getFornecedor().getId())).count();
        long receber = contaReceberRepository.findAll().stream()
                .filter(c -> c.getCliente() != null && id.equals(c.getCliente().getId())).count();
        long total = pesagens + vendas + pagar + receber;
        if (total > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "Parceiro não pode ser excluído — tem " + total + " vínculo(s): " +
                         pesagens + " pesagem(s), " + vendas + " venda(s), " +
                         pagar + " conta(s) a pagar, " + receber + " conta(s) a receber."
            ));
        }
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}

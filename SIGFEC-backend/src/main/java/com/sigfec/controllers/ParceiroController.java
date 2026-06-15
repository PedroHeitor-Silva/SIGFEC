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
        // Bloqueia delete se tem vínculos — protege integridade referencial.
        // Usa existsBy (consulta direta no banco) em vez de carregar tudo em memória.
        boolean temPesagem = pesagemRepository.existsByProdutor_Id(id);
        boolean temVenda = vendaRepository.existsByCliente_Id(id);
        boolean temPagar = contaPagarRepository.existsByFornecedor_Id(id);
        boolean temReceber = contaReceberRepository.existsByCliente_Id(id);
        if (temPesagem || temVenda || temPagar || temReceber) {
            StringBuilder vinculos = new StringBuilder();
            if (temPesagem) vinculos.append("pesagens, ");
            if (temVenda) vinculos.append("vendas, ");
            if (temPagar) vinculos.append("contas a pagar, ");
            if (temReceber) vinculos.append("contas a receber, ");
            String lista = vinculos.substring(0, vinculos.length() - 2);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "Parceiro não pode ser excluído — possui vínculos em: " + lista + "."
            ));
        }
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}

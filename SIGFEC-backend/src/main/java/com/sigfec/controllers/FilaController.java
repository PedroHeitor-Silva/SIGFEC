package com.sigfec.controllers;

import com.sigfec.domain.dto.fila.EntradaFilaDTO;
import com.sigfec.domain.dto.fila.FilaRequests;
import com.sigfec.domain.enums.EnumStatusEntrada;
import com.sigfec.services.FilaService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Fila de descarga do pátio. A finalização acontece ao registrar a pesagem
 * (POST /api/pesagens?entradaFila={id}); entradas não são excluídas, só canceladas.
 */
@RestController
@RequestMapping("/api/fila")
@RequiredArgsConstructor
public class FilaController {

    private final FilaService service;

    /** Fila do dia (padrão: hoje) mais entradas ativas de dias anteriores. Filtro opcional por status. */
    @GetMapping
    public List<EntradaFilaDTO> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data,
            @RequestParam(required = false) EnumStatusEntrada status) {
        return service.listar(data != null ? data : LocalDate.now(), status);
    }

    /** Locais para onde um veículo pode ser chamado. */
    @GetMapping("/locais")
    public List<String> locais() {
        return service.locaisChamada();
    }

    /** Próximo veículo apto a ser chamado (checklist aprovado). 204 se nenhum. */
    @GetMapping("/proximo")
    public ResponseEntity<EntradaFilaDTO> proximo() {
        return service.proximoApto().map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}")
    public EntradaFilaDTO buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    /** Registra a chegada e emite a senha do dia. */
    @PostMapping
    public ResponseEntity<EntradaFilaDTO> registrarChegada(@RequestBody FilaRequests.RegistrarChegada req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.registrarChegada(req));
    }

    /** Chama o próximo apto para o local informado. Corpo: {"local": "Balança 1"}. */
    @PostMapping("/chamar-proximo")
    public EntradaFilaDTO chamarProximo(@RequestBody FilaRequests.Chamada req) {
        return service.chamarProximo(req != null ? req.local() : null);
    }

    /** Chama esta entrada para o local informado. Corpo: {"local": "Balança 1"}. */
    @PostMapping("/{id}/chamar")
    public EntradaFilaDTO chamar(@PathVariable Long id, @RequestBody FilaRequests.Chamada req) {
        return service.chamar(id, req != null ? req.local() : null);
    }

    /** Chamado não compareceu: volta a aguardar na mesma posição. */
    @PostMapping("/{id}/devolver")
    public EntradaFilaDTO devolver(@PathVariable Long id) {
        return service.devolverParaFila(id);
    }

    /** Veículo chegou ao local: inicia o atendimento na balança. */
    @PostMapping("/{id}/atender")
    public EntradaFilaDTO atender(@PathVariable Long id) {
        return service.atender(id);
    }

    /** Cancela a entrada. Corpo: {"motivo": "..."} (obrigatório). */
    @PostMapping("/{id}/cancelar")
    public EntradaFilaDTO cancelar(@PathVariable Long id, @RequestBody(required = false) FilaRequests.Cancelamento req) {
        return service.cancelar(id, req != null ? req.motivo() : null);
    }
}

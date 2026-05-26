package com.sigfec.controllers;

import com.sigfec.domain.entities.Cidade;
import com.sigfec.repositories.CidadeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/cidades")
@RequiredArgsConstructor
public class CidadeController {

    private final CidadeRepository repository;

    /** Cidades por sigla do estado — ex: /api/cidades/estado/PR */
    @GetMapping("/estado/{sigla}")
    public List<Cidade> porEstadoSigla(@PathVariable String sigla) {
        return repository.findByEstadoSiglaIgnoreCaseOrderByNomeAsc(sigla);
    }

    /** Cidades por id do estado — ex: /api/cidades/estado-id/12 */
    @GetMapping("/estado-id/{estadoId}")
    public List<Cidade> porEstadoId(@PathVariable Long estadoId) {
        return repository.findByEstadoIdOrderByNomeAsc(estadoId);
    }
}

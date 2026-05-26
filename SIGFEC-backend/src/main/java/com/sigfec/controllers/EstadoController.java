package com.sigfec.controllers;

import com.sigfec.domain.entities.Estado;
import com.sigfec.repositories.EstadoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/estados")
@RequiredArgsConstructor
public class EstadoController {

    private final EstadoRepository repository;

    @GetMapping
    public List<Estado> listar() {
        return repository.findAll(Sort.by("nome"));
    }
}

package com.sigfec.controllers;

import com.sigfec.domain.dto.RelatorioDTO;
import com.sigfec.domain.entities.Usuario;
import com.sigfec.domain.enums.EnumPerfilAcesso;
import com.sigfec.repositories.UsuarioRepository;
import com.sigfec.services.RegraNegocioException;
import com.sigfec.services.RelatorioService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Relatórios gerenciais.
 *   GET /api/relatorios                 → catálogo que o usuário pode emitir
 *   GET /api/relatorios/{chave}?inicio=2026-10-01&fim=2026-10-31&parceiroId=3
 * Sem período informado, usa os últimos 30 dias.
 */
@RestController
@RequestMapping("/api/relatorios")
@RequiredArgsConstructor
public class RelatorioController {

    /** Módulos padrão de cada perfil — mesma regra do front (theme/permissions.js). */
    private static final Map<EnumPerfilAcesso, Set<String>> MODULOS = Map.of(
            EnumPerfilAcesso.BALANCA, Set.of("fila", "pesagem", "romaneio", "parceiros"),
            EnumPerfilAcesso.LABORATORIO, Set.of("laboratorio", "pesagem", "romaneio"),
            EnumPerfilAcesso.PRODUCAO, Set.of("fila", "estoque", "pesagem", "romaneio", "laboratorio", "lotes"),
            EnumPerfilAcesso.FINANCEIRO, Set.of("financeiro", "vendas", "parceiros", "cadastros")
    );

    private final RelatorioService service;
    private final UsuarioRepository usuarioRepository;

    @GetMapping
    public List<RelatorioDTO.Info> catalogo(Authentication auth) {
        Usuario u = usuario(auth);
        return RelatorioService.CATALOGO.stream().filter(i -> podeVer(u, i.modulo())).toList();
    }

    @GetMapping("/{chave}")
    public RelatorioDTO gerar(@PathVariable String chave,
                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
                              @RequestParam(required = false) Long parceiroId,
                              Authentication auth) {
        RelatorioDTO.Info info = service.info(chave)
                .orElseThrow(() -> RegraNegocioException.naoEncontrada("Relatório '" + chave + "' não existe."));
        if (!podeVer(usuario(auth), info.modulo())) {
            throw new RegraNegocioException(HttpStatus.FORBIDDEN, "Seu perfil não tem acesso ao relatório " + info.titulo() + ".");
        }
        if (fim == null) fim = LocalDate.now();
        if (inicio == null) inicio = fim.minusDays(30);
        return service.gerar(chave, inicio, fim, parceiroId);
    }

    private Usuario usuario(Authentication auth) {
        return usuarioRepository.findByLogin(auth.getName())
                .orElseThrow(() -> new RegraNegocioException(HttpStatus.UNAUTHORIZED, "Usuário não encontrado."));
    }

    /** ADMIN vê tudo; negadas > extras > padrão do perfil (igual a canDo(user, modulo, 'ver') no front). */
    static boolean podeVer(Usuario u, String modulo) {
        if (u.getPerfilAcesso() == EnumPerfilAcesso.ADMIN) return true;
        String chave = modulo + ":ver";
        if (csv(u.getPermissoesNegadas()).contains(chave)) return false;
        if (csv(u.getPermissoesExtras()).contains(chave)) return true;
        return MODULOS.getOrDefault(u.getPerfilAcesso(), Set.of()).contains(modulo);
    }

    private static Set<String> csv(String s) {
        if (s == null || s.isBlank()) return Set.of();
        return Arrays.stream(s.split(",")).map(String::trim).filter(x -> !x.isEmpty()).collect(Collectors.toSet());
    }
}

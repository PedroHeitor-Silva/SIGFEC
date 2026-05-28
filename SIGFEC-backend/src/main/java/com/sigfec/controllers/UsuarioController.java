package com.sigfec.controllers;

import com.sigfec.domain.entities.Usuario;
import com.sigfec.repositories.UsuarioRepository;
import com.sigfec.security.JwtUtil;
import com.sigfec.services.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwt;
    private final AuditService auditService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciais) {
        String login = credenciais.get("login");
        String senha = credenciais.get("senha");

        if (login == null || login.isBlank() || senha == null || senha.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Login e senha são obrigatórios."));
        }

        Optional<Usuario> opt = repository.findByLogin(login);
        if (opt.isEmpty() || !passwordEncoder.matches(senha, opt.get().getSenha())) {
            auditService.log("LOGIN_FAIL", "Usuario", null, "login=" + login);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Credenciais inválidas."));
        }

        Usuario usuario = opt.get();
        if (!usuario.isStatusAtivo()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Usuário inativo."));
        }

        String token = jwt.generate(
                usuario.getLogin(),
                usuario.getPerfilAcesso() != null ? usuario.getPerfilAcesso().name() : null,
                usuario.getId()
        );

        Map<String, Object> body = new HashMap<>();
        body.put("token", token);
        body.put("id", usuario.getId());
        body.put("login", usuario.getLogin());
        body.put("nome", usuario.getNome());
        body.put("email", usuario.getEmail());
        body.put("perfilAcesso", usuario.getPerfilAcesso());
        body.put("statusAtivo", usuario.isStatusAtivo());
        body.put("permissoesExtras", usuario.getPermissoesExtras());
        body.put("permissoesNegadas", usuario.getPermissoesNegadas());

        log.info("Login bem-sucedido: {}", usuario.getLogin());
        auditService.log("LOGIN_OK", "Usuario", usuario.getId(), "perfil=" + usuario.getPerfilAcesso());
        return ResponseEntity.ok(body);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Usuario> cadastrar(@RequestBody Usuario usuario) {
        if (usuario.getDataCadastro() == null) {
            usuario.setDataCadastro(LocalDate.now());
        }
        if (usuario.getSenha() != null && !usuario.getSenha().startsWith("$2")) {
            usuario.setSenha(passwordEncoder.encode(usuario.getSenha()));
        }
        Usuario salvo = repository.save(usuario);
        salvo.setSenha(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Usuario>> listarTodos() {
        List<Usuario> usuarios = repository.findAll();
        usuarios.forEach(u -> u.setSenha(null));
        return ResponseEntity.ok(usuarios);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Usuario> buscar(@PathVariable Long id) {
        return repository.findById(id).map(u -> {
            u.setSenha(null);
            return ResponseEntity.ok(u);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Usuario> atualizar(@PathVariable Long id, @RequestBody Usuario payload) {
        return repository.findById(id).map(u -> {
            if (payload.getNome() != null) u.setNome(payload.getNome());
            if (payload.getEmail() != null) u.setEmail(payload.getEmail());
            if (payload.getTelefone() != null) u.setTelefone(payload.getTelefone());
            if (payload.getDocumento() != null) u.setDocumento(payload.getDocumento());
            if (payload.getLogin() != null) u.setLogin(payload.getLogin());
            if (payload.getPerfilAcesso() != null) u.setPerfilAcesso(payload.getPerfilAcesso());
            // Permissões granulares (nullable = mantém atual; "" = limpa)
            if (payload.getPermissoesExtras() != null) u.setPermissoesExtras(payload.getPermissoesExtras());
            if (payload.getPermissoesNegadas() != null) u.setPermissoesNegadas(payload.getPermissoesNegadas());
            u.setStatusAtivo(payload.isStatusAtivo());
            // Senha: só atualiza se vier nova e não-vazia, e ainda não estiver hasheada
            if (payload.getSenha() != null && !payload.getSenha().isBlank()) {
                u.setSenha(passwordEncoder.encode(payload.getSenha()));
            }
            Usuario salvo = repository.save(u);
            salvo.setSenha(null);
            return ResponseEntity.ok(salvo);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

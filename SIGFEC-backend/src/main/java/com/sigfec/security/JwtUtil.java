package com.sigfec.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(@Value("${sigfec.jwt.secret:DEFAULT_DEV_SECRET_change_in_production_at_least_32_chars}") String secret,
                   @Value("${sigfec.jwt.expiration-ms:28800000}") long expirationMs) {
        // 8h padrão
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            // padroniza a chave para no mínimo 32 bytes
            byte[] padded = new byte[32];
            System.arraycopy(bytes, 0, padded, 0, Math.min(bytes.length, 32));
            bytes = padded;
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationMs = expirationMs;
    }

    /** Duração da sessão definida em Configurações; sem ela, vale sigfec.jwt.expiration-ms. */
    private com.sigfec.services.ConfiguracaoService configuracao;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setConfiguracao(@org.springframework.context.annotation.Lazy com.sigfec.services.ConfiguracaoService configuracao) {
        this.configuracao = configuracao;
    }

    public String generate(String login, String perfilAcesso, Long userId) {
        Date now = new Date();
        long expirationMs = configuracao != null
                ? configuracao.inteiro(com.sigfec.services.ConfiguracaoService.SESSAO_HORAS) * 3_600_000L
                : this.expirationMs;
        return Jwts.builder()
                .subject(login)
                .claim("perfil", perfilAcesso)
                .claim("uid", userId)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String getLogin(String token) {
        return parse(token).getSubject();
    }
}

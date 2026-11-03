package com.sigfec.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Serve as telas (build do front copiado para /static no Dockerfile) na mesma origem da API.
 * Rotas do React (/fila, /vendas...) que não são arquivos devolvem o index.html.
 * Sem /static/index.html (desenvolvimento, front no Vite) não faz nada.
 */
@Configuration
public class TelasConfig implements WebMvcConfigurer {

    private static final ClassPathResource INDEX = new ClassPathResource("/static/index.html");

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        if (!INDEX.exists()) return;
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String caminho, Resource local) throws IOException {
                        Resource arquivo = local.createRelative(caminho);
                        if (arquivo.exists() && arquivo.isReadable()) return arquivo;
                        if (caminho.startsWith("api/") || caminho.contains(".")) return null;
                        return INDEX;
                    }
                });
    }
}

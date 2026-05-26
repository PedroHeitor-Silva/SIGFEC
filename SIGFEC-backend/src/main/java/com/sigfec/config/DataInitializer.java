package com.sigfec.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.sigfec.domain.entities.Cidade;
import com.sigfec.domain.entities.Estado;
import com.sigfec.domain.entities.Produto;
import com.sigfec.domain.entities.Usuario;
import com.sigfec.domain.enums.EnumCategoriaProduto;
import com.sigfec.domain.enums.EnumPerfilAcesso;
import com.sigfec.repositories.CidadeRepository;
import com.sigfec.repositories.EstadoRepository;
import com.sigfec.repositories.ProdutoRepository;
import com.sigfec.repositories.UsuarioRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final EstadoRepository estadoRepository;
    private final CidadeRepository cidadeRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProdutoRepository produtoRepository;
    private final PasswordEncoder passwordEncoder;
    private final RestTemplate restTemplate = buildRestTemplate();

    private static final String IBGE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";

    /** RestTemplate com timeout — não trava o startup quando offline. */
    private static RestTemplate buildRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(20000);
        return new RestTemplate(factory);
    }

    @Override
    public void run(String... args) {
        try {
            seedUsuarioAdmin();
            seedCatalogoProdutos();

            if (estadoRepository.count() > 0 && cidadeRepository.count() > 0) {
                log.info("Base de dados de localidades já populada.");
                return;
            }

            log.info("Iniciando busca de municípios na API do IBGE...");
            IbgeMunicipioDTO[] municipios = restTemplate.getForObject(IBGE_URL, IbgeMunicipioDTO[].class);

            if (municipios == null || municipios.length == 0) return;

            log.info("Processando {} municípios...", municipios.length);

            // 1. Mapear e Salvar Estados únicos
            Map<String, Estado> estadoMap = processarEstados(municipios);

            // 2. Mapear e Salvar Cidades em lote
            processarCidades(municipios, estadoMap);

        } catch (Exception e) {
            log.error("Falha ao inicializar dados: {}", e.getMessage());
            e.printStackTrace();
        }
    }

    private void seedCatalogoProdutos() {
        if (produtoRepository.count() > 0) {
            log.info("Catálogo de produtos já populado.");
            return;
        }
        // Catálogo baseado em produtos reais da Fecularia Loanda (alimentosloanda.com.br)
        record P(String nome, EnumCategoriaProduto cat, String preco) {}
        List<P> catalogo = List.of(
            new P("Mandioca in natura", EnumCategoriaProduto.MANDIOCA, "0.45"),
            new P("Fécula de Mandioca", EnumCategoriaProduto.FECULA, "4.20"),
            new P("Tapioca", EnumCategoriaProduto.TAPIOCA, "6.50"),
            new P("Polvilho Doce", EnumCategoriaProduto.POLVILHO_DOCE, "4.80"),
            new P("Polvilho Azedo Granulado", EnumCategoriaProduto.POLVILHO_AZEDO_GRANULADO, "5.50"),
            new P("Polvilho Azedo em Pó", EnumCategoriaProduto.POLVILHO_AZEDO_PO, "5.30"),
            new P("Dextrina", EnumCategoriaProduto.DEXTRINA, "9.80"),
            new P("Resíduo Fibroso (ração)", EnumCategoriaProduto.RESIDUO_FIBROSO, "0.18")
        );
        for (P p : catalogo) {
            Produto produto = new Produto();
            produto.setNome(p.nome());
            produto.setCategoria(p.cat());
            produto.setPrecoBase(new java.math.BigDecimal(p.preco()));
            produtoRepository.save(produto);
        }
        log.info("Catálogo Fecularia Loanda criado: {} produtos.", catalogo.size());
    }

    private void seedUsuarioAdmin() {
        if (usuarioRepository.findByLogin("admin").isPresent()) {
            log.info("Usuário admin já existe.");
            return;
        }
        Usuario admin = new Usuario();
        admin.setNome("Administrador");
        admin.setEmail("admin@sigfec.local");
        admin.setLogin("admin");
        admin.setSenha(passwordEncoder.encode("admin"));
        admin.setStatusAtivo(true);
        admin.setPerfilAcesso(EnumPerfilAcesso.ADMIN);
        usuarioRepository.save(admin);
        log.info("Usuário admin criado (login=admin, senha=admin) com senha BCrypt.");
    }

    private Map<String, Estado> processarEstados(IbgeMunicipioDTO[] municipios) {
        log.info("Sincronizando Estados brasileiros...");
        
        // Extrai UFs únicas do retorno da API
        Map<String, String> ufs = Arrays.stream(municipios)
                .map(m -> m.getMicrorregiao().getMesorregiao().getUf())
                .collect(Collectors.toMap(UF::getSigla, UF::getNome, (existente, novo) -> existente));

        Map<String, Estado> estadoCache = new HashMap<>();

        ufs.forEach((sigla, nome) -> {
            Estado estado = estadoRepository.findBySigla(sigla)
                    .orElseGet(() -> estadoRepository.save(new Estado(null, nome, sigla)));
            estadoCache.put(sigla, estado);
        });

        return estadoCache;
    }

    private void processarCidades(IbgeMunicipioDTO[] municipios, Map<String, Estado> estadoCache) {
        log.info("Convertendo e salvando cidades...");

        List<Cidade> cidadesParaSalvar = Arrays.stream(municipios)
                .map(dto -> {
                    Estado estado = estadoCache.get(dto.getMicrorregiao().getMesorregiao().getUf().getSigla());
                    return new Cidade(null, dto.getNome(), estado);
                })
                .collect(Collectors.toList());

        cidadeRepository.saveAll(cidadesParaSalvar);
        log.info("Povoamento concluído com sucesso: {} cidades inseridas.", cidadesParaSalvar.size());
    }

    // DTOs Internos para mapeamento da API IBGE
    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class IbgeMunicipioDTO {
        private String nome;
        private Microrregiao microrregiao;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class Microrregiao { private Mesorregiao mesorregiao; }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class Mesorregiao { @JsonProperty("UF") private UF uf; }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class UF { private String sigla; private String nome; }
}

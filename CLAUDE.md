# SIGFEC — ERP da Fecularia Loanda (TCC)

Monorepo: `SIGFEC-backend/` (Spring Boot 4, Java, JPA, PostgreSQL) e `sigfec-front/` (React 18 + Vite + Tailwind 4).
Fluxo do negócio: fila do pátio → checklist → pesagem → laudo do laboratório → pagamento ao produtor → lote de produção → estoque (Kardex) → venda → financeiro (Asaas PIX/Boleto).

## Rodar
- Banco: PostgreSQL local `sigfec_db` na 5432. `ddl-auto=update` (sem migrations).
- Backend (máquina tem só JDK 17; o pom pede 21): `cd SIGFEC-backend && ./mvnw -o spring-boot:run -Dmaven.compiler.release=17` → porta 8080.
- Testes: `./mvnw -o -q test -Dmaven.compiler.release=17` (JUnit 5 + Mockito, sem banco).
- Front dev: `npm --prefix sigfec-front run dev` → 5173. Build de produção/PWA: `npm --prefix sigfec-front run app` → 4173.
- Login de desenvolvimento: semeado pelo `DataInitializer` (usuário admin).
- Dados de demonstração: `node scripts/popular-dados.mjs --limpar` (backend no ar) apaga o que foi cadastrado e popula ~3 meses de histórico fictício pela API. Os usuários de teste e a senha deles estão no cabeçalho do script. Backup do banco antes de popular: `..\SIGFEC-backup-banco\`.
- O front chama `/api` na própria origem; o Vite faz proxy para 8080 (`vite.config.js`). Não volte a usar `http://host:8080` no `api.js`.
- Encerrar o backend: parar o Maven não mata a JVM filha; libere a 8080 pelo PID se precisar reiniciar.

## Convenções do backend
- Regra de negócio violada → `RegraNegocioException.invalida/naoEncontrada/conflito` (400/404/409), tratada no `GlobalExceptionHandler`. Não lance `RuntimeException` genérica.
- Regras ficam nos services (`@Transactional`), não nos controllers. Campos de sistema (id, status, valores calculados) nunca vêm do cliente: zere-os na criação.
- Mudanças de estado relevantes vão para `AuditService.log(...)`.
- Estoque só muda via `MovimentacaoEstoqueService.aplicar(...)` (Kardex).
- `application.properties` está em Latin-1: acentos como `ç`.
- Laudo aprovado gera `ContaPagar` ao produtor com descrição `AnaliseLaboratorioService.descricaoPagamento(id)` — relatórios dependem desse texto.

## Convenções do front
- Tema: a paleta `slate` e `white` é **invertida** no `index.css` (claro por padrão; `data-theme="dark"` reverte). Use `text-white`/`bg-slate-900` como "texto principal"/"cartão"; `text-gray-*` não acompanha o tema.
- Permissões em duas camadas (`theme/permissions.js`: perfil + extras/negadas por usuário). Módulo novo: registrar em `theme/modules.jsx` (MODULES, SECTIONS, PATHS), `permissions.js` (PERMISSIONS, PATH_TO_MODULE) e rota em `App.jsx`. O `RelatorioController` replica a regra no backend — mantenha os dois iguais.
- Impressão: `utils/printDoc.js` (abre janela com "Imprimir / Salvar PDF"); CSV: `utils/csv.js`.
- Service worker (`public/sw.js`) só é registrado no build de produção; nunca cacheia `/api`.

## Documentação do TCC (fora do repo)
- `..\Documentaçao\SIGFEC-Documentação Certa (com Fila).docx`, diagramas PlantUML em `..\Diagramas\novo\*.puml`.
- Sem python/pandoc/zip na máquina: editar .docx = extrair com `jar -xf`, editar `word/document.xml` com node, reempacotar com `jar -cMf`, validar abrindo no Word via COM (PowerShell). Sempre fazer backup em `Documentaçao\backup` antes.

## Git
- Não commitar sem o usuário pedir. Arquivos soltos na raiz (`Treinamento_*`, `gerar_*.js`, `logo_sigfec.png`) não fazem parte do sistema.

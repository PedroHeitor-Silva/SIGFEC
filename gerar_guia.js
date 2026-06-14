const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, PageBreak,
  LevelFormat, ExternalHyperlink
} = require('docx');

// ===== Paleta =====
const TEAL = "1ABB9C";
const TEAL_DARK = "0E7C66";
const CINZA = "475569";
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

// ===== Helpers =====
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing:{before:300, after:160}, children:[new TextRun({text:t, bold:true, color:TEAL_DARK, size:32})] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing:{before:220, after:120}, children:[new TextRun({text:t, bold:true, color:TEAL, size:26})] });
const P = (runs, opts={}) => new Paragraph({ spacing:{after:120, line:276}, ...opts, children: Array.isArray(runs)?runs:[new TextRun(runs)] });
const t = (text, o={}) => new TextRun({ text, ...o });
const bullet = (runs) => new Paragraph({ numbering:{reference:"bul", level:0}, spacing:{after:80, line:264}, children: Array.isArray(runs)?runs:[new TextRun(runs)] });
const num = (runs) => new Paragraph({ numbering:{reference:"numlist", level:0}, spacing:{after:80, line:264}, children: Array.isArray(runs)?runs:[new TextRun(runs)] });

// caixa de destaque (fala / dica)
const box = (titulo, corpo, fill="F0FDFA", stroke=TEAL) => new Table({
  width:{size:9360, type:WidthType.DXA}, columnWidths:[9360],
  borders:{ top:{style:BorderStyle.SINGLE,size:4,color:stroke}, bottom:{style:BorderStyle.SINGLE,size:4,color:stroke}, left:{style:BorderStyle.SINGLE,size:12,color:stroke}, right:{style:BorderStyle.SINGLE,size:4,color:stroke} },
  rows:[ new TableRow({ children:[ new TableCell({
    width:{size:9360,type:WidthType.DXA}, shading:{fill, type:ShadingType.CLEAR},
    margins:{top:120,bottom:120,left:160,right:160},
    children:[
      new Paragraph({spacing:{after:60}, children:[new TextRun({text:titulo, bold:true, color:stroke, size:22})]}),
      ...corpo.map(c => new Paragraph({spacing:{after:60, line:264}, children: Array.isArray(c)?c:[new TextRun({text:c, size:22})]}))
    ]
  })]})]
});

// tabela simples 2 col
const tab2 = (header, rows) => new Table({
  width:{size:9360,type:WidthType.DXA}, columnWidths:[3200,6160],
  rows:[
    new TableRow({ tableHeader:true, children: header.map((h,i)=> new TableCell({ width:{size:i===0?3200:6160,type:WidthType.DXA}, borders, shading:{fill:TEAL, type:ShadingType.CLEAR}, margins:{top:80,bottom:80,left:120,right:120}, children:[new Paragraph({children:[new TextRun({text:h, bold:true, color:"FFFFFF", size:20})]})] })) }),
    ...rows.map(r => new TableRow({ children: r.map((c,i)=> new TableCell({ width:{size:i===0?3200:6160,type:WidthType.DXA}, borders, margins:{top:70,bottom:70,left:120,right:120}, children:[new Paragraph({children:[new TextRun({text:c, size:20, bold:i===0})]})] })) }))
  ]
});

const doc = new Document({
  numbering:{ config:[
    { reference:"bul", levels:[{level:0, format:LevelFormat.BULLET, text:"•", alignment:AlignmentType.LEFT, style:{paragraph:{indent:{left:560, hanging:280}}}}] },
    { reference:"numlist", levels:[{level:0, format:LevelFormat.DECIMAL, text:"%1.", alignment:AlignmentType.LEFT, style:{paragraph:{indent:{left:560, hanging:280}}}}] },
  ]},
  styles:{ default:{ document:{ run:{ font:"Calibri", size:22, color:"1E293B" } } } },
  sections:[{
    properties:{ page:{ size:{width:12240,height:15840}, margin:{top:1080,right:1080,bottom:1080,left:1080} } },
    children:[

      // ====== CAPA ======
      new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:1200, after:80}, children:[new TextRun({text:"🎓 GUIA DE APRESENTAÇÃO", bold:true, size:52, color:TEAL_DARK})] }),
      new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:40}, children:[new TextRun({text:"Prévia do TCC — SIGFEC", bold:true, size:40, color:TEAL})] }),
      new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:300}, children:[new TextRun({text:"Sistema Integrado de Gestão para Fecularia", italics:true, size:26, color:CINZA})] }),
      new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:80}, children:[new TextRun({text:"Pedro Heitor Oliveira Silva", size:24})] }),
      new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:600}, children:[new TextRun({text:"Universidade Paranaense — UNIPAR", size:22, color:CINZA})] }),
      box("📌 LEIA ANTES DE TUDO", [
        "Este documento é SÓ SEU. Escrito de um jeito leve pra você estudar rápido.",
        "Não decore palavra por palavra. Entenda a ideia e fale com suas palavras — fica mais natural.",
        "Respira fundo. Você construiu esse sistema inteiro. Ninguém conhece ele melhor que você.",
      ], "FEF9C3", "CA8A04"),

      new Paragraph({children:[new PageBreak()]}),

      // ====== 1. O QUE É O SISTEMA (PITCH) ======
      H1("1. O Pitch — Explicando o SIGFEC em 30 segundos"),
      P([t("Se o professor perguntar logo de cara “me explica seu sistema”, você responde algo assim:")]),
      box("🎤 FALA PRONTA (decore a ideia, não as palavras)", [
        [t("“O SIGFEC é um sistema de gestão feito sob medida para uma "), t("fecularia", {bold:true}), t(" — uma indústria que transforma mandioca em fécula, polvilho, tapioca e outros derivados.")],
        [t("Hoje a Fecularia Loanda controla tudo em planilhas separadas: a balança numa, o laboratório noutra, o financeiro noutra. Isso gera retrabalho e perda de informação.")],
        [t("Meu sistema "), t("junta tudo num lugar só", {bold:true}), t(" e cria uma ")  , t("rastreabilidade completa", {bold:true}), t(": dá pra seguir cada carga de mandioca desde a entrada na balança até o produto final que sai vendido pro cliente.”")],
      ]),
      P([t("Pronto. Isso já mostra que você entende o "), t("problema real", {bold:true}), t(" e a "), t("solução", {bold:true}), t(". O resto é detalhe.")]),

      // ====== 2. O FLUXO (CORAÇÃO DO SISTEMA) ======
      H1("2. O Coração do Sistema — O Fluxo da Mandioca"),
      P([t("Esse é o ponto mais forte do seu TCC. A maioria dos trabalhos faz cadastros soltos. O SEU tem um "), t("fluxo conectado", {bold:true}), t(", onde cada etapa alimenta a próxima automaticamente. Saiba contar essa história:")]),
      num([t("Chega a mandioca", {bold:true}), t(" → o produtor traz a carga, e a "), t("Pesagem", {bold:true}), t(" registra peso bruto, desconta a tara (peso do caminhão) e a impureza.")]),
      num([t("Vai pro laboratório", {bold:true}), t(" → coletam de 2 a 4 amostras e medem a "), t("renda do amido", {bold:true}), t(" (quanto de fécula tem naquela mandioca). O sistema calcula a média e classifica: aprovado, aprovado com desconto, ou reprovado.")]),
      num([t("Calcula o pagamento sozinho", {bold:true}), t(" → com base na renda e no preço da tabela, o sistema já diz quanto pagar pro produtor. Sem conta manual.")]),
      num([t("Produção", {bold:true}), t(" → cria um "), t("Lote", {bold:true}), t(" que consome aquelas pesagens. Ao finalizar, o produto "), t("entra automaticamente no estoque", {bold:true}), t(".")]),
      num([t("Venda", {bold:true}), t(" → vende o produto, o estoque "), t("baixa sozinho", {bold:true}), t(" e gera uma conta a receber.")]),
      num([t("Financeiro", {bold:true}), t(" → a conta pode virar uma "), t("cobrança PIX ou Boleto de verdade", {bold:true}), t(", via integração com a ASAAS.")]),
      box("💡 FRASE DE EFEITO PRA BANCA", [
        [t("“Cada etapa conversa com a próxima. Quando o operador finaliza um lote, o estoque sobe sozinho. Quando o vendedor confirma uma venda, o estoque baixa e a conta a receber nasce automática. É um ")  , t("ciclo industrial fechado e rastreável", {bold:true}), t(".”")],
      ]),

      // ====== 3. O QUE MOSTRAR NA TELA ======
      H1("3. O Roteiro da Demonstração — O que clicar, na ordem"),
      P([t("Não saia clicando aleatório. Siga essa ordem que conta a história do fluxo. Se der tempo, mostre tudo; se apertar, mostre os "), t("marcados com ⭐", {bold:true}), t(".")]),
      H2("Antes de começar (faça em casa!)"),
      bullet([t("Ligue o PostgreSQL", {bold:true}), t(" (serviço postgresql-x64-17). Sem isso o backend não sobe.")]),
      bullet([t("Suba o backend", {bold:true}), t(" (botão Run na IDE ou o ícone SIGFEC na área de trabalho).")]),
      bullet([t("Suba o frontend", {bold:true}), t(" (npm run dev).")]),
      bullet([t("Deixe a tela de login já aberta no navegador.")]),
      bullet([t("Tenha alguns dados já cadastrados", {bold:true}), t(" (produtor, produto, uma pesagem) pra não perder tempo digitando na frente da banca.")]),
      H2("A demonstração (a ordem importa)"),
      num([t("⭐ Tela de Login", {bold:true}), t(" → mostra o visual, fala que tem autenticação por usuário e senha criptografada. Entra com admin.")]),
      num([t("⭐ Dashboard", {bold:true}), t(" → mostra os indicadores (entrada do dia, estoque, a receber). “Aqui o gestor vê tudo num relance.”")]),
      num([t("⭐ Cadastro de Parceiro", {bold:true}), t(" → cadastra um produtor. Mostra o CEP que preenche o endereço sozinho.")]),
      num([t("⭐ Pesagem", {bold:true}), t(" → registra uma carga. Mostra que o peso líquido e final são calculados automaticamente.")]),
      num([t("⭐ Laboratório", {bold:true}), t(" → faz a análise com as amostras. Mostra a renda média calculada e a classificação.")]),
      num([t("Volta na Pesagem", {bold:true}), t(" → mostra que o valor a pagar ao produtor JÁ apareceu sozinho.")]),
      num([t("⭐ Lote de Produção", {bold:true}), t(" → cria um lote usando a pesagem, finaliza, e ")  , t("mostra o estoque subindo", {bold:true}), t(".")]),
      num([t("⭐ Venda", {bold:true}), t(" → faz uma venda, confirma, e mostra o estoque baixando + a conta a receber criada.")]),
      num([t("⭐ Financeiro → Gerar PIX", {bold:true}), t(" → mostra o QR Code real sendo gerado pela ASAAS. Esse é o momento “uau”.")]),
      num([t("Extras (se sobrar tempo)", {bold:true}), t(": permissões por usuário, notificação de estoque baixo, tema claro/escuro.")]),

      new Paragraph({children:[new PageBreak()]}),

      // ====== 4. TECNOLOGIAS ======
      H1("4. As Tecnologias — Sem decoreba, entenda o papel de cada uma"),
      P([t("A banca vai perguntar “por que você usou X?”. Não basta saber o nome, saiba "), t("pra que serve", {bold:true}), t(". Pensa assim:")]),
      tab2(["Tecnologia","Pra que serve (explica fácil)"],[
        ["Java 21","A linguagem do backend (o cérebro do sistema, que roda no servidor)."],
        ["Spring Boot 4","O framework que monta o backend rápido. Cuida das requisições, segurança, banco."],
        ["PostgreSQL","O banco de dados. É onde TUDO fica guardado (parceiros, pesagens, vendas...)."],
        ["Hibernate / JPA","A ponte entre o código Java e o banco. Em vez de escrever SQL na mão, eu trabalho com objetos."],
        ["React 18","A biblioteca do frontend (as telas bonitas que o usuário vê e clica)."],
        ["Vite","A ferramenta que monta e serve o frontend rápido durante o desenvolvimento."],
        ["Tailwind CSS","O jeito de estilizar as telas (cores, espaçamento, layout) direto no código."],
        ["JWT","O “crachá digital”. Quando você loga, recebe um token que prova quem você é nas próximas telas."],
        ["BCrypt","Criptografa as senhas. Mesmo se vazar o banco, ninguém lê a senha real."],
        ["ASAAS","O gateway de pagamento. É quem gera o PIX e o boleto de verdade."],
        ["Docker","Empacota o sistema em “caixas” (containers) pra rodar igual em qualquer lugar."],
        ["Apache","O servidor web que entrega as telas e encaminha as requisições pro backend."],
      ]),
      box("🎤 SE PERGUNTAREM “POR QUE JAVA E NÃO OUTRA?”", [
        [t("“Escolhi Java com Spring Boot porque é "), t("muito usado no mercado", {bold:true}), t(", é robusto, tem ótima documentação e segurança madura. Pra um sistema empresarial que lida com dinheiro e dados de produtores, eu queria uma base confiável e que eu pudesse colocar no meu currículo.”")],
      ]),

      // ====== 5. ARQUITETURA ======
      H1("5. Como o Sistema é Montado (Arquitetura)"),
      P([t("Se perguntarem sobre arquitetura, a resposta curta é: ")  , t("frontend separado do backend, conversando por uma API REST", {bold:true}), t(".")]),
      bullet([t("Frontend (React)", {bold:true}), t(": as telas. Roda no navegador do usuário.")]),
      bullet([t("Backend (Spring Boot)", {bold:true}), t(": as regras de negócio. Roda no servidor.")]),
      bullet([t("Banco (PostgreSQL)", {bold:true}), t(": guarda os dados.")]),
      bullet([t("Eles conversam por ")  , t("API REST", {bold:true}), t(" (o frontend pede dados, o backend responde em JSON).")]),
      P([t("Dentro do backend eu organizei em "), t("camadas", {bold:true}), t(": o ")  , t("Controller", {bold:true}), t(" recebe a requisição, o "), t("Service", {bold:true}), t(" tem a regra de negócio, o "), t("Repository", {bold:true}), t(" fala com o banco. Isso deixa o código organizado e fácil de manter.")]),

      new Paragraph({children:[new PageBreak()]}),

      // ====== 6. PERGUNTAS ======
      H1("6. Preparação para Perguntas — As que mais caem"),
      P([t("Respira. Se não souber algo, seja honesto: “não implementei isso ainda, mas está nos planos pra entrega final”. Isso é melhor que inventar.")]),

      H2("🔹 “Por que esse tema? Por que uma fecularia?”"),
      box("Resposta", [
        "“É um setor real da minha região, com uma necessidade concreta que eu vi de perto. A fecularia tem um processo industrial rico (pesagem, laboratório, produção) que dá pra modelar bem, e não é um tema genérico tipo loja virtual.”"
      ], "F8FAFC", CINZA),

      H2("🔹 “Como você garante que o pagamento ao produtor está certo?”"),
      box("Resposta", [
        [t("“O cálculo é "), t("automático e baseado em fórmula fixa", {bold:true}), t(": pega o peso em toneladas, multiplica pela renda média do amido (medida no laboratório) e pelo preço vigente da tabela. Tira o erro humano da conta manual.”")]
      ], "F8FAFC", CINZA),

      H2("🔹 “O que é essa rastreabilidade que você fala?”"),
      box("Resposta", [
        [t("“Cada lote de produção guarda QUAIS pesagens ele consumiu. Então, se um cliente reclamar de um produto, eu consigo voltar no lote, ver de quais cargas ele veio, e de quais produtores. E uma pesagem já usada num lote fica "), t("travada", {bold:true}), t(", não pode ser reaproveitada.”")]
      ], "F8FAFC", CINZA),

      H2("🔹 “Por que separou frontend e backend?”"),
      box("Resposta", [
        "“Pra desacoplar. O backend é uma API que pode servir o site hoje e, no futuro, um app de celular sem reescrever a lógica. Além de ser o padrão do mercado atual.”"
      ], "F8FAFC", CINZA),

      H2("🔹 “Essa cobrança PIX é real ou simulada?”"),
      box("Resposta", [
        [t("“É integração real com a "), t("ASAAS", {bold:true}), t(", um gateway de pagamento de verdade. Estou usando o ambiente de testes (sandbox), mas a chamada é a mesma da produção. Inclusive tem "), t("webhook", {bold:true}), t(": quando o pagamento é confirmado, o sistema marca a conta como paga sozinho.”")]
      ], "F8FAFC", CINZA),

      H2("🔹 “Como é a segurança?”"),
      box("Resposta", [
        [t("“Três camadas: senhas criptografadas com "), t("BCrypt", {bold:true}), t("; autenticação por "), t("JWT", {bold:true}), t(" (token); e "), t("controle de permissões", {bold:true}), t(" — cada perfil (balança, laboratório, financeiro) vê só o que precisa, e dá pra liberar ou bloquear ações por usuário individualmente.”")]
      ], "F8FAFC", CINZA),

      H2("🔹 “Por que AuditLog não se liga a nada no diagrama?”"),
      box("Resposta", [
        [t("“É de propósito. O log de auditoria guarda o nome da entidade e o ID como texto, sem chave estrangeira. Assim, mesmo que eu apague uma venda, o registro de que ela existiu "), t("permanece", {bold:true}), t(" — que é exatamente o que se espera de uma trilha de auditoria.”")]
      ], "F8FAFC", CINZA),

      H2("🔹 “Tem teste automatizado?”"),
      box("Resposta (honesta)", [
        "“Ainda não em larga escala — é um dos pontos que vou desenvolver até a entrega final, principalmente nos cálculos críticos como renda média e custo do lote.”"
      ], "FEF2F2", "DC2626"),

      new Paragraph({children:[new PageBreak()]}),

      // ====== 7. O QUE MOSTRAR vs O QUE FALAR QUE VEM ======
      H1("7. O que JÁ está pronto (mostrar) vs O que VEM (entrega final)"),
      P([t("Deixe claro pra banca o que já funciona e o que é evolução planejada. Isso mostra maturidade.")]),
      H2("✅ Já está pronto (pode mostrar com confiança)"),
      bullet("Cadastros completos (parceiros, motoristas, veículos, produtos, usuários)."),
      bullet("Pesagem com cálculo automático."),
      bullet("Análise laboratorial multi-amostra com classificação."),
      bullet("Cálculo automático do pagamento ao produtor."),
      bullet("Lotes de produção com entrada automática no estoque."),
      bullet("Vendas com baixa de estoque e geração de conta a receber."),
      bullet("Financeiro com cobrança PIX/Boleto real (ASAAS)."),
      bullet("Controle de estoque com histórico (Kardex)."),
      bullet("Segurança (login, JWT, BCrypt, permissões por perfil)."),
      bullet("Trilha de auditoria, notificações, tema claro/escuro."),

      H2("🔜 Melhorias para a entrega final (fim do ano)"),
      tab2(["Melhoria","Por que vale a pena"],[
        ["Emissão de NFe","Gerar nota fiscal eletrônica de verdade na venda. É o gap mais “de negócio” que falta."],
        ["Testes automatizados","Garantir que os cálculos (renda, custo, peso) estão sempre corretos. Banca valoriza muito."],
        ["Relatórios em PDF","Hoje exporto CSV; quero gerar relatórios formatados em PDF (romaneio, posição de estoque)."],
        ["Telas de Kardex e Auditoria","O back-end já tem os dados; falta criar a tela bonita pra visualizar."],
        ["Fluxo de caixa projetado","Gráfico mostrando entradas e saídas futuras pra ajudar a decisão do gestor."],
        ["App mobile / PWA","Acessar pelo celular, principalmente na balança e no laboratório."],
        ["Recuperação de senha por e-mail","Hoje só o admin reseta; quero um fluxo de “esqueci minha senha”."],
      ]),
      box("🎤 COMO FECHAR A APRESENTAÇÃO", [
        [t("“O sistema já cobre o "), t("ciclo completo da fecularia", {bold:true}), t(", do recebimento da mandioca até a cobrança. Para a entrega final, meu foco é "), t("emissão de nota fiscal, testes automatizados e relatórios em PDF", {bold:true}), t(", deixando o sistema pronto pra uso real na empresa. Obrigado!”")],
      ]),

      new Paragraph({children:[new PageBreak()]}),

      // ====== 8. CHECKLIST + DICAS ======
      H1("8. Checklist do Dia + Dicas Finais"),
      H2("✅ Antes de sair de casa"),
      bullet("PostgreSQL ligado e testado."),
      bullet("Backend sobe sem erro (testa 1x antes)."),
      bullet("Frontend abre e o login funciona."),
      bullet("Dados de exemplo já cadastrados."),
      bullet("Notebook carregado + carregador na mochila."),
      bullet("Diagramas impressos ou no slide (classe, caso de uso, DER)."),
      bullet("Este guia lido pelo menos 2 vezes."),

      H2("💪 Dicas de postura"),
      bullet([t("Fale "), t("devagar", {bold:true}), t(". Nervoso acelera; force a calma.")]),
      bullet([t("Olhe pra banca, não só pra tela.")]),
      bullet([t("Se travar o sistema, mantenha a calma: “deixa eu mostrar por outro caminho”. Não entre em pânico.")]),
      bullet([t("Use as palavras certas: "), t("rastreabilidade, ciclo integrado, cálculo automático, API REST, camadas", {bold:true}), t(". Elas impressionam.")]),
      bullet([t("Se não souber: “boa pergunta, isso está no meu plano para a entrega final”. ")]),
      box("🍀 ÚLTIMA COISA", [
        [t("Você fez um sistema "), t("acima da média", {bold:true}), t(": tem domínio real, integração de pagamento de verdade e um ciclo completo conectado. Isso é mais do que muita gente entrega. "), t("Confia no seu trabalho. Boa sorte! 🚀", {bold:true})],
      ], "F0FDFA", TEAL),

    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("C:\\Users\\pedro\\OneDrive\\Área de Trabalho\\GUIA_APRESENTACAO_TCC.docx", buf);
  console.log("OK gerado");
});

/**
 * SIGFEC — popula o sistema com dados fictícios e realistas (região de Loanda/PR) para demonstração.
 *
 * Uso (backend rodando em http://localhost:8080):
 *   node scripts/popular-dados.mjs --limpar     apaga os dados cadastrados e popula de novo
 *   node scripts/popular-dados.mjs              só popula (banco já vazio)
 *
 * Mantém: estados, cidades (IBGE), catálogo de produtos e o usuário admin.
 * Tudo é criado pela própria API (regras de negócio, Kardex, contas a pagar/receber); no fim,
 * um SQL ajusta as datas de sistema (laudos, títulos, Kardex) para o histórico dos últimos 3 meses.
 *
 * Usuários de teste criados (senha de todos: Sigfec@2026):
 *   balanca.marcos (BALANCA) · lab.fernanda (LABORATORIO) · producao.ricardo (PRODUCAO) · financeiro.patricia (FINANCEIRO)
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const API = process.env.SIGFEC_API || 'http://localhost:8080/api';
const PSQL = process.env.PSQL || 'C:/Program Files/PostgreSQL/17/bin/psql.exe';
const PG = { user: 'postgres', host: 'localhost', db: 'sigfec_db', pass: process.env.PGPASSWORD || 'root' };
const SENHA_TESTE = 'Sigfec@2026';
const ADMIN = { login: 'admin', senha: process.env.SIGFEC_ADMIN_SENHA || 'admin' };

// ---------- utilitários ----------
let seed = 20261103; // PRNG determinístico: sempre os mesmos dados
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const entre = (a, b) => a + rnd() * (b - a);
const inteiro = (a, b) => Math.floor(entre(a, b + 1));
const escolher = (arr) => arr[Math.floor(rnd() * arr.length)];
const r2 = (v) => Math.round(v * 100) / 100;

const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
const dia = (offset) => { const d = new Date(hoje); d.setDate(d.getDate() + offset); return d; };
const iso = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const isoHora = (d, h, m = 0) => `${iso(d)}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
const ehDomingo = (d) => d.getDay() === 0;

function cpf() {
  const n = Array.from({ length: 9 }, () => inteiro(0, 9));
  for (const len of [9, 10]) {
    const s = n.slice(0, len).reduce((acc, v, i) => acc + v * (len + 1 - i), 0);
    const dv = (s * 10) % 11 % 10; n.push(dv);
  }
  const t = n.join('');
  return `${t.slice(0, 3)}.${t.slice(3, 6)}.${t.slice(6, 9)}-${t.slice(9)}`;
}
function cnpj() {
  const n = [...Array.from({ length: 8 }, () => inteiro(0, 9)), 0, 0, 0, 1];
  for (const pesos of [[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]]) {
    const s = pesos.reduce((acc, p, i) => acc + p * n[i], 0);
    const r = s % 11; n.push(r < 2 ? 0 : 11 - r);
  }
  const t = n.join('');
  return `${t.slice(0, 2)}.${t.slice(2, 5)}.${t.slice(5, 8)}/${t.slice(8, 12)}-${t.slice(12)}`;
}
const fone = () => `(44) 9${inteiro(8800, 9999)}-${inteiro(1000, 9999)}`;

let token = '';
async function api(metodo, caminho, corpo) {
  const res = await fetch(API + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await res.text();
  const dados = texto ? (() => { try { return JSON.parse(texto); } catch { return texto; } })() : null;
  if (!res.ok) throw new Error(`${metodo} ${caminho} → ${res.status}: ${dados?.error || texto}`);
  return dados;
}
function sql(comandos) {
  const arq = join(tmpdir(), `sigfec-popular-${Date.now()}.sql`);
  writeFileSync(arq, comandos, 'utf8');
  execFileSync(PSQL, ['-U', PG.user, '-h', PG.host, '-d', PG.db, '-v', 'ON_ERROR_STOP=1', '-q', '-f', arq],
    { env: { ...process.env, PGPASSWORD: PG.pass, PGCLIENTENCODING: 'UTF8' }, stdio: ['ignore', 'ignore', 'inherit'] });
}
const passo = (t) => console.log(`• ${t}`);

// ---------- limpeza ----------
const LIMPAR = `
BEGIN;
TRUNCATE amostra, analise_qualidade, checklist_carga, entrada_fila, item_venda, venda,
         lote_pesagem, lote_producao, movimentacao_estoque, estoque, pesagem,
         titulo_financeiro, tabela_preco, audit_log, veiculo RESTART IDENTITY;
DELETE FROM motorista;
DELETE FROM parceiro;
DELETE FROM usuario WHERE login <> 'admin';
DELETE FROM pessoa WHERE id NOT IN (SELECT pessoa_id FROM usuario);
COMMIT;`;

// ---------- dados-base (fictícios) ----------
const PRODUTORES = [
  ['Antônio Carlos Bortolotto', 'Loanda', 'Estrada Rural Água do Bugre', 'Zona Rural'],
  ['Maria Aparecida Zanatta', 'Santa Isabel do Ivaí', 'Estrada do Ribeirão Esperança', 'Zona Rural'],
  ['José Roberto Pelizzari', 'Querência do Norte', 'Estrada Porto Natal', 'Zona Rural'],
  ['Luiz Fernando Gasparotto', 'Nova Londrina', 'Estrada da Gleba Pinhalzinho', 'Zona Rural'],
  ['Sebastião Ferreira Lima', 'Loanda', 'Estrada Água da Onça', 'Zona Rural'],
  ['Cláudia Regina Tonin', 'Marilena', 'Estrada Gleba Nova', 'Zona Rural'],
  ['Valdir Antônio Rigon', 'Santa Cruz de Monte Castelo', 'Estrada do Ribeirão Areia', 'Zona Rural'],
  ['Osvaldo Benedito Costa', 'São Pedro do Paraná', 'Estrada Porto São José', 'Zona Rural'],
  ['Rosângela Martins Dal Bem', 'Planaltina do Paraná', 'Estrada Água Vermelha', 'Zona Rural'],
  ['Ademir José Fabris', 'Loanda', 'Estrada Gleba Três Barras', 'Zona Rural'],
];
const CLIENTES = [
  ['Panificadora Bom Grão Ltda', 'Maringá', 'Av. Colombo', 'Zona 7'],
  ['Distribuidora Ivaí Alimentos Ltda', 'Londrina', 'Rua Pernambuco', 'Centro'],
  ['Indústria de Biscoitos Sabor do Campo Ltda', 'Apucarana', 'Rua Osvaldo Cruz', 'Jardim Ponta Grossa'],
  ['Comercial Noroeste de Cereais Ltda', 'Umuarama', 'Av. Paraná', 'Zona I'],
  ['Têxtil Fios do Norte Ltda', 'Cianorte', 'Av. Santa Catarina', 'Zona 2'],
  ['Laticínios Vale Verde Ltda', 'Paranavaí', 'Rua Getúlio Vargas', 'Centro'],
];
const FORNECEDORES = [
  ['Reflorestadora Lenha Boa Ltda', 'Loanda', 'Rodovia PR-182', 'Distrito Industrial', 'Lenha de eucalipto para a fornalha', 16800],
  ['Sacaria Paraná Embalagens Ltda', 'Paranavaí', 'Rua das Indústrias', 'Parque Industrial', 'Sacaria de 25 kg', 6450],
  ['Transportes Rodonoroeste Ltda', 'Loanda', 'Av. Brasil', 'Centro', 'Frete de expedição', 4300],
];
const MOTORISTAS = [
  ['Carlos Eduardo Montanari', 'E', 900], ['Paulo Sérgio Andrade', 'E', 700], ['Rogério Aparecido Silva', 'D', 15],
  ['Marcelo Henrique Bueno', 'E', 1200], ['Edson Luiz Pereira', 'C', 400], ['Juliano César Moretti', 'E', 650],
  ['Alessandro Ribeiro Souza', 'D', 1500], ['Wagner Luís Teixeira', 'E', 300],
];
const VEICULOS = [ // placa, marca, modelo, tipo, eixos, tara (kg), capacidade (kg)
  ['AYK4F21', 'Mercedes-Benz', 'Atego 2426', 'Truck', 3, 9200, 14000],
  ['BDQ7C58', 'Volvo', 'FH 540', 'Bitrem', 7, 19800, 37000],
  ['ATW2H93', 'Scania', 'R 450', 'Carreta', 5, 15100, 30000],
  ['BEJ1A47', 'Volkswagen', 'Constellation 24.280', 'Truck', 3, 9600, 14500],
  ['AXL8D36', 'Mercedes-Benz', 'Axor 2544', 'Carreta', 5, 14800, 29000],
  ['BCF5G12', 'Iveco', 'Tector 240E28', 'Truck', 3, 9100, 13500],
  ['AZP3E64', 'Volvo', 'VM 330', 'Truck', 3, 9900, 15000],
  ['BFA9B80', 'Scania', 'G 410', 'Carreta', 5, 15400, 30500],
];
const USUARIOS = [
  ['Marcos Vinícius Arruda', 'balanca.marcos', 'BALANCA'],
  ['Fernanda Lopes Cardoso', 'lab.fernanda', 'LABORATORIO'],
  ['Ricardo Augusto Menegatti', 'producao.ricardo', 'PRODUCAO'],
  ['Patrícia Helena Ventura', 'financeiro.patricia', 'FINANCEIRO'],
];

async function main() {
  const limpar = process.argv.includes('--limpar');
  const login = await api('POST', '/usuarios/login', ADMIN);
  token = login.token;

  if (limpar) { passo('apagando dados cadastrados'); sql(LIMPAR); }
  const existentes = await api('GET', '/pesagens');
  if (existentes.length) throw new Error('O banco já tem pesagens. Rode com --limpar para recomeçar.');

  const produtos = await api('GET', '/produtos');
  const prod = (cat) => produtos.find((p) => p.categoria === cat);
  const MANDIOCA = prod('MANDIOCA'), FECULA = prod('FECULA'), P_DOCE = prod('POLVILHO_DOCE'),
    P_AZEDO = prod('POLVILHO_AZEDO_GRANULADO'), TAPIOCA = prod('TAPIOCA'),
    P_PO = prod('POLVILHO_AZEDO_PO'), DEXTRINA = prod('DEXTRINA');
  const cidades = await api('GET', '/cidades/estado/PR');
  const cidade = (nome) => {
    const c = cidades.find((x) => x.nome.toLowerCase() === nome.toLowerCase());
    if (!c) throw new Error('Cidade não encontrada: ' + nome);
    return { id: c.id };
  };
  const ajustes = []; // SQL de datas no fim

  // ----- usuários -----
  passo('usuários de teste');
  for (const [nome, lg, perfil] of USUARIOS) {
    await api('POST', '/usuarios', { nome, login: lg, senha: SENHA_TESTE, perfilAcesso: perfil, statusAtivo: true,
      email: `${lg.split('.')[1]}@fecularialoanda.com.br`, documento: cpf(), telefone: fone() });
  }

  // ----- parceiros -----
  passo('parceiros (10 produtores, 6 clientes, 3 fornecedores)');
  const novoParceiro = (nome, tipo, [cid, rua, bairro], doc, extra = {}) => api('POST', '/parceiros', {
    nome, tipoParceiro: tipo, documento: doc, telefone: fone(),
    email: nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[^a-z]/g, '') + inteiro(10, 99) + '@email.com',
    endereco: { logradouro: rua, numero: String(inteiro(10, 2500)), bairro, cep: `87${inteiro(700, 999)}-${inteiro(100, 999)}`, cidade: cidade(cid) },
    ...extra,
  });
  const produtores = [];
  for (const [nome, cid, rua, bairro] of PRODUTORES) {
    produtores.push(await novoParceiro(nome, 'PRODUTOR', [cid, rua, bairro], cpf(), { inscricaoEstadual: String(inteiro(1e9, 9e9)) }));
  }
  const clientes = [];
  for (const [nome, cid, rua, bairro] of CLIENTES) {
    clientes.push(await novoParceiro(nome, 'CLIENTE', [cid, rua, bairro], cnpj(),
      { inscricaoEstadual: String(inteiro(1e9, 9e9)), limiteCredito: inteiro(8, 20) * 10000 }));
  }
  const fornecedores = [];
  for (const [nome, cid, rua, bairro, desc, valor] of FORNECEDORES) {
    fornecedores.push({ ...(await novoParceiro(nome, 'FORNECEDOR', [cid, rua, bairro], cnpj())), desc, valor });
  }

  // ----- motoristas e veículos -----
  passo('8 motoristas e 8 veículos');
  const motoristas = [];
  for (const [nome, cat, diasCnh] of MOTORISTAS) {
    motoristas.push(await api('POST', '/motoristas', { nome, documento: cpf(), telefone: fone(),
      cnh: String(inteiro(1e10, 9e10)), categoriaCnh: cat, validadeCnh: iso(dia(diasCnh)), statusAtivo: true }));
  }
  const veiculos = [];
  for (let i = 0; i < VEICULOS.length; i++) {
    const [placa, marca, modelo, tipo, eixos, tara, cap] = VEICULOS[i];
    veiculos.push(await api('POST', '/veiculos', { placa, marca, modelo, tipoVeiculo: tipo, eixos, tara, capacidadeKg: cap,
      statusAtivo: true, dataLicenciamento: iso(dia(-inteiro(30, 300))), motorista: { id: motoristas[i].id } }));
  }

  // ----- preço da mandioca (R$ por tonelada × grama de renda) -----
  passo('tabela de preço da mandioca');
  await api('POST', '/tabelas-preco', { produto: { id: MANDIOCA.id }, dataInicio: iso(dia(-120)), valor: 1.55,
    observacao: 'Referência de mercado: ~R$ 850/t para renda de 550 g' });

  // ----- recebimento: pesagens dos últimos 75 dias -----
  passo('pesagens históricas e laudos do laboratório');
  const cargas = [];
  for (let d = -75; d <= -1; d++) {
    const data = dia(d);
    if (ehDomingo(data) || rnd() < 0.35) continue;
    const n = rnd() < 0.3 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const v = escolher(veiculos);
      const capCarga = v.capacidadeKg - 1000;
      const liquido = Math.round(entre(capCarga * 0.7, capCarga) / 10) * 10;
      const pes = await api('POST', '/pesagens', {
        produtor: { id: escolher(produtores).id }, produto: { id: MANDIOCA.id }, veiculo: { id: v.id },
        pesoBruto: v.tara + liquido, pesoTara: v.tara, percentualImpureza: r2(entre(2, 7.5)),
        dataHoraEntrada: isoHora(data, inteiro(6, 16), inteiro(0, 59)),
      });
      cargas.push({ ...pes, data, d });
    }
  }

  // Laudos: todas menos as 3 mais recentes (aguardando laboratório). 2 reprovadas, ~25% com desconto.
  const comLaudo = cargas.slice(0, -3);
  const reprovadas = new Set([inteiro(5, 15), inteiro(25, comLaudo.length - 5)]);
  for (let i = 0; i < comLaudo.length; i++) {
    const c = comLaudo[i];
    const base = reprovadas.has(i) ? entre(290, 340) : rnd() < 0.25 ? entre(400, 495) : entre(510, 640);
    const ton = Number(c.pesoLiquido) / 1000;
    const nAm = ton > 15 ? (rnd() < 0.5 ? 3 : 4) : 2;
    const amostras = Array.from({ length: nAm }, (_, j) => ({ numeroAmostra: j + 1, rendaGramas: r2(base + entre(-18, 18)) }));
    const an = await api('POST', `/laboratorio/pesagem/${c.id}`, {
      amostras, umidade: r2(entre(11.5, 14)), ph: r2(entre(4.6, 6.2)), acidez: r2(entre(1.2, 3.4)),
      granulometria: escolher([80, 100, 120]), cor: escolher(['Branca', 'Branca', 'Levemente creme']),
      metodoSecagem: escolher(['AUTOMATIZADA', 'AUTOMATIZADA', 'SOLAR']),
      observacao: reprovadas.has(i) ? 'Raízes com fibrosidade alta; renda abaixo do mínimo.' : null,
    });
    c.analiseId = an.id; c.status = an.statusQualidade;
    const laudo = new Date(c.data); laudo.setDate(laudo.getDate() + (rnd() < 0.7 ? 0 : 1));
    c.dataLaudo = laudo;
    ajustes.push(`UPDATE analise_qualidade SET data_criacao='${isoHora(laudo, inteiro(14, 18), inteiro(0, 59))}', data_atualizacao=data_criacao WHERE id=${an.id};`);
    ajustes.push(`UPDATE titulo_financeiro SET data_emissao='${iso(laudo)}', data_vencimento='${iso(new Date(+laudo + 7 * 864e5))}', data_criacao='${isoHora(laudo, 18)}' WHERE descricao='Pagamento ao produtor - pesagem #${c.id}';`);
  }

  // ----- produção: lotes semanais com as cargas aprovadas -----
  passo('lotes de produção (entrada no estoque via Kardex)');
  const aprovadas = comLaudo.filter((c) => c.status !== 'REPROVADO');
  const ROTACAO = [FECULA, P_DOCE, FECULA, P_AZEDO, DEXTRINA, FECULA, TAPIOCA, P_PO, FECULA, P_DOCE, FECULA];
  const lotes = [];
  for (let i = 0, l = 0; i < aprovadas.length; l++) {
    const grupo = aprovadas.slice(i, i + inteiro(3, 5)); i += grupo.length;
    const produto = ROTACAO[l % ROTACAO.length];
    const kgEntrada = grupo.reduce((s, c) => s + Number(c.pesoFinal), 0);
    const fator = produto.categoria === 'FECULA' ? entre(0.245, 0.27) : produto.categoria === 'TAPIOCA' ? entre(0.2, 0.23) : entre(0.22, 0.25);
    const sacos = Math.round((kgEntrada * fator) / 25);
    const ultima = grupo[grupo.length - 1].dataLaudo;
    const fab = new Date(ultima); fab.setDate(fab.getDate() + 2);
    if (fab > hoje) fab.setTime(+hoje);
    const lote = await api('POST', '/lotes', { produto: { id: produto.id }, quantidadeProduzida: sacos, dataFabricacao: iso(fab),
      usuarioResponsavel: 'producao.ricardo', pesagensConsumidas: grupo.map((c) => ({ id: c.id })) });
    lotes.push({ ...lote, fab, produto });
  }
  // todos finalizados menos o mais recente (em produção); os mais antigos expedidos
  for (let i = 0; i < lotes.length - 1; i++) {
    const lt = lotes[i];
    await api('PATCH', `/lotes/${lt.id}/status`, { status: 'FINALIZADO' });
    ajustes.push(`UPDATE movimentacao_estoque SET data_hora='${isoHora(lt.fab, 17)}' WHERE origem_tipo='LOTE' AND origem_id=${lt.id};`);
    if (i < Math.floor(lotes.length * 0.3)) await api('PATCH', `/lotes/${lt.id}/status`, { status: 'EXPEDIDO' });
  }

  // ----- vendas -----
  passo('vendas, notas e contas a receber');
  const estoque = await api('GET', '/estoque');
  const saldo = Object.fromEntries(estoque.map((e) => [e.produto.id, e.quantidadeAtual]));
  const PRECO = { [FECULA.id]: 98, [P_DOCE.id]: 112, [P_AZEDO.id]: 126, [TAPIOCA.id]: 154, [P_PO.id]: 131, [DEXTRINA.id]: 189 };
  const vendas = [];
  for (let d = -60; d <= -2; d += inteiro(3, 6)) {
    const data = dia(d);
    const itens = [];
    for (const p of [FECULA, rnd() < 0.5 ? escolher([P_DOCE, P_AZEDO, TAPIOCA, P_PO, DEXTRINA]) : null].filter(Boolean)) {
      const qtd = Math.min(Math.round(entre(120, 520) / 10) * 10, Math.floor((saldo[p.id] || 0) * 0.6));
      if (qtd >= 40) { itens.push({ produto: { id: p.id }, quantidade: qtd, valorUnitario: r2(PRECO[p.id] * entre(0.96, 1.05)) }); saldo[p.id] -= qtd; }
    }
    if (!itens.length) continue;
    const v = await api('POST', '/vendas', { cliente: { id: escolher(clientes).id }, dataVenda: iso(data), itens,
      observacao: 'Entrega CIF — frete por conta da fecularia' });
    vendas.push({ ...v, data });
  }
  for (let i = 0; i < vendas.length; i++) {
    const v = vendas[i];
    if (i === vendas.length - 1 || i === vendas.length - 3) continue; // 2 orçamentos em aberto
    await api('PATCH', `/vendas/${v.id}/confirmar`);
    ajustes.push(`UPDATE titulo_financeiro SET data_emissao='${iso(v.data)}', data_vencimento='${iso(new Date(+v.data + 28 * 864e5))}', data_criacao='${isoHora(v.data, 11)}' WHERE descricao='Venda #${v.id}';`);
    ajustes.push(`UPDATE movimentacao_estoque SET data_hora='${isoHora(v.data, 10)}' WHERE origem_tipo='VENDA' AND origem_id=${v.id};`);
    if (i === 4) { await api('PATCH', `/vendas/${v.id}/cancelar`); continue; } // 1 cancelada (estoque devolvido)
    if (i < vendas.length - 4) await api('PATCH', `/vendas/${v.id}/faturar`);
  }

  // ----- contas a pagar de fornecedores (3 meses) -----
  passo('contas a pagar de fornecedores');
  for (const f of fornecedores) {
    for (const mes of [-2, -1, 0]) {
      const venc = new Date(hoje.getFullYear(), hoje.getMonth() + mes, 10);
      await api('POST', '/financeiro/pagar', { fornecedor: { id: f.id }, valorOriginal: r2(f.valor * entre(0.92, 1.08)),
        dataEmissao: iso(new Date(+venc - 20 * 864e5)), dataVencimento: iso(venc), descricao: `${f.desc} — ${venc.toLocaleDateString('pt-BR', { month: 'long' })}` });
    }
  }

  passo('ajustando datas do histórico');
  ajustes.push(`UPDATE estoque e SET ultima_atualizacao=(SELECT max(data_hora) FROM movimentacao_estoque m WHERE m.produto_id=e.produto_id);`);
  sql(ajustes.join('\n'));

  // ----- baixas: o que venceu é pago, menos 2 títulos de cada lado (atrasados) -----
  passo('baixas (pagamentos e recebimentos)');
  const titulos = await api('GET', '/financeiro');
  const vencidos = titulos.filter((t) => t.statusFinanceiro !== 'CANCELADO' && t.dataVencimento < iso(hoje))
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  const deixarAtrasado = new Set(vencidos.filter((t) => t.cliente).slice(-2).map((t) => t.id)
    .concat(vencidos.filter((t) => t.fornecedor && t.descricao?.startsWith('Pagamento')).slice(-1).map((t) => t.id)));
  for (const t of vencidos) {
    if (deixarAtrasado.has(t.id)) continue;
    const pago = new Date(t.dataVencimento + 'T00:00:00'); pago.setDate(pago.getDate() - inteiro(0, 2));
    await api('PATCH', `/financeiro/${t.id}/baixar`, { valorPago: t.valorOriginal, dataPagamento: iso(pago),
      formaPagamento: t.cliente ? escolher(['PIX', 'BOLETO', 'TRANSFERENCIA']) : escolher(['PIX', 'TRANSFERENCIA']) });
  }
  // um recebimento parcial para mostrar a baixa parcial somando
  const aberto = titulos.find((t) => t.cliente && t.statusFinanceiro === 'ABERTO' && t.dataVencimento >= iso(hoje));
  if (aberto) await api('PATCH', `/financeiro/${aberto.id}/baixar`, { valorPago: r2(aberto.valorOriginal * 0.4), dataPagamento: iso(dia(-1)), formaPagamento: 'PIX' });

  // ----- estoque mínimo (gera alerta em 1 produto) -----
  for (const e of await api('GET', '/estoque')) {
    const min = e.produto.categoria === 'TAPIOCA' ? Math.ceil(e.quantidadeAtual * 1.3) : Math.round(e.quantidadeAtual * 0.35);
    await api('PUT', `/estoque/${e.id}`, { quantidadeMinima: Math.max(min, 50) });
  }

  // ----- fila de hoje: um retrato do pátio em funcionamento -----
  passo('fila do pátio de hoje');
  const ok = { semVestigiosToxicos: true, higieneLimpeza: true, estruturaConservada: true, lonaCordaOk: true, ausenciaPragas: true,
    secosSemOdor: true, forroOk: true, sacariaLimpa: true, sacariaSemAvaria: true, lonasAdequadas: true };
  const chegada = (i, prod, obs) => api('POST', '/fila', { veiculoId: veiculos[i].id, motoristaId: motoristas[i].id, produtorId: produtores[prod].id, observacao: obs });
  const pesarDaFila = async (e, i, prod) => {
    const v = veiculos[i]; const liquido = Math.round(entre((v.capacidadeKg - 1000) * 0.75, v.capacidadeKg - 1000) / 10) * 10;
    await api('POST', `/pesagens?entradaFila=${e.id}`, { produtor: { id: produtores[prod].id }, produto: { id: MANDIOCA.id }, veiculo: { id: v.id },
      pesoBruto: v.tara + liquido, pesoTara: v.tara, percentualImpureza: r2(entre(2.5, 6)) });
  };
  // 2 já pesadas
  for (const [i, p] of [[0, 1], [5, 4]]) {
    const e = await chegada(i, p);
    await api('PUT', `/checklists/entrada/${e.id}`, ok);
    await api('POST', `/fila/${e.id}/chamar`, { local: 'Balança 1' });
    await api('POST', `/fila/${e.id}/atender`);
    await pesarDaFila(e, i, p);
  }
  // 1 cancelada (checklist reprovado)
  const canc = await chegada(3, 7);
  await api('PUT', `/checklists/entrada/${canc.id}`, { ...ok, ausenciaPragas: false, observacao: 'Presença de insetos na carroceria.' });
  await api('POST', `/fila/${canc.id}/cancelar`, { motivo: 'Checklist reprovado: carroceria com pragas. Orientado a higienizar e voltar.' });
  // em atendimento, chamado, aguardando (apto) e aguardando (checklist pendente)
  const emAt = await chegada(1, 2); await api('PUT', `/checklists/entrada/${emAt.id}`, ok);
  await api('POST', `/fila/${emAt.id}/chamar`, { local: 'Balança 1' }); await api('POST', `/fila/${emAt.id}/atender`);
  const cham = await chegada(2, 6); await api('PUT', `/checklists/entrada/${cham.id}`, ok);
  await api('POST', `/fila/${cham.id}/chamar`, { local: 'Balança 2' });
  const apto = await chegada(6, 9, 'Carga colhida ontem à tarde'); await api('PUT', `/checklists/entrada/${apto.id}`, ok);
  await chegada(7, 0);
  // horários de chegada realistas (manhã de hoje), para o tempo de espera do relatório
  sql(`UPDATE entrada_fila SET data_hora_entrada = date_trunc('day', now()) + interval '6 hours 40 minutes' + (id * interval '23 minutes'),
         data_hora_chamada = CASE WHEN data_hora_chamada IS NULL THEN NULL ELSE date_trunc('day', now()) + interval '6 hours 40 minutes' + (id * interval '23 minutes') + interval '18 minutes' END
       WHERE data_referencia = current_date;`);

  // ----- resumo -----
  const resumo = {
    produtores: produtores.length, clientes: clientes.length, fornecedores: fornecedores.length, motoristas: motoristas.length,
    veiculos: veiculos.length, pesagens: cargas.length + 2, laudos: comLaudo.length, lotes: lotes.length, vendas: vendas.length,
    titulos: (await api('GET', '/financeiro')).length, senhasFilaHoje: 7,
  };
  console.log('\nPronto:', resumo);
}

main().catch((e) => { console.error('\nERRO:', e.message); process.exit(1); });

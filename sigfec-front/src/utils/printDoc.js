/**
 * Documentos impressos do SIGFEC (ticket, romaneio, nota, comprovante, laudo e relatórios).
 *
 * Na tela, o documento aparece como uma folha A4 real sobre fundo cinza, com uma barra de ações
 * (Imprimir / Salvar PDF). Na impressão sai só a folha. Se o navegador bloquear a janela nova,
 * a pré-visualização abre por cima do próprio sistema — o usuário nunca fica sem o documento.
 */
import { UNIDADES } from './unidades.js';
import { formaLabel, resumoPagamento } from './formasPagamento.js';
import { empresa } from './configPublica.js';

// ===================== formatação =====================
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, dec = 2) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtMoney = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const fmtKg = (v) => (v != null ? `${num(v, 2)} kg` : '—');
/** AAAA-MM-DD é data local (sem fuso); datas com hora vêm do servidor já em horário local. */
const paraData = (v) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? `${v}T00:00:00` : v);
const fmtData = (v) => (v ? paraData(v).toLocaleDateString('pt-BR') : '—');
const fmtDataHora = (v) => (v ? paraData(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const agora = () => new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const numeroDoc = (n) => String(n ?? 0).padStart(6, '0');
const STATUS_COR = {
  APROVADO: '#047857', APROVADO_COM_DESCONTO: '#b45309', REPROVADO: '#b91c1c', AGUARDANDO_ANALISE: '#475569',
  FATURADA: '#047857', CONFIRMADA: '#1d4ed8', ORCAMENTO: '#475569', CANCELADA: '#b91c1c',
  PAGO: '#047857', ABERTO: '#1d4ed8', ATRASADO: '#b91c1c', CANCELADO: '#64748b',
};
const rotulo = (s) => (s ? String(s).replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) : '—');
const selo = (status) => `<span class="selo" style="--c:${STATUS_COR[status] || '#475569'}">${esc(rotulo(status))}</span>`;
const enderecoTexto = (e) => {
  if (!e) return '—';
  const cidade = e.cidade ? `${e.cidade.nome}${e.cidade.estado?.sigla ? '/' + e.cidade.estado.sigla : ''}` : '';
  return [[e.logradouro, e.numero].filter(Boolean).join(', '), e.bairro, cidade, e.cep ? 'CEP ' + e.cep : '']
    .filter(Boolean).join(' — ') || '—';
};

// ===================== blocos =====================
const LOGO = `
  <svg width="46" height="46" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z" fill="#0f9d74"/>
    <path d="M40 22 C 40 18, 36 17, 32 17 C 27 17, 23 19, 23 24 C 23 28, 27 29, 32 30 C 37 31, 41 32, 41 37 C 41 43, 35 46, 30 46 C 25 46, 22 44, 22 41" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/>
    <circle cx="47" cy="17" r="2.6" fill="#fef3c7"/>
  </svg>`;

/** Cabeçalho: empresa à esquerda; tipo, número e data do documento à direita. */
const cabecalho = ({ tipo, numero, data, extra = '' }) => `
  <header class="cab">
    <div class="empresa">
      ${LOGO}
      <div>
        <strong>${esc(empresa().nome)}</strong>
        <span>${esc([empresa().cnpj && 'CNPJ ' + empresa().cnpj, empresa().cidade].filter(Boolean).join(' · '))}</span>
        ${empresa().endereco || empresa().telefone
          ? `<small>${esc([empresa().endereco, empresa().telefone].filter(Boolean).join(' · '))}</small>`
          : '<small>SIGFEC · Sistema Integrado de Gestão para Fecularia</small>'}
      </div>
    </div>
    <div class="doc">
      <span class="tipo">${esc(tipo)}</span>
      ${numero != null ? `<strong class="numero${String(numero).length > 14 ? ' texto' : ''}">${esc(numero)}</strong>` : ''}
      ${data ? `<span class="data">${esc(data)}</span>` : ''}
      ${extra}
    </div>
  </header>`;

/** Grade de campos com borda (estilo formulário). `largo` ocupa a linha inteira. */
const campos = (titulo, lista) => `
  <section class="bloco">
    ${titulo ? `<h2>${esc(titulo)}</h2>` : ''}
    <div class="campos">
      ${lista.map((c) => `<div class="campo${c.largo ? ' largo' : ''}"><label>${esc(c.label)}</label><div>${c.html ?? esc(c.valor ?? '—')}</div></div>`).join('')}
    </div>
  </section>`;

/** Tabela. Colunas: { titulo, alinhar: 'dir'|'centro', fixo: true (não quebra) }. */
const tabela = (titulo, colunas, linhas, rodape) => `
  <section class="bloco">
    ${titulo ? `<h2>${esc(titulo)}</h2>` : ''}
    <div class="rolagem"><table>
      <thead><tr>${colunas.map((c) => `<th class="${c.alinhar || ''}">${esc(c.titulo)}</th>`).join('')}</tr></thead>
      <tbody>
        ${linhas.length ? linhas.map((l) => `<tr>${l.map((v, i) => `<td class="${colunas[i].alinhar || ''}${colunas[i].fixo ? ' fixo' : ''}">${v}</td>`).join('')}</tr>`).join('')
          : `<tr><td colspan="${colunas.length}" class="vazio">Nenhum registro.</td></tr>`}
      </tbody>
      ${rodape ? `<tfoot><tr>${rodape.map((v, i) => `<td class="${colunas[i].alinhar || ''} fixo">${v ?? ''}</td>`).join('')}</tr></tfoot>` : ''}
    </table></div>
  </section>`;

/** Quadro de totais: linhas { rotulo, valor, destaque }. */
const totais = (linhas, cor) => `
  <div class="totais"${cor ? ` style="--c:${cor}"` : ''}>
    ${linhas.map((l) => `<div class="linha${l.destaque ? ' destaque' : ''}"><span>${esc(l.rotulo)}</span><span>${l.valor}</span></div>`).join('')}
  </div>`;

/** Cartões de indicadores no topo (relatórios). */
const indicadores = (lista) => `
  <div class="indicadores">
    ${lista.map((i) => `<div class="ind"><label>${esc(i.rotulo)}</label><strong>${esc(i.valor)}</strong></div>`).join('')}
  </div>`;

const assinaturas = (nomes) => `
  <div class="assinaturas">${nomes.map((n) => `<div><span></span><label>${esc(n)}</label></div>`).join('')}</div>`;

const rodape = (texto) => `<footer class="rod">${texto}<br>Emitido pelo SIGFEC em ${esc(agora())}</footer>`;

// ===================== estilo da folha =====================
const CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { background: #d9dee5; font-family: 'Segoe UI', Roboto, system-ui, sans-serif; color: #0f172a; font-size: 13px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .barra { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 12px; padding: 12px 20px; background: #0f172a; color: #e2e8f0; box-shadow: 0 2px 10px rgba(0,0,0,.25); }
  .barra .titulo { font-weight: 700; font-size: 15px; }
  .barra .dica { font-size: 12px; color: #94a3b8; margin-right: auto; }
  .barra button { font: inherit; font-size: 14px; font-weight: 700; padding: 10px 18px; border-radius: 8px; border: 0; cursor: pointer; }
  .barra .imprimir { background: #10b981; color: #fff; } .barra .imprimir:hover { background: #059669; }
  .barra .fechar { background: #334155; color: #e2e8f0; } .barra .fechar:hover { background: #475569; }
  .folha { position: relative; background: #fff; margin: 24px auto 40px; padding: 16mm 15mm; box-shadow: 0 6px 30px rgba(15,23,42,.18); border-radius: 4px; overflow: hidden; }
  .folha.retrato { width: 210mm; min-height: 297mm; }
  .folha.paisagem { width: 297mm; min-height: 210mm; }
  .marca { position: absolute; top: 45%; left: 50%; transform: translate(-50%,-50%) rotate(-28deg); font-size: 64px; font-weight: 900; color: rgba(185,28,28,.07); white-space: nowrap; pointer-events: none; letter-spacing: 6px; }
  .cab { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-bottom: 14px; border-bottom: 3px solid #0f9d74; margin-bottom: 18px; }
  .empresa { display: flex; gap: 12px; align-items: center; }
  .empresa strong { display: block; font-size: 20px; color: #065f46; letter-spacing: -.3px; }
  .empresa span { display: block; font-size: 12px; color: #334155; }
  .empresa small { display: block; font-size: 10.5px; color: #64748b; margin-top: 2px; }
  .doc { text-align: right; }
  .doc .tipo { display: block; font-size: 11px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; color: #0f9d74; }
  .doc .numero { display: block; font-size: 26px; font-family: Consolas, monospace; line-height: 1.15; }
  .doc .numero.texto { font-family: inherit; font-size: 21px; font-weight: 800; }
  .doc .data { display: block; font-size: 12px; color: #475569; }
  .doc .selo { margin-top: 6px; }
  h2 { font-size: 12px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: #065f46; margin: 0 0 8px; }
  .bloco { margin-bottom: 18px; break-inside: avoid; }
  .campos { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
  .campo { padding: 8px 10px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; grid-column: span 2; min-width: 0; }
  .campo.largo { grid-column: span 4; }
  .campo label { display: block; font-size: 9.5px; font-weight: 700; letter-spacing: 1.1px; text-transform: uppercase; color: #64748b; }
  .campo div { font-size: 13.5px; font-weight: 600; overflow-wrap: anywhere; }
  .rolagem { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #065f46; color: #fff; font-size: 10.5px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; padding: 8px 8px; text-align: left; white-space: nowrap; }
  thead th:first-child { border-top-left-radius: 6px; } thead th:last-child { border-top-right-radius: 6px; }
  tbody td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  tfoot td { padding: 9px 8px; font-weight: 800; background: #ecfdf5; border-top: 2px solid #0f9d74; }
  td.dir, th.dir { text-align: right; } td.centro, th.centro { text-align: center; }
  td.dir, td.fixo { white-space: nowrap; font-variant-numeric: tabular-nums; }
  td.vazio { text-align: center; color: #64748b; padding: 18px; }
  thead { display: table-header-group; } tr { break-inside: avoid; }
  .totais { --c: #0f9d74; border: 2px solid var(--c); border-radius: 8px; padding: 10px 14px; background: color-mix(in srgb, var(--c) 6%, white); }
  .totais .linha { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; font-size: 13.5px; }
  .totais .linha span:last-child { font-family: Consolas, monospace; font-weight: 700; white-space: nowrap; }
  .totais .destaque { font-size: 19px; font-weight: 800; color: var(--c); border-top: 2px solid var(--c); margin-top: 6px; padding-top: 8px; }
  .indicadores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
  .ind { border: 1px solid #a7f3d0; background: #ecfdf5; border-radius: 8px; padding: 10px 12px; }
  .ind label { display: block; font-size: 9.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #475569; }
  .ind strong { display: block; font-size: 18px; color: #065f46; font-family: Consolas, monospace; margin-top: 2px; white-space: nowrap; }
  .selo { --c: #475569; display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; color: var(--c); border: 1.5px solid var(--c); }
  .nota { font-size: 11.5px; color: #475569; margin: 6px 0 16px; }
  .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 46px; break-inside: avoid; }
  .assinaturas span { display: block; border-top: 1.5px solid #0f172a; margin-bottom: 6px; }
  .assinaturas label { display: block; text-align: center; font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: #334155; }
  .rod { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10.5px; color: #64748b; text-align: center; }
  @media screen and (max-width: 900px) { .folha { width: auto !important; min-height: 0 !important; margin: 12px; padding: 18px; } table { min-width: 640px; } td { white-space: nowrap; } .cab { flex-direction: column; } .doc { text-align: left; } .indicadores { grid-template-columns: repeat(2, 1fr); } .barra .dica { display: none; } }
  @media print {
    body { background: #fff; }
    .barra { display: none !important; }
    .folha { margin: 0; padding: 0; width: auto !important; min-height: 0 !important; box-shadow: none; border-radius: 0; }
  }`;

/**
 * Abre a pré-visualização. `orientacao`: 'retrato' (padrão) ou 'paisagem' (tabelas largas).
 * Mantém o nome e a assinatura antigos: printDocument(html, titulo).
 */
export function printDocument(html, title = 'SIGFEC', orientacao = 'retrato') {
  const pagina = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>${CSS} @page { size: A4 ${orientacao === 'paisagem' ? 'landscape' : 'portrait'}; margin: 12mm; }</style></head>
<body>
  <div class="barra">
    <span class="titulo">${esc(title.replace(/-/g, ' '))}</span>
    <span class="dica">Para gerar PDF, escolha “Salvar como PDF” no destino da impressão.</span>
    <button class="fechar" onclick="window.__fechar ? window.__fechar() : window.close()">Fechar</button>
    <button class="imprimir" onclick="window.print()">🖨 Imprimir / Salvar PDF</button>
  </div>
  <main class="folha ${orientacao}">${html}</main>
</body></html>`;

  const largura = orientacao === 'paisagem' ? 1260 : 960;
  const win = window.open('', '_blank', `width=${largura},height=920`);
  if (win && win.document) {
    win.document.write(pagina);
    win.document.close();
    return;
  }
  // Pop-up bloqueado: mostra a pré-visualização por cima do sistema.
  document.getElementById('sigfec-previa')?.remove();
  const quadro = document.createElement('iframe');
  quadro.id = 'sigfec-previa';
  quadro.title = title;
  quadro.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483000;background:#d9dee5';
  quadro.srcdoc = pagina;
  quadro.onload = () => { quadro.contentWindow.__fechar = () => quadro.remove(); };
  document.body.appendChild(quadro);
}

// ===================== documentos =====================

export function printTicketPesagem(pesagem) {
  const produtor = pesagem.produtorNome || pesagem.produtor?.nome;
  const placa = pesagem.veiculoPlaca || pesagem.veiculo?.placa;
  const desconto = (Number(pesagem.pesoLiquido) || 0) - (Number(pesagem.pesoFinal) || 0);
  const html = `
    ${cabecalho({ tipo: 'Ticket de pesagem', numero: '#' + numeroDoc(pesagem.id), data: fmtDataHora(pesagem.dataHoraEntrada) })}
    ${campos('Dados da carga', [
      { label: 'Produtor rural', valor: produtor },
      { label: 'Placa do veículo', valor: placa },
      { label: 'Produto', valor: pesagem.produtoNome || pesagem.produto?.nome || 'Mandioca' },
      { label: 'Impureza', valor: `${num(pesagem.percentualImpureza ?? 0, 2)}%` },
    ])}
    <section class="bloco"><h2>Pesos</h2>
      ${totais([
        { rotulo: 'Peso bruto (veículo carregado)', valor: fmtKg(pesagem.pesoBruto) },
        { rotulo: 'Tara (veículo vazio)', valor: '− ' + fmtKg(pesagem.pesoTara) },
        { rotulo: 'Peso líquido', valor: fmtKg(pesagem.pesoLiquido) },
        { rotulo: `Desconto de impureza (${num(pesagem.percentualImpureza ?? 0, 2)}%)`, valor: '− ' + fmtKg(desconto) },
        { rotulo: 'PESO FINAL', valor: fmtKg(pesagem.pesoFinal), destaque: true },
        ...(pesagem.valorTotal ? [{ rotulo: 'Valor a pagar ao produtor', valor: fmtMoney(pesagem.valorTotal) }] : []),
      ])}
      <p class="nota">O valor a pagar é calculado após o laudo do laboratório (peso final × renda × preço vigente).</p>
    </section>
    ${assinaturas(['Motorista', 'Operador da balança'])}
    ${rodape('Este ticket comprova a entrada da carga na fecularia.')}`;
  printDocument(html, `Ticket-Pesagem-${pesagem.id || ''}`);
}

export function printRomaneio({ data, pesagens, totais: t }) {
  const dataStr = new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const hora = (v) => (v ? paraData(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—');
  const html = `
    ${cabecalho({ tipo: 'Romaneio do pátio', numero: fmtData(data), data: dataStr.charAt(0).toUpperCase() + dataStr.slice(1) })}
    ${indicadores([
      { rotulo: 'Cargas no dia', valor: String(t.cargas) },
      { rotulo: 'Peso líquido', valor: fmtKg(t.pesoLiquido) },
      { rotulo: 'Peso final (pago)', valor: fmtKg(t.pesoFinal) },
      { rotulo: 'Desconto de impureza', valor: fmtKg((t.pesoLiquido || 0) - (t.pesoFinal || 0)) },
    ])}
    ${tabela(`Cargas recebidas (${pesagens.length})`,
      [{ titulo: 'Pesagem', fixo: true }, { titulo: 'Hora', fixo: true }, { titulo: 'Produtor' }, { titulo: 'Placa', fixo: true },
        { titulo: 'Bruto', alinhar: 'dir' }, { titulo: 'Tara', alinhar: 'dir' }, { titulo: 'Líquido', alinhar: 'dir' }, { titulo: 'Peso final', alinhar: 'dir' }],
      pesagens.map((p) => ['#' + numeroDoc(p.id), hora(p.dataHoraEntrada), esc(p.produtorNome || '—'), esc(p.veiculoPlaca || '—'),
        fmtKg(p.pesoBruto), fmtKg(p.pesoTara), fmtKg(p.pesoLiquido), `<strong>${fmtKg(p.pesoFinal)}</strong>`]),
      ['Total', '', '', '', fmtKg(t.pesoBruto), fmtKg(t.pesoTara), fmtKg(t.pesoLiquido), fmtKg(t.pesoFinal)])}
    ${assinaturas(['Operador da balança', 'Supervisor do pátio'])}
    ${rodape('Romaneio diário das cargas de mandioca recebidas.')}`;
  printDocument(html, `Romaneio-${data}`);
}

export function printNotaFiscal(venda) {
  const cliente = venda.cliente || {};
  const itens = venda.itens || [];
  const kgDe = (it) => (Number(it.quantidade) || 0) * (UNIDADES[it.produto?.unidadeMedida]?.pesoKg || 1);
  const pesoTotal = itens.reduce((s, it) => s + kgDe(it), 0);
  const qtdTotal = itens.reduce((s, it) => s + (Number(it.quantidade) || 0), 0);
  const html = `
    ${venda.statusVenda !== 'FATURADA' ? '<div class="marca">SEM NOTA EMITIDA</div>' : ''}
    ${cabecalho({
      tipo: 'Nota de venda · documento auxiliar',
      numero: venda.numeroNota ? 'Nº ' + numeroDoc(venda.numeroNota) : 'Pedido #' + numeroDoc(venda.id),
      data: 'Emissão: ' + fmtData(venda.dataVenda),
      extra: `<div>${selo(venda.statusVenda)}</div>`,
    })}
    ${campos('Emitente', [
      { label: 'Razão social', valor: empresa().nome },
      { label: 'CNPJ', valor: empresa().cnpj || '—' },
      { label: 'Inscrição estadual', valor: empresa().ie || '—' },
      { label: 'Município', valor: empresa().cidade },
      ...(empresa().endereco ? [{ label: 'Endereço', valor: empresa().endereco, largo: true }] : []),
    ])}
    ${campos('Destinatário', [
      { label: 'Nome / razão social', valor: cliente.nome },
      { label: 'CPF / CNPJ', valor: cliente.documento },
      { label: 'Inscrição estadual', valor: cliente.inscricaoEstadual },
      { label: 'Telefone', valor: cliente.telefone },
      { label: 'Endereço', valor: enderecoTexto(cliente.endereco), largo: true },
    ])}
    ${tabela('Produtos',
      [{ titulo: '#', alinhar: 'centro' }, { titulo: 'Produto' }, { titulo: 'Unidade', fixo: true }, { titulo: 'Qtd.', alinhar: 'dir' },
        { titulo: 'Peso (kg)', alinhar: 'dir' }, { titulo: 'Valor unit.', alinhar: 'dir' }, { titulo: 'Subtotal', alinhar: 'dir' }],
      itens.map((it, i) => [String(i + 1), esc(it.produto?.nome || '—'), esc(UNIDADES[it.produto?.unidadeMedida]?.label || '—'),
        num(it.quantidade, 0), num(kgDe(it), 0), fmtMoney(it.valorUnitario), `<strong>${fmtMoney(it.subtotal)}</strong>`]),
      ['', 'Total', '', num(qtdTotal, 0), num(pesoTotal, 0), '', fmtMoney(venda.valorTotal)])}
    ${totais([
      { rotulo: 'Quantidade de itens', valor: String(itens.length) },
      { rotulo: 'Peso total', valor: `${num(pesoTotal, 0)} kg` },
      { rotulo: 'Pagamento', valor: esc(resumoPagamento(venda.formaPagamento, venda.parcelas)) },
      { rotulo: 'VALOR TOTAL DA NOTA', valor: fmtMoney(venda.valorTotal), destaque: true },
    ])}
    ${venda.observacao ? `<p class="nota"><strong>Observações:</strong> ${esc(venda.observacao)}</p>` : ''}
    ${assinaturas([empresa().nome, 'Recebedor (nome e data)'])}
    ${rodape('Documento auxiliar de uso interno, sem valor fiscal. A NF-e oficial exige emissor homologado e transmissão à SEFAZ.')}`;
  printDocument(html, `Nota-${venda.numeroNota || 'pedido-' + venda.id}`);
}

export function printReciboFinanceiro(titulo) {
  const ehPagamento = !!titulo.fornecedor;
  const parceiro = titulo.fornecedor || titulo.cliente || {};
  const valorPago = Number(titulo.valorPago || 0);
  const valorOriginal = Number(titulo.valorOriginal || 0);
  const saldo = Math.max(0, valorOriginal - valorPago);
  const quitado = saldo <= 0 && valorOriginal > 0;
  const html = `
    ${cabecalho({
      tipo: `Comprovante de ${ehPagamento ? 'pagamento' : 'recebimento'}`,
      numero: '#' + numeroDoc(titulo.id),
      data: titulo.dataPagamento ? 'Pago em ' + fmtData(titulo.dataPagamento) : '',
      extra: `<div>${selo(titulo.statusFinanceiro)}</div>`,
    })}
    ${campos(ehPagamento ? 'Favorecido (fornecedor / produtor)' : 'Pagador (cliente)', [
      { label: 'Nome / razão social', valor: parceiro.nome },
      { label: 'CPF / CNPJ', valor: parceiro.documento },
    ])}
    ${campos('Título', [
      { label: 'Descrição', valor: titulo.descricao, largo: true },
      { label: 'Emissão', valor: fmtData(titulo.dataEmissao) },
      { label: 'Vencimento', valor: fmtData(titulo.dataVencimento) },
      { label: 'Forma de pagamento', valor: formaLabel(titulo.formaPagamento) },
      { label: 'Data do pagamento', valor: fmtData(titulo.dataPagamento) },
    ])}
    <section class="bloco"><h2>Valores</h2>
      ${totais([
        { rotulo: 'Valor do título', valor: fmtMoney(valorOriginal) },
        { rotulo: 'Valor pago', valor: fmtMoney(valorPago) },
        { rotulo: quitado ? 'TÍTULO QUITADO' : 'SALDO RESTANTE', valor: quitado ? fmtMoney(0) : fmtMoney(saldo), destaque: true },
      ], quitado ? '#047857' : '#b45309')}
    </section>
    ${assinaturas([ehPagamento ? 'Favorecido' : 'Cliente', empresa().nome + ' — Financeiro'])}
    ${rodape(`Este comprovante registra ${ehPagamento ? 'o pagamento ao favorecido' : 'o recebimento do cliente'}.`)}`;
  printDocument(html, `Comprovante-${titulo.id || ''}`);
}

export function printLaudoLaboratorio(analise) {
  const status = analise.statusQualidade || 'AGUARDANDO_ANALISE';
  const cor = STATUS_COR[status] || '#475569';
  const amostras = analise.amostras || [];
  const p = analise.pesagem || {};
  const html = `
    ${cabecalho({ tipo: 'Laudo de análise de renda', numero: '#' + numeroDoc(analise.id), data: fmtDataHora(analise.dataCriacao), extra: `<div>${selo(status)}</div>` })}
    ${campos('Identificação da carga', [
      { label: 'Pesagem', valor: p.id ? '#' + numeroDoc(p.id) : '—' },
      { label: 'Produtor', valor: p.produtor?.nome },
      { label: 'Peso final da carga', valor: fmtKg(p.pesoFinal) },
      { label: 'Data da pesagem', valor: fmtDataHora(p.dataHoraEntrada) },
    ])}
    ${tabela('Amostras — balança hidrostática',
      [{ titulo: 'Amostra', alinhar: 'centro' }, { titulo: 'Renda (g)', alinhar: 'dir' }],
      amostras.map((a, i) => [String(a.numeroAmostra ?? i + 1), `<strong>${num(a.rendaGramas, 2)} g</strong>`]),
      ['Média', `${num(analise.rendaMedia, 2)} g`])}
    <p class="nota">Renda média de ${amostras.length} amostra(s), sem descarte (prática ABAM). Amostra-padrão: 5 kg de raízes.</p>
    ${campos('Análise físico-química', [
      { label: 'Umidade', valor: analise.umidade != null ? num(analise.umidade) + '%' : '—' },
      { label: 'pH', valor: analise.ph != null ? num(analise.ph) : '—' },
      { label: 'Acidez (mL NaOH/100 g)', valor: analise.acidez != null ? num(analise.acidez) : '—' },
      { label: 'Granulometria (mesh)', valor: analise.granulometria ?? '—' },
      { label: 'Cor', valor: analise.cor || '—' },
      { label: 'Método de secagem', valor: rotulo(analise.metodoSecagem) },
      ...(analise.observacao ? [{ label: 'Observação', valor: analise.observacao, largo: true }] : []),
    ])}
    <section class="bloco"><h2>Resultado</h2>
      ${totais([
        { rotulo: 'Renda média', valor: `${num(analise.rendaMedia, 2)} g` },
        { rotulo: 'Classificação', valor: rotulo(status) },
        ...(p.valorTotal ? [{ rotulo: 'Valor a pagar ao produtor', valor: fmtMoney(p.valorTotal) }] : []),
        { rotulo: rotulo(status).toUpperCase(), valor: `${num(analise.rendaMedia, 2)} g`, destaque: true },
      ], cor)}
      <p class="nota">Critérios: ≥ 500 g aprovado · 350 a 499 g aprovado com desconto · &lt; 350 g reprovado.</p>
    </section>
    ${assinaturas(['Responsável técnico', 'Laboratório — ' + empresa().nome])}
    ${rodape('Laudo de renda de amido da carga de mandioca.')}`;
  printDocument(html, `Laudo-${analise.id || ''}`);
}

/**
 * Relatório gerencial genérico (vindo de /api/relatorios/{chave}).
 * Mais de 6 colunas → A4 paisagem; números e documentos nunca quebram linha.
 */
export function printRelatorio(rel, { inicio, fim, parceiro, usuario, fmtValor }) {
  const numerico = (t) => ['moeda', 'peso', 'percentual', 'numero'].includes(t);
  const naoQuebra = (c) => numerico(c.tipo) || ['data', 'datahora'].includes(c.tipo) || /documento|placa|senha|codigo|id$/i.test(c.chave);
  const paisagem = rel.colunas.length > 6;
  const periodo = rel.chave === 'estoque' ? 'Posição atual' : `${fmtData(inicio)} a ${fmtData(fim)}`;
  const colunas = rel.colunas.map((c) => ({ titulo: c.rotulo, alinhar: numerico(c.tipo) ? 'dir' : '', fixo: naoQuebra(c) }));
  const linhas = rel.linhas.map((l) => rel.colunas.map((c) => esc(fmtValor(l[c.chave], c.tipo))));
  const tot = rel.totais && Object.keys(rel.totais).length
    ? rel.colunas.map((c) => { const v = rel.totais[c.chave]; return v == null ? '' : esc(typeof v === 'string' ? v : fmtValor(v, c.tipo)); })
    : null;
  const html = `
    ${cabecalho({ tipo: 'Relatório gerencial', numero: rel.titulo, data: periodo + (parceiro ? ' · ' + parceiro : '') })}
    <p class="nota" style="margin:-6px 0 14px">${esc(rel.descricao)}</p>
    ${indicadores((rel.indicadores || []).map((i) => ({ rotulo: i.rotulo, valor: fmtValor(i.valor, i.tipo) })))}
    ${tabela(`${rel.linhas.length} registro(s)`, colunas, linhas, rel.linhas.length ? tot : null)}
    ${rodape(`Relatório emitido por ${esc(usuario || '—')}.`)}`;
  printDocument(html, `Relatorio-${rel.chave}`, paisagem ? 'paisagem' : 'retrato');
}

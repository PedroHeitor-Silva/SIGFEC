/**
 * Abre nova janela com HTML printável e dispara janela de impressão.
 * Usuário pode "Salvar como PDF" via dialog do navegador.
 */
export function printDocument(html, title = 'SIGFEC') {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    alert('Pop-up bloqueado. Permita pop-ups deste site para imprimir.');
    return;
  }
  win.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Roboto, system-ui, sans-serif;
            margin: 0; padding: 24px;
            color: #0f172a;
            background: white;
          }
          .doc { max-width: 600px; margin: 0 auto; }
          .header {
            border-bottom: 3px solid #10b981;
            padding-bottom: 16px; margin-bottom: 20px;
            display: flex; justify-content: space-between; align-items: flex-end;
          }
          .brand { display: flex; align-items: center; gap: 12px; }
          .brand-text strong { font-size: 22px; color: #047857; display: block; letter-spacing: -0.5px; }
          .brand-text small { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; }
          .doc-id { text-align: right; }
          .doc-id strong { font-size: 24px; font-family: monospace; color: #0f172a; display: block; }
          .doc-id small { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; }
          h2 { font-size: 16px; margin: 16px 0 8px; color: #047857; text-transform: uppercase; letter-spacing: 1.5px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-bottom: 16px; }
          .field { padding: 8px 0; border-bottom: 1px dashed #cbd5e1; }
          .field label {
            font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px;
            color: #64748b; font-weight: 700; display: block;
          }
          .field value, .field .value {
            font-size: 13px; color: #0f172a; font-weight: 600; display: block; margin-top: 2px;
          }
          .totals { background: #f0fdf4; border: 2px solid #10b981; border-radius: 6px; padding: 14px; margin-top: 16px; }
          .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
          .totals .row.highlight { font-size: 18px; font-weight: 800; color: #047857; border-top: 2px solid #10b981; padding-top: 8px; margin-top: 6px; }
          .footer {
            margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0;
            font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;
            text-align: center;
          }
          .signatures { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
          .sig { text-align: center; }
          .sig .line { border-top: 1px solid #0f172a; margin-bottom: 6px; }
          .sig label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; }
          /* Barra de ações — some na impressão */
          .toolbar {
            position: sticky; top: 0; z-index: 50;
            display: flex; gap: 10px; align-items: center; justify-content: flex-end;
            padding: 10px 16px; margin: -24px -24px 20px;
            background: #0f172a; border-bottom: 1px solid #1e293b;
          }
          .toolbar span { margin-right: auto; font-size: 12px; color: #94a3b8; }
          .toolbar button {
            font-family: inherit; font-size: 13px; font-weight: 700;
            padding: 8px 16px; border-radius: 6px; cursor: pointer; border: none;
          }
          .btn-print { background: #10b981; color: white; }
          .btn-close { background: #334155; color: #e2e8f0; }
          @media print {
            body { padding: 0; }
            .toolbar { display: none !important; }
            @page { margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <span>Pré-visualização — confira antes de imprimir</span>
          <button class="btn-close" onclick="window.close()">Fechar</button>
          <button class="btn-print" onclick="window.print()">Imprimir / Salvar PDF</button>
        </div>
        ${html}
      </body>
    </html>
  `);
  win.document.close();
}

const fmtMoney = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const fmtKg = (v) =>
  v != null ? `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : '-';

const fmtDate = (v) => v ? new Date(v).toLocaleString('pt-BR') : '-';

const SIGFEC_LOGO_SVG = `
  <svg width="42" height="42" viewBox="0 0 64 64">
    <path d="M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z" fill="#10b981"/>
    <path d="M40 22 C 40 18, 36 17, 32 17 C 27 17, 23 19, 23 24 C 23 28, 27 29, 32 30 C 37 31, 41 32, 41 37 C 41 43, 35 46, 30 46 C 25 46, 22 44, 22 41" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="46" cy="20" r="2.5" fill="#fef3c7"/>
  </svg>
`;

export function printTicketPesagem(pesagem) {
  const html = `
    <div class="doc">
      <div class="header">
        <div class="brand">
          ${SIGFEC_LOGO_SVG}
          <div class="brand-text">
            <strong>SIGFEC</strong>
            <small>Ticket de Pesagem</small>
          </div>
        </div>
        <div class="doc-id">
          <strong>#${String(pesagem.id || '0').padStart(6, '0')}</strong>
          <small>${fmtDate(pesagem.dataHoraEntrada)}</small>
        </div>
      </div>

      <h2>Dados da Carga</h2>
      <div class="grid">
        <div class="field">
          <label>Produtor</label>
          <div class="value">${pesagem.produtorNome || pesagem.produtor?.nome || '-'}</div>
        </div>
        <div class="field">
          <label>Placa do Veículo</label>
          <div class="value">${pesagem.veiculoPlaca || pesagem.veiculo?.placa || '-'}</div>
        </div>
        <div class="field">
          <label>Produto</label>
          <div class="value">${pesagem.produtoNome || pesagem.produto?.nome || 'Mandioca'}</div>
        </div>
        <div class="field">
          <label>Impureza (%)</label>
          <div class="value">${pesagem.percentualImpureza ?? 0}%</div>
        </div>
      </div>

      <h2>Pesos</h2>
      <div class="totals">
        <div class="row"><span>Peso Bruto</span><span>${fmtKg(pesagem.pesoBruto)}</span></div>
        <div class="row"><span>Tara do Veículo</span><span>− ${fmtKg(pesagem.pesoTara)}</span></div>
        <div class="row"><span>Peso Líquido</span><span>${fmtKg(pesagem.pesoLiquido)}</span></div>
        <div class="row"><span>Desconto Impurezas</span><span>− ${fmtKg((Number(pesagem.pesoLiquido) || 0) - (Number(pesagem.pesoFinal) || 0))}</span></div>
        <div class="row highlight"><span>Peso Final</span><span>${fmtKg(pesagem.pesoFinal)}</span></div>
        ${pesagem.valorTotal ? `<div class="row highlight"><span>Valor Total</span><span>${fmtMoney(pesagem.valorTotal)}</span></div>` : ''}
      </div>

      <div class="signatures">
        <div class="sig"><div class="line"></div><label>Motorista</label></div>
        <div class="sig"><div class="line"></div><label>Operador da Balança</label></div>
      </div>

      <div class="footer">
        Documento gerado pelo SIGFEC em ${new Date().toLocaleString('pt-BR')}<br>
        Este ticket comprova a entrada da carga na fecularia.
      </div>
    </div>
  `;
  printDocument(html, `Ticket-Pesagem-${pesagem.id || ''}`);
}

export function printRomaneio({ data, pesagens, totais }) {
  const dataStr = new Date(data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const rows = pesagens.map((p) => `
    <tr>
      <td style="font-family:monospace;">${p.id}</td>
      <td>${p.dataHoraEntrada ? new Date(p.dataHoraEntrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
      <td>${p.produtorNome || '-'}</td>
      <td style="font-family:monospace;">${p.veiculoPlaca || '-'}</td>
      <td style="text-align:right;font-family:monospace;">${fmtKg(p.pesoBruto)}</td>
      <td style="text-align:right;font-family:monospace;">${fmtKg(p.pesoTara)}</td>
      <td style="text-align:right;font-family:monospace;font-weight:bold;">${fmtKg(p.pesoLiquido)}</td>
      <td style="text-align:right;font-family:monospace;font-weight:bold;color:#047857;">${fmtKg(p.pesoFinal)}</td>
    </tr>
  `).join('');

  const html = `
    <div class="doc" style="max-width:900px;">
      <div class="header">
        <div class="brand">
          ${SIGFEC_LOGO_SVG}
          <div class="brand-text">
            <strong>SIGFEC</strong>
            <small>Romaneio do Pátio</small>
          </div>
        </div>
        <div class="doc-id">
          <strong>${dataStr}</strong>
          <small>Emitido ${new Date().toLocaleTimeString('pt-BR')}</small>
        </div>
      </div>

      <h2>Totais do Dia</h2>
      <div class="totals">
        <div class="row"><span>Total de Cargas</span><span>${totais.cargas}</span></div>
        <div class="row"><span>Peso Bruto Total</span><span>${fmtKg(totais.pesoBruto)}</span></div>
        <div class="row"><span>Tara Total</span><span>− ${fmtKg(totais.pesoTara)}</span></div>
        <div class="row highlight"><span>Peso Líquido Total</span><span>${fmtKg(totais.pesoLiquido)}</span></div>
        <div class="row highlight"><span>Peso Final (Após Impurezas)</span><span>${fmtKg(totais.pesoFinal)}</span></div>
      </div>

      <h2>Detalhamento (${pesagens.length} cargas)</h2>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;">
        <thead>
          <tr style="background:#f0fdf4;border-bottom:2px solid #10b981;">
            <th style="padding:6px;text-align:left;">ID</th>
            <th style="padding:6px;text-align:left;">Hora</th>
            <th style="padding:6px;text-align:left;">Produtor</th>
            <th style="padding:6px;text-align:left;">Placa</th>
            <th style="padding:6px;text-align:right;">Bruto</th>
            <th style="padding:6px;text-align:right;">Tara</th>
            <th style="padding:6px;text-align:right;">Líquido</th>
            <th style="padding:6px;text-align:right;">Final</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="signatures">
        <div class="sig"><div class="line"></div><label>Operador da Balança</label></div>
        <div class="sig"><div class="line"></div><label>Supervisor de Pátio</label></div>
      </div>

      <div class="footer">
        Romaneio gerado pelo SIGFEC • Fecularia Loanda • ${new Date().toLocaleString('pt-BR')}
      </div>
    </div>
  `;
  printDocument(html, `Romaneio-${data}`);
}

export function printNotaFiscal(venda) {
  const cliente = venda.cliente || {};
  const itens = venda.itens || [];
  const itensRows = itens.map((it, i) => `
    <tr>
      <td style="padding:6px;text-align:center;font-family:monospace;">${i + 1}</td>
      <td style="padding:6px;">${it.produto?.nome || '-'}</td>
      <td style="padding:6px;text-align:right;font-family:monospace;">${Number(it.quantidade || 0).toLocaleString('pt-BR')}</td>
      <td style="padding:6px;text-align:right;font-family:monospace;">${fmtMoney(it.valorUnitario)}</td>
      <td style="padding:6px;text-align:right;font-family:monospace;font-weight:bold;">${fmtMoney(it.subtotal)}</td>
    </tr>
  `).join('');

  const html = `
    <div class="doc" style="max-width:720px;">
      <div class="header">
        <div class="brand">
          ${SIGFEC_LOGO_SVG}
          <div class="brand-text">
            <strong>SIGFEC</strong>
            <small>Nota Fiscal — Documento Auxiliar</small>
          </div>
        </div>
        <div class="doc-id">
          <strong>Nº ${venda.numeroNota ? String(venda.numeroNota).padStart(6, '0') : '——'}</strong>
          <small>${venda.dataVenda ? new Date(venda.dataVenda + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</small>
        </div>
      </div>

      <h2>Emitente</h2>
      <div class="grid">
        <div class="field"><label>Razão Social</label><div class="value">Fecularia Loanda</div></div>
        <div class="field"><label>Localidade</label><div class="value">Loanda - PR</div></div>
      </div>

      <h2>Destinatário</h2>
      <div class="grid">
        <div class="field"><label>Cliente</label><div class="value">${cliente.nome || '-'}</div></div>
        <div class="field"><label>Documento</label><div class="value">${cliente.documento || '-'}</div></div>
        <div class="field"><label>Telefone</label><div class="value">${cliente.telefone || '-'}</div></div>
        <div class="field"><label>E-mail</label><div class="value">${cliente.email || '-'}</div></div>
      </div>

      <h2>Produtos</h2>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:6px;">
        <thead>
          <tr style="background:#f0fdf4;border-bottom:2px solid #10b981;">
            <th style="padding:6px;text-align:center;">#</th>
            <th style="padding:6px;text-align:left;">Produto</th>
            <th style="padding:6px;text-align:right;">Qtd</th>
            <th style="padding:6px;text-align:right;">Valor Unit.</th>
            <th style="padding:6px;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itensRows || '<tr><td colspan="5" style="padding:8px;text-align:center;">Sem itens</td></tr>'}</tbody>
      </table>

      <div class="totals" style="margin-top:12px;">
        <div class="row highlight"><span>VALOR TOTAL DA NOTA</span><span>${fmtMoney(venda.valorTotal)}</span></div>
      </div>

      ${venda.observacao ? `<p style="font-size:11px;color:#475569;margin-top:10px;"><strong>Observação:</strong> ${venda.observacao}</p>` : ''}

      <div class="signatures">
        <div class="sig"><div class="line"></div><label>Fecularia Loanda</label></div>
        <div class="sig"><div class="line"></div><label>Recebedor</label></div>
      </div>

      <div class="footer">
        Documento auxiliar emitido pelo SIGFEC em ${new Date().toLocaleString('pt-BR')}<br>
        Documento sem valor fiscal — uso interno. NF-e oficial requer transmissão à SEFAZ.
      </div>
    </div>
  `;
  printDocument(html, `NotaFiscal-${venda.numeroNota || venda.id}`);
}

export function printReciboFinanceiro(titulo) {
  const tipo = titulo.fornecedor ? 'PAGAMENTO' : 'RECEBIMENTO';
  const parceiro = titulo.fornecedor || titulo.cliente || {};
  const valorPago = Number(titulo.valorPago || 0);
  const valorOriginal = Number(titulo.valorOriginal || 0);
  const saldo = Math.max(0, valorOriginal - valorPago);
  const quitado = saldo <= 0 && valorOriginal > 0;

  const html = `
    <div class="doc">
      <div class="header">
        <div class="brand">
          ${SIGFEC_LOGO_SVG}
          <div class="brand-text">
            <strong>SIGFEC</strong>
            <small>Comprovante de ${tipo}</small>
          </div>
        </div>
        <div class="doc-id">
          <strong>#${String(titulo.id || '0').padStart(6, '0')}</strong>
          <small>${titulo.dataPagamento ? new Date(titulo.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</small>
        </div>
      </div>

      <h2>${titulo.fornecedor ? 'Fornecedor' : 'Cliente'}</h2>
      <div class="grid">
        <div class="field">
          <label>Nome / Razão Social</label>
          <div class="value">${parceiro.nome || '-'}</div>
        </div>
        <div class="field">
          <label>Documento</label>
          <div class="value">${parceiro.documento || '-'}</div>
        </div>
      </div>

      <h2>Detalhes do Título</h2>
      <div class="grid">
        <div class="field"><label>Emissão</label><div class="value">${titulo.dataEmissao ? new Date(titulo.dataEmissao + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</div></div>
        <div class="field"><label>Vencimento</label><div class="value">${titulo.dataVencimento ? new Date(titulo.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</div></div>
        <div class="field"><label>Forma de Pagamento</label><div class="value">${titulo.formaPagamento || '-'}</div></div>
        <div class="field"><label>Descrição</label><div class="value">${titulo.descricao || '-'}</div></div>
      </div>

      <h2>Valores</h2>
      <div class="totals">
        <div class="row"><span>Valor Original</span><span>${fmtMoney(valorOriginal)}</span></div>
        <div class="row"><span>Valor Pago</span><span>${fmtMoney(valorPago)}</span></div>
        <div class="row highlight" style="color:${quitado ? '#047857' : '#b45309'};">
          <span>${quitado ? 'TÍTULO QUITADO' : 'Saldo Restante'}</span>
          <span>${quitado ? '✓' : fmtMoney(saldo)}</span>
        </div>
      </div>

      <div class="signatures">
        <div class="sig"><div class="line"></div><label>${titulo.fornecedor ? 'Fornecedor' : 'Cliente'}</label></div>
        <div class="sig"><div class="line"></div><label>SIGFEC — Financeiro</label></div>
      </div>

      <div class="footer">
        Comprovante gerado pelo SIGFEC em ${new Date().toLocaleString('pt-BR')} • Fecularia Loanda<br>
        Este documento comprova a ${tipo === 'PAGAMENTO' ? 'quitação ao fornecedor' : 'baixa do recebimento'}.
      </div>
    </div>
  `;
  printDocument(html, `Comprovante-${titulo.id || ''}`);
}

export function printLaudoLaboratorio(analise) {
  const renda = Number(analise.rendaMedia ?? 0);
  const status = analise.statusQualidade || 'AGUARDANDO_ANALISE';
  const statusColor = status === 'APROVADO' ? '#10b981' : status === 'APROVADO_COM_DESCONTO' ? '#f59e0b' : status === 'REPROVADO' ? '#ef4444' : '#64748b';
  const amostras = analise.amostras || [];
  const amostrasRows = amostras.map((a, i) => `
    <tr>
      <td style="padding:6px;text-align:center;font-family:monospace;">${a.numeroAmostra ?? i + 1}</td>
      <td style="padding:6px;text-align:right;font-family:monospace;font-weight:bold;">${Number(a.rendaGramas || 0).toFixed(2)} g</td>
    </tr>
  `).join('');

  const html = `
    <div class="doc">
      <div class="header">
        <div class="brand">
          ${SIGFEC_LOGO_SVG}
          <div class="brand-text">
            <strong>SIGFEC</strong>
            <small>Laudo de Análise</small>
          </div>
        </div>
        <div class="doc-id">
          <strong>#${String(analise.id || '0').padStart(6, '0')}</strong>
          <small>${fmtDate(analise.dataCriacao)}</small>
        </div>
      </div>

      <h2>Identificação</h2>
      <div class="grid">
        <div class="field">
          <label>Carga (Pesagem)</label>
          <div class="value">#${analise.pesagem?.id ?? '-'}</div>
        </div>
        <div class="field">
          <label>Produtor</label>
          <div class="value">${analise.pesagem?.produtor?.nome ?? '-'}</div>
        </div>
      </div>

      <h2>Amostras — Balança Hidrostática</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px;">
        <thead>
          <tr style="background:#f0fdf4;border-bottom:2px solid #10b981;">
            <th style="padding:6px;text-align:center;">Amostra</th>
            <th style="padding:6px;text-align:right;">Renda (g)</th>
          </tr>
        </thead>
        <tbody>${amostrasRows || '<tr><td colspan="2" style="padding:6px;text-align:center;">Sem amostras</td></tr>'}</tbody>
      </table>
      <p style="font-size:10px;color:#64748b;margin-top:6px;">
        Renda média de ${amostras.length} amostra(s), sem descarte (norma ABAM). Amostra-padrão: 5 kg de raízes.
      </p>

      <h2>Análise Físico-Química</h2>
      <div class="grid">
        <div class="field">
          <label>Umidade (%)</label>
          <div class="value">${analise.umidade != null ? Number(analise.umidade).toFixed(2) : '-'}</div>
        </div>
        <div class="field">
          <label>pH</label>
          <div class="value">${analise.ph != null ? Number(analise.ph).toFixed(2) : '-'}</div>
        </div>
        <div class="field">
          <label>Acidez (mL NaOH/100g)</label>
          <div class="value">${analise.acidez != null ? Number(analise.acidez).toFixed(2) : '-'}</div>
        </div>
        <div class="field">
          <label>Granulometria (mesh)</label>
          <div class="value">${analise.granulometria ?? '-'}</div>
        </div>
        <div class="field">
          <label>Cor</label>
          <div class="value">${analise.cor || '-'}</div>
        </div>
        ${analise.observacao ? `<div class="field"><label>Observação</label><div class="value">${analise.observacao}</div></div>` : ''}
      </div>

      <h2>Resultado</h2>
      <div class="totals" style="border-color: ${statusColor}; background: ${statusColor}10;">
        <div class="row highlight" style="color: ${statusColor};">
          <span>Renda Média</span><span>${renda.toFixed(2)} g</span>
        </div>
        <div class="row"><span>Classificação</span><span style="font-weight: 800; color: ${statusColor};">${status.replace(/_/g, ' ')}</span></div>
      </div>

      <div class="signatures">
        <div class="sig"><div class="line"></div><label>Responsável Técnico</label></div>
        <div class="sig"><div class="line"></div><label>Laboratório SIGFEC</label></div>
      </div>

      <div class="footer">
        Laudo emitido em ${new Date().toLocaleString('pt-BR')} • SIGFEC Laboratório<br>
        Critérios de renda: ≥500g APROVADO • ≥350g APROVADO COM DESCONTO • &lt;350g REPROVADO
      </div>
    </div>
  `;
  printDocument(html, `Laudo-${analise.id || ''}`);
}

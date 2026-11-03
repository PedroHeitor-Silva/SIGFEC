import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, ShoppingCart, Plus, Trash2, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { maskMoeda, unmaskMoeda } from '../utils/masks';
import { isoHoje } from '../utils/relatorio';
import { FORMAS_PAGAMENTO, maxParcelas, intervaloParcelas, ehAVista, dividirParcelas, resumoPagamento } from '../utils/formasPagamento';

const inputCls = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition';
const labelCls = 'text-xs font-bold uppercase tracking-wider text-slate-400';
const fmtMoeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

export default function VendaForm() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [form, setForm] = useState({
    clienteId: '',
    dataVenda: isoHoje(),
    observacao: '',
    formaPagamento: '',
    parcelas: 1,
  });
  // item em edição
  const [novoItem, setNovoItem] = useState({ produtoId: '', quantidade: '', valorUnitario: '' });
  const [itens, setItens] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.allSettled([api.get('/parceiros'), api.get('/produtos')]).then(([par, pro]) => {
      const allPar = par.status === 'fulfilled' ? (par.value.data || []) : [];
      // clientes = parceiros tipo CLIENTE (ou todos, fallback)
      const cli = allPar.filter((p) => String(p.tipoParceiro || '').toUpperCase() === 'CLIENTE');
      setClientes(cli.length ? cli : allPar);
      // produtos vendáveis — exclui matéria-prima
      const pr = pro.status === 'fulfilled' ? (pro.value.data || []) : [];
      setProdutos(pr.filter((p) => p.categoria !== 'MANDIOCA'));
    });
  }, []);

  const produtoSel = produtos.find((p) => String(p.id) === String(novoItem.produtoId));

  // auto-preenche valor unitário com precoBase ao escolher produto
  const handleProduto = (id) => {
    const p = produtos.find((x) => String(x.id) === String(id));
    setNovoItem({
      produtoId: id,
      quantidade: '',
      valorUnitario: p?.precoBase ? maskMoeda(String(Math.round(Number(p.precoBase) * 100))) : '',
    });
  };

  const addItem = () => {
    if (!novoItem.produtoId) { toast.error('Selecione o produto.'); return; }
    const qtd = Number(novoItem.quantidade);
    const unit = unmaskMoeda(novoItem.valorUnitario);
    if (!qtd || qtd <= 0) { toast.error('Quantidade inválida.'); return; }
    if (!unit || unit <= 0) { toast.error('Valor unitário inválido.'); return; }
    const p = produtos.find((x) => String(x.id) === String(novoItem.produtoId));
    setItens((prev) => [...prev, {
      produtoId: Number(novoItem.produtoId),
      produtoNome: p?.nome,
      categoria: p?.categoria,
      quantidade: qtd,
      valorUnitario: unit,
      subtotal: qtd * unit,
    }]);
    setNovoItem({ produtoId: '', quantidade: '', valorUnitario: '' });
  };

  const removeItem = (idx) => setItens((prev) => prev.filter((_, i) => i !== idx));

  const valorTotal = useMemo(() => itens.reduce((s, i) => s + i.subtotal, 0), [itens]);
  const aVista = ehAVista(form.formaPagamento);
  const nParcelas = aVista ? 1 : Number(form.parcelas) || 1;
  const parcelasPrevistas = useMemo(() => (valorTotal > 0 ? dividirParcelas(valorTotal, nParcelas) : []), [valorTotal, nParcelas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clienteId) { toast.error('Selecione o cliente.'); return; }
    if (!itens.length) { toast.error('Adicione ao menos um item.'); return; }
    setSaving(true);
    try {
      await api.post('/vendas', {
        cliente: { id: Number(form.clienteId) },
        dataVenda: form.dataVenda,
        observacao: form.observacao,
        statusVenda: 'ORCAMENTO',
        formaPagamento: form.formaPagamento || null,
        parcelas: nParcelas,
        itens: itens.map((i) => ({
          produto: { id: i.produtoId },
          quantidade: i.quantidade,
          valorUnitario: i.valorUnitario,
        })),
      });
      toast.success('Venda registrada como orçamento.');
      navigate('/vendas');
    } catch {
      toast.error('Falha ao registrar venda.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="vendas"
        title="Nova Venda"
        subtitle="Monte o pedido — adicione produtos e quantidades"
        action={
          <button type="button" onClick={() => navigate('/vendas')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition">
            <ArrowLeft size={15} /> Voltar
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-3">
        {/* Coluna esquerda */}
        <div className="lg:col-span-2 space-y-5">
          {/* Cliente */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 border-l-2 border-l-emerald-500">
              <ShoppingCart size={16} className="text-emerald-400" />
              <span className="text-sm font-bold text-white">Dados da Venda</span>
            </div>
            <div className="p-6 grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={labelCls}>Cliente</span>
                <select value={form.clienteId} onChange={(e) => setForm((p) => ({ ...p, clienteId: e.target.value }))}
                  className={inputCls} required>
                  <option value="">Selecione o cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} — {c.documento || 'sem doc'}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Data da Venda</span>
                <input type="date" value={form.dataVenda}
                  onChange={(e) => setForm((p) => ({ ...p, dataVenda: e.target.value }))}
                  className={inputCls} required />
              </label>
              <label className="block">
                <span className={labelCls}>Forma de pagamento</span>
                <select value={form.formaPagamento}
                  onChange={(e) => setForm((p) => ({ ...p, formaPagamento: e.target.value, parcelas: ehAVista(e.target.value) ? 1 : p.parcelas }))}
                  className={inputCls}>
                  <option value="">A prazo — {intervaloParcelas()} dias (padrão)</option>
                  {FORMAS_PAGAMENTO.map((f) => <option key={f.value} value={f.value}>{f.label}{f.aVista ? ' (à vista)' : ''}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Parcelas</span>
                <select value={nParcelas} disabled={aVista}
                  onChange={(e) => setForm((p) => ({ ...p, parcelas: Number(e.target.value) }))}
                  className={inputCls}>
                  {Array.from({ length: maxParcelas() }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n === 1 ? '1x (pagamento único)' : `${n}x${valorTotal > 0 ? ' de ' + fmtMoeda(valorTotal / n) : ''}`}</option>
                  ))}
                </select>
                {aVista && <span className="mt-1 block text-[11px] text-slate-500">Pagamento à vista: 1 parcela, vence na data da confirmação.</span>}
              </label>
              <label className="block sm:col-span-2">
                <span className={labelCls}>Observação</span>
                <input type="text" value={form.observacao}
                  onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
                  placeholder="Condições, transporte..." className={inputCls} />
              </label>
            </div>
          </div>

          {/* Adicionar item */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 border-l-2 border-l-amber-500">
              <Package size={16} className="text-amber-400" />
              <span className="text-sm font-bold text-white">Adicionar Produto</span>
            </div>
            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-12 items-end">
                <label className="block sm:col-span-5">
                  <span className={labelCls}>Produto</span>
                  <select value={novoItem.produtoId} onChange={(e) => handleProduto(e.target.value)} className={inputCls}>
                    <option value="">Selecione...</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-3">
                  <span className={labelCls}>Qtd (kg/sc)</span>
                  <input type="number" min="0" step="0.01" value={novoItem.quantidade}
                    onChange={(e) => setNovoItem((p) => ({ ...p, quantidade: e.target.value }))}
                    placeholder="0" className={`${inputCls} font-mono`} />
                </label>
                <label className="block sm:col-span-3">
                  <span className={labelCls}>Valor Unit. (R$)</span>
                  <input type="text" inputMode="numeric" value={novoItem.valorUnitario}
                    onChange={(e) => setNovoItem((p) => ({ ...p, valorUnitario: maskMoeda(e.target.value) }))}
                    placeholder="0,00" className={`${inputCls} font-mono`} />
                </label>
                <div className="sm:col-span-1">
                  <button type="button" onClick={addItem}
                    className="w-full h-12 mt-2 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition"
                    title="Adicionar item">
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              {produtoSel && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Preço base do catálogo: <span className="text-emerald-400 font-mono">{fmtMoeda(produtoSel.precoBase)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Itens adicionados */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Itens do Pedido</span>
              <span className="text-xs text-slate-500">{itens.length} item(ns)</span>
            </div>
            {itens.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-600">Nenhum produto adicionado.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/50">
                    {['Produto', 'Qtd', 'Valor Unit.', 'Subtotal', ''].map((h) => (
                      <th key={h} className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it, i) => (
                    <tr key={i} className="border-b border-slate-800/60">
                      <td className="px-5 py-3 text-white font-medium">{it.produtoNome}</td>
                      <td className="px-5 py-3 text-slate-300 font-mono">{it.quantidade.toLocaleString('pt-BR')}</td>
                      <td className="px-5 py-3 text-slate-400 font-mono">{fmtMoeda(it.valorUnitario)}</td>
                      <td className="px-5 py-3 text-emerald-400 font-mono font-bold">{fmtMoeda(it.subtotal)}</td>
                      <td className="px-5 py-3">
                        <button type="button" onClick={() => removeItem(i)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Resumo */}
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 sticky top-24">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-4">Resumo do Pedido</p>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-500">Itens</span>
                <span className="text-white font-mono font-bold">{itens.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-500">Quantidade total</span>
                <span className="text-white font-mono">
                  {itens.reduce((s, i) => s + i.quantidade, 0).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Valor Total</p>
                <p className="text-3xl font-bold font-mono text-white">{fmtMoeda(valorTotal)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">{resumoPagamento(form.formaPagamento, nParcelas)}</p>
              </div>
              {parcelasPrevistas.length > 1 && (
                <div className="mt-3 rounded-lg border border-slate-800">
                  <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-800">Parcelas previstas</p>
                  <ul className="max-h-48 overflow-y-auto divide-y divide-slate-800/60">
                    {parcelasPrevistas.map((v, i) => (
                      <li key={i} className="flex justify-between px-3 py-1.5 text-xs">
                        <span className="text-slate-400">{i + 1}ª · vence em {30 * (i + 1)} dias</span>
                        <span className="font-mono font-semibold text-white">{fmtMoeda(v)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button type="submit" disabled={saving}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-lg shadow-emerald-900/40">
              <Save size={15} /> {saving ? 'Salvando...' : 'Registrar Venda'}
            </button>
            <p className="mt-2 text-[11px] text-slate-600 text-center">
              Salva como orçamento. Confirme depois para baixar estoque e gerar cobrança.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

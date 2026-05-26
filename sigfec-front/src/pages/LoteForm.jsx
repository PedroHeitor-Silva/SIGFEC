import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Boxes, Scale, Calendar, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { UNIDADES, unidadeNome, unidadeLabel } from '../utils/unidades';

const inputCls = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition';
const labelCls = 'text-xs font-bold uppercase tracking-wider text-slate-400';
const fmt = (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '-';

export default function LoteForm() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [pesagens, setPesagens] = useState([]);
  const [form, setForm] = useState({
    codigoLote: '',
    produtoId: '',
    dataFabricacao: new Date().toISOString().slice(0, 10),
    validade: '',
    quantidadeProduzida: '',
    observacao: '',
  });
  const [selectedPesagens, setSelectedPesagens] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.get('/produtos'),
      api.get('/pesagens?disponiveis=true'),
    ]).then(([pr, pe]) => {
      setProdutos(pr.status === 'fulfilled' ? (pr.value.data || []).filter((p) => p.categoria !== 'MANDIOCA' && p.categoria !== 'RESIDUO_FIBROSO') : []);
      setPesagens(pe.status === 'fulfilled' ? (pe.value.data || []) : []);
    });
  }, []);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const togglePesagem = (id) => {
    setSelectedPesagens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalEntrada = useMemo(() => {
    return pesagens
      .filter((p) => selectedPesagens.has(p.id))
      .reduce((s, p) => s + Number(p.pesoFinal || p.pesoLiquido || 0), 0);
  }, [pesagens, selectedPesagens]);

  // Produto selecionado e fator p/ converter produzido em kg (rendimento usa kg)
  const produtoSel = produtos.find((p) => String(p.id) === String(form.produtoId));
  const unidade = produtoSel?.unidadeMedida || 'KG';
  const fatorKg = UNIDADES[unidade]?.pesoKg || 1;

  const rendimentoPreview = useMemo(() => {
    const q = parseFloat(form.quantidadeProduzida);
    if (!q || !totalEntrada) return null;
    return ((q * fatorKg) / totalEntrada) * 100;
  }, [form.quantidadeProduzida, totalEntrada, fatorKg]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.produtoId) { toast.error('Selecione o produto.'); return; }
    if (selectedPesagens.size === 0) { toast.error('Selecione ao menos uma pesagem consumida.'); return; }
    if (!form.quantidadeProduzida || Number(form.quantidadeProduzida) <= 0) {
      toast.error('Informe a quantidade produzida.'); return;
    }
    setSaving(true);
    try {
      await api.post('/lotes', {
        codigoLote: form.codigoLote || null,
        produto: { id: Number(form.produtoId) },
        dataFabricacao: form.dataFabricacao,
        validade: form.validade || null,
        quantidadeProduzida: Number(form.quantidadeProduzida),
        observacao: form.observacao,
        statusLote: 'EM_PRODUCAO',
        pesagensConsumidas: [...selectedPesagens].map((id) => ({ id })),
      });
      toast.success('Lote criado com sucesso!');
      navigate('/lotes');
    } catch {
      toast.error('Falha ao criar lote.');
    } finally {
      setSaving(false);
    }
  };

  // Filtra pesagens só com produtor (carga válida)
  const pesagensDisponiveis = pesagens.filter((p) => p.produtorNome || p.produtor);

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="lotes"
        title="Novo Lote de Produção"
        subtitle="Vincule pesagens à produção para rastreabilidade"
        action={
          <button type="button" onClick={() => navigate('/lotes')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition">
            <ArrowLeft size={15} /> Voltar
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-3">
        {/* Coluna esquerda — dados do lote */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 border-l-2 border-l-emerald-500">
              <Boxes size={16} className="text-emerald-400" />
              <span className="text-sm font-bold text-white">Dados do Lote</span>
            </div>
            <div className="p-6 grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={labelCls}>Produto Final</span>
                <select name="produtoId" value={form.produtoId} onChange={handleChange} className={inputCls} required>
                  <option value="">Selecione o produto...</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome} — {p.categoria}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Código do Lote</span>
                <input name="codigoLote" value={form.codigoLote} onChange={handleChange} placeholder="Auto (LOT-2026-XXXX)" className={`${inputCls} font-mono`} />
              </label>
              <label className="block">
                <span className={labelCls}>
                  Quantidade Produzida {produtoSel ? `(${unidadeLabel(unidade)})` : '(selecione o produto)'}
                </span>
                <input type="number" step="0.01" min="0" name="quantidadeProduzida" value={form.quantidadeProduzida} onChange={handleChange} placeholder="0,00" className={`${inputCls} font-mono`} required />
                {produtoSel && fatorKg > 1 && form.quantidadeProduzida && (
                  <span className="mt-1 block text-[11px] text-slate-500">
                    ≈ {(Number(form.quantidadeProduzida) * fatorKg).toLocaleString('pt-BR')} kg totais
                  </span>
                )}
              </label>
              <label className="block">
                <span className={labelCls}>Data de Fabricação</span>
                <input type="date" name="dataFabricacao" value={form.dataFabricacao} onChange={handleChange} className={inputCls} required />
              </label>
              <label className="block">
                <span className={labelCls}>Validade</span>
                <input type="date" name="validade" value={form.validade} onChange={handleChange} className={inputCls} />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelCls}>Observação</span>
                <input name="observacao" value={form.observacao} onChange={handleChange} placeholder="Notas internas, condições de produção..." className={inputCls} />
              </label>
            </div>
          </div>

          {/* Pesagens consumidas */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 border-l-2 border-l-amber-500">
              <Scale size={16} className="text-amber-400" />
              <span className="text-sm font-bold text-white">Pesagens Consumidas</span>
              <span className="ml-auto text-xs text-slate-500">
                {selectedPesagens.size} selecionada{selectedPesagens.size === 1 ? '' : 's'}
              </span>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
              {pesagensDisponiveis.length === 0 ? (
                <p className="p-6 text-sm text-slate-500 text-center">Nenhuma pesagem disponível.</p>
              ) : (
                pesagensDisponiveis.map((p) => {
                  const sel = selectedPesagens.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePesagem(p.id)}
                      className={`w-full flex items-center gap-4 px-6 py-3 text-left hover:bg-slate-800/40 transition ${sel ? 'bg-emerald-500/5' : ''}`}
                    >
                      <div className={`flex h-5 w-5 items-center justify-center rounded border-2 shrink-0 ${sel ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                        {sel && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-500">#{p.id}</span>
                          <span className="text-sm font-medium text-white truncate">{p.produtorNome || p.produtor?.nome || 'Sem produtor'}</span>
                          {p.veiculoPlaca && <span className="text-[10px] font-mono uppercase text-slate-500">{p.veiculoPlaca}</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <Calendar size={9} /> {fmt(p.dataHoraEntrada)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold font-mono text-emerald-400">
                          {Number(p.pesoFinal || p.pesoLiquido || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Coluna direita — resumo */}
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 sticky top-24">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-4">Resumo</p>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-500">Cargas consumidas</span>
                <span className="text-white font-mono font-bold">{selectedPesagens.size}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-500">Total entrada</span>
                <span className="text-amber-400 font-mono font-bold">{totalEntrada.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-500">Quantidade produzida</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {form.quantidadeProduzida
                    ? `${Number(form.quantidadeProduzida).toLocaleString('pt-BR')} ${unidadeNome(unidade, Number(form.quantidadeProduzida))}`
                    : '—'}
                </span>
              </div>

              {/* Rendimento destacado */}
              <div className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Rendimento Real</p>
                <p className="text-3xl font-bold font-mono text-white">
                  {rendimentoPreview != null ? `${rendimentoPreview.toFixed(2)}%` : '—'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Média Loanda: 25–28% (fécula)
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-lg shadow-emerald-900/40"
            >
              <Save size={15} /> {saving ? 'Criando...' : 'Criar Lote'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

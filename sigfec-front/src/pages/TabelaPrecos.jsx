import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Calendar, TrendingUp, Package,
  CircleDollarSign, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { confirm } from '../components/ConfirmDialog';
import Tooltip from '../components/Tooltip';
import EmptyState from '../components/EmptyState';
import { isoHoje } from '../utils/relatorio';

const fmtDate = (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
const fmtMoney = (v) => v != null
  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(v))
  : '—';

const todayIso = () => isoHoje();

const isVigente = (t) => {
  const hoje = todayIso();
  return t.dataInicio <= hoje && (!t.dataFim || t.dataFim >= hoje);
};

export default function TabelaPrecos() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [produtos, setProdutos] = useState([]);
  const [selectedProdutoId, setSelectedProdutoId] = useState(searchParams.get('produto') || '');
  const [tabelas, setTabelas] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form novo
  const [form, setForm] = useState({
    dataInicio: todayIso(),
    dataFim: '',
    valor: '',
    observacao: '',
  });
  const [saving, setSaving] = useState(false);

  // Carrega produtos
  useEffect(() => {
    api.get('/produtos').then(({ data }) => setProdutos(data || [])).catch(() => {});
  }, []);

  // Carrega tabelas do produto selecionado
  useEffect(() => {
    if (!selectedProdutoId) { setTabelas([]); return; }
    setLoading(true);
    api.get(`/tabelas-preco/produto/${selectedProdutoId}`)
      .then(({ data }) => setTabelas(data || []))
      .catch(() => toast.error('Falha ao carregar tabelas.'))
      .finally(() => setLoading(false));
  }, [selectedProdutoId]);

  const selectedProduto = useMemo(
    () => produtos.find((p) => String(p.id) === String(selectedProdutoId)),
    [produtos, selectedProdutoId]
  );

  const tabelaVigente = useMemo(() => tabelas.find(isVigente), [tabelas]);
  const valorVigente = tabelaVigente?.valor ?? selectedProduto?.precoBase;

  const handleSelectProduto = (id) => {
    setSelectedProdutoId(id);
    setSearchParams(id ? { produto: id } : {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProdutoId) { toast.error('Selecione um produto.'); return; }
    if (!form.valor || Number(form.valor) <= 0) { toast.error('Valor inválido.'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/tabelas-preco', {
        produto: { id: Number(selectedProdutoId) },
        dataInicio: form.dataInicio,
        dataFim: form.dataFim || null,
        valor: Number(form.valor),
        observacao: form.observacao,
      });
      setTabelas((prev) => [data, ...prev]);
      setForm({ dataInicio: todayIso(), dataFim: '', valor: '', observacao: '' });
      toast.success('Tabela de preço criada.');
    } catch {
      toast.error('Falha ao criar tabela.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Excluir tabela',
      message: `Remover esta entrada da tabela de preços?`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/tabelas-preco/${id}`);
      setTabelas((prev) => prev.filter((t) => t.id !== id));
      toast.success('Removida.');
    } catch { toast.error('Falha ao remover.'); }
  };

  const inputCls = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition';
  const labelCls = 'text-xs font-bold uppercase tracking-wider text-slate-400';

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="produtos"
        title="Tabela de Preços"
        subtitle="Gestão histórica de preços por produto e período"
        action={
          <button type="button" onClick={() => navigate('/produtos')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition">
            <ArrowLeft size={15} /> Produtos
          </button>
        }
      />

      {/* Seleção de produto */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <label className="block">
          <span className={labelCls}>Produto</span>
          <select
            value={selectedProdutoId}
            onChange={(e) => handleSelectProduto(e.target.value)}
            className={inputCls}
          >
            <option value="">Selecione um produto...</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome} — {p.categoria}</option>
            ))}
          </select>
        </label>

        {selectedProduto && (
          <div className="mt-5 grid sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Preço Base (fallback)</p>
              <p className="text-xl font-bold font-mono text-slate-300 mt-1">{fmtMoney(selectedProduto.precoBase)}</p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-[10px] uppercase tracking-widest text-emerald-400">Valor Vigente Hoje</p>
              <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{fmtMoney(valorVigente)}</p>
              <p className="text-[10px] text-slate-500 mt-1">{tabelaVigente ? 'Da tabela' : 'Preço base do produto'}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Histórico</p>
              <p className="text-xl font-bold font-mono text-white mt-1">{tabelas.length}</p>
              <p className="text-[10px] text-slate-500 mt-1">períodos cadastrados</p>
            </div>
          </div>
        )}
      </div>

      {!selectedProdutoId ? (
        <EmptyState icon={Package} accent="violet"
          title="Selecione um produto"
          description="Escolha um produto acima para visualizar e gerenciar sua tabela de preços." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Form novo período */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden sticky top-24">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 border-l-2 border-l-emerald-500">
                <Plus size={15} className="text-emerald-400" />
                <span className="text-sm font-bold text-white">Novo Período</span>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <label className="block">
                  <span className={labelCls}>Valor R$/kg</span>
                  <input type="number" step="0.0001" min="0" value={form.valor}
                    onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
                    placeholder="0,0000" className={`${inputCls} font-mono`} required />
                </label>
                <label className="block">
                  <span className={labelCls}>Início Vigência</span>
                  <input type="date" value={form.dataInicio}
                    onChange={(e) => setForm((p) => ({ ...p, dataInicio: e.target.value }))}
                    className={inputCls} required />
                </label>
                <label className="block">
                  <span className={labelCls}>Fim Vigência <span className="text-slate-600 normal-case">(opcional)</span></span>
                  <input type="date" value={form.dataFim}
                    onChange={(e) => setForm((p) => ({ ...p, dataFim: e.target.value }))}
                    className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>Observação</span>
                  <input type="text" value={form.observacao}
                    onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
                    placeholder="Ex: Safra 2026/1, alta da mandioca" className={inputCls} />
                </label>
                <button type="submit" disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-lg shadow-emerald-900/40">
                  <Plus size={15} /> {saving ? 'Salvando...' : 'Adicionar Tabela'}
                </button>
              </form>
            </div>
          </div>

          {/* Histórico de tabelas */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 border-l-2 border-l-violet-500">
              <Calendar size={15} className="text-violet-400" />
              <span className="text-sm font-bold text-white">Histórico de Preços</span>
              <span className="ml-auto text-xs text-slate-500">{tabelas.length} registro{tabelas.length === 1 ? '' : 's'}</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Carregando...</div>
            ) : tabelas.length === 0 ? (
              <EmptyState icon={CircleDollarSign} accent="emerald"
                title="Sem tabelas para este produto"
                description="Adicione um período de vigência à esquerda. Enquanto não houver tabela vigente, o preço base do produto é usado." />
            ) : (
              <div className="relative space-y-3 p-5 pl-10">
                <div className="absolute left-6 top-6 bottom-6 w-px bg-slate-800" />
                {tabelas.map((t) => {
                  const vigente = isVigente(t);
                  return (
                    <div key={t.id} className="relative flex items-center gap-4">
                      <div className={`absolute -left-4 h-3 w-3 rounded-full border-2 ${vigente ? 'bg-emerald-500 border-emerald-300' : 'bg-slate-700 border-slate-600'}`} />
                      <div className={`flex-1 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${vigente ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/50'}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-2xl font-bold font-mono text-white">{fmtMoney(t.valor)}</p>
                            {vigente && (
                              <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                Vigente
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Calendar size={11} className="text-slate-500" />
                            <span className="font-mono">{fmtDate(t.dataInicio)}</span>
                            <ChevronRight size={11} className="text-slate-700" />
                            <span className="font-mono">{t.dataFim ? fmtDate(t.dataFim) : 'sem prazo'}</span>
                          </div>
                          {t.observacao && (
                            <p className="text-xs text-slate-500 mt-1.5 italic">"{t.observacao}"</p>
                          )}
                        </div>
                        <Tooltip label="Excluir">
                          <button type="button" onClick={() => handleDelete(t.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition">
                            <Trash2 size={13} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

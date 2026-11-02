import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Package, AlertTriangle, Pencil, Scale, CircleDashed } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { confirm } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
import BotaoAcao from '../components/BotaoAcao';
import { TableSkeleton } from '../components/Skeleton';
import { toastUndo } from '../utils/undoToast';
import EditModal from '../components/EditModal';
import { unidadeLabel, formatarQtd, equivalenteKg } from '../utils/unidades';
import { can } from '../theme/permissions';

const CATEGORIA_LABEL = {
  FECULA: 'Fécula', TAPIOCA: 'Tapioca', POLVILHO_DOCE: 'Polvilho Doce',
  POLVILHO_AZEDO_GRANULADO: 'Polvilho Azedo (Gran.)', POLVILHO_AZEDO_PO: 'Polvilho Azedo (Pó)',
  DEXTRINA: 'Dextrina', RESIDUO_FIBROSO: 'Resíduo', MANDIOCA: 'Mandioca',
};

/** Papel do produto no processo (define ordem e o que a tela mostra). */
const TIPO = {
  MANDIOCA: { ordem: 3, label: 'Matéria-prima' },
  RESIDUO_FIBROSO: { ordem: 2, label: 'Subproduto' },
};
const tipoDe = (cat) => TIPO[cat] || { ordem: 1, label: 'Produto acabado' };

export default function EstoqueListagem() {
  const [estoques, setEstoques] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  const carregar = () => {
    setLoading(true);
    Promise.all([api.get('/estoque'), api.get('/produtos').catch(() => ({ data: [] }))])
      .then(([est, prod]) => {
        setEstoques(Array.isArray(est.data) ? est.data : []);
        setProdutos(Array.isArray(prod.data) ? prod.data : []);
      })
      .catch(() => setError('Não foi possível carregar o estoque.'))
      .finally(() => setLoading(false));
  };
  useEffect(carregar, []);

  const abaixoMinimo = (e) => {
    const atual = Number(e.quantidadeAtual || 0);
    const min = Number(e.quantidadeMinima || 0);
    return min > 0 && atual <= min;
  };

  // Todos os produtos do catálogo: os sem registro de estoque aparecem com saldo 0 ("sem movimentação").
  const linhas = useMemo(() => {
    const porProduto = new Map(estoques.map((e) => [e.produto?.id, e]));
    const semCadastro = estoques.filter((e) => !produtos.some((p) => p.id === e.produto?.id));
    const todas = [
      ...produtos.map((p) => porProduto.get(p.id) || { id: null, produto: p, quantidadeAtual: 0, quantidadeMinima: 0, semRegistro: true }),
      ...semCadastro,
    ];
    return todas.sort((a, b) => tipoDe(a.produto?.categoria).ordem - tipoDe(b.produto?.categoria).ordem
      || (a.produto?.nome || '').localeCompare(b.produto?.nome || ''));
  }, [estoques, produtos]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return linhas;
    return linhas.filter((e) => (e.produto?.nome || '').toLowerCase().includes(t));
  }, [linhas, search]);

  const alertas = useMemo(() => estoques.filter(abaixoMinimo).length, [estoques]);

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Excluir registro de estoque',
      message: `Remover este item do estoque?`,
      confirmLabel: 'Excluir', tone: 'danger',
    });
    if (!ok) return;
    const backup = estoques.find((e) => e.id === id);
    setEstoques((prev) => prev.filter((e) => e.id !== id));
    const undone = await toastUndo('Item removido.', () => {
      if (backup) setEstoques((prev) => [backup, ...prev]);
    });
    if (!undone) {
      try { await api.delete(`/estoque/${id}`); }
      catch {
        if (backup) setEstoques((prev) => [backup, ...prev]);
        toast.error('Falha ao excluir.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="estoque"
        title="Controle de Estoque"
        subtitle={`${linhas.length} produtos no catálogo · ${estoques.length} com registro de estoque`}
        action={
          <button type="button" onClick={() => navigate('/estoque/novo')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
            <Plus size={15} /> Novo Item
          </button>
        }
      />

      {alertas > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-400" />
          <span className="text-sm text-slate-300">
            <span className="font-bold text-amber-400">{alertas}</span> produto(s) com estoque no mínimo ou abaixo.
          </span>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {['Produto', 'Categoria', 'Saldo atual', 'Mínimo', 'Situação', 'Ações'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : error ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-red-400">{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-2">
                  <EmptyState icon={Package} accent="sky"
                    title="Estoque vazio"
                    description="Registre o estoque de cada produto acabado (fécula, polvilho, tapioca)."
                    action={
                      <button type="button" onClick={() => navigate('/estoque/novo')}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
                        <Plus size={15} /> Novo Item
                      </button>
                    }
                  />
                </td></tr>
              ) : (
                filtered.map((e) => {
                  const materiaPrima = e.produto?.categoria === 'MANDIOCA';
                  const baixo = !e.semRegistro && abaixoMinimo(e);
                  const un = e.produto?.unidadeMedida;
                  const eqAtual = equivalenteKg(e.quantidadeAtual, un);
                  return (
                    <tr key={e.id ?? `p-${e.produto?.id}`} className={`border-b border-slate-800/60 hover:bg-slate-800/40 transition ${e.semRegistro ? 'opacity-80' : ''}`}>
                      <td className="px-5 py-4 font-medium text-white">{e.produto?.nome || '—'}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {CATEGORIA_LABEL[e.produto?.categoria] || e.produto?.categoria || '—'}
                        </span>
                        <span className="block mt-1 text-[11px] text-slate-500">{tipoDe(e.produto?.categoria).label}</span>
                      </td>
                      <td className="px-5 py-4">
                        {materiaPrima ? <span className="text-slate-500">—</span> : (
                        <span className={`font-mono font-bold ${baixo ? 'text-amber-400' : e.semRegistro ? 'text-slate-400' : 'text-white'}`}>
                          {formatarQtd(e.quantidadeAtual, un)}
                        </span>)}
                        {!materiaPrima && !e.semRegistro && eqAtual && (
                          <span className="block text-[11px] text-slate-600">≈ {eqAtual}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-400">
                        {materiaPrima || e.semRegistro ? '—' : formatarQtd(e.quantidadeMinima, un)}
                      </td>
                      <td className="px-5 py-4">
                        {materiaPrima ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2.5 py-0.5 text-xs font-semibold">
                            <Scale size={11} /> Matéria-prima · controlada pela pesagem
                          </span>
                        ) : e.semRegistro ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 text-xs font-semibold">
                            <CircleDashed size={11} /> Sem movimentação
                          </span>
                        ) : baixo ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold">
                            <AlertTriangle size={11} /> Estoque baixo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Normal
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          {e.semRegistro && !materiaPrima && can('estoque', 'criar') && (
                            <BotaoAcao icon={Plus} label="Registrar estoque" cor="verde" onClick={() => navigate('/estoque/novo')} />
                          )}
                          {!e.semRegistro && can('estoque', 'editar') && (
                            <Tooltip label="Ajustar quantidades">
                              <BotaoAcao icon={Pencil} label="Ajustar quantidades" cor="azul" soIcone dicaNativa={false} onClick={() => setEditing(e)} />
                            </Tooltip>
                          )}
                          {!e.semRegistro && can('estoque', 'excluir') && (
                            <Tooltip label="Excluir">
                              <BotaoAcao icon={Trash2} label="Excluir" cor="vermelho" soIcone dicaNativa={false} onClick={() => handleDelete(e.id)} />
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => setEstoques((prev) => prev.map((e) => e.id === updated.id ? updated : e))}
        title={`Ajustar Estoque — ${editing?.produto?.nome || ''}`}
        endpoint={editing ? `/estoque/${editing.id}` : ''}
        initial={editing ? {
          id: editing.id,
          quantidadeAtual: editing.quantidadeAtual ?? 0,
          quantidadeMinima: editing.quantidadeMinima ?? 0,
        } : {}}
        fields={[
          {
            name: 'quantidadeAtual',
            label: `Quantidade Atual (${unidadeLabel(editing?.produto?.unidadeMedida)})`,
            type: 'number',
          },
          {
            name: 'quantidadeMinima',
            label: `Quantidade Mínima (${unidadeLabel(editing?.produto?.unidadeMedida)})`,
            type: 'number',
          },
        ]}
      />
    </div>
  );
}

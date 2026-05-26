import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Package, AlertTriangle, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { confirm } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
import { TableSkeleton } from '../components/Skeleton';
import { toastUndo } from '../utils/undoToast';
import EditModal from '../components/EditModal';
import { unidadeLabel, formatarQtd, equivalenteKg } from '../utils/unidades';

const CATEGORIA_LABEL = {
  FECULA: 'Fécula', TAPIOCA: 'Tapioca', POLVILHO_DOCE: 'Polvilho Doce',
  POLVILHO_AZEDO_GRANULADO: 'Polvilho Azedo (Gran.)', POLVILHO_AZEDO_PO: 'Polvilho Azedo (Pó)',
  DEXTRINA: 'Dextrina', RESIDUO_FIBROSO: 'Resíduo', MANDIOCA: 'Mandioca',
};

export default function EstoqueListagem() {
  const [estoques, setEstoques] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  const carregar = () => {
    setLoading(true);
    api.get('/estoque')
      .then(({ data }) => setEstoques(data || []))
      .catch(() => setError('Não foi possível carregar o estoque.'))
      .finally(() => setLoading(false));
  };
  useEffect(carregar, []);

  const abaixoMinimo = (e) => {
    const atual = Number(e.quantidadeAtual || 0);
    const min = Number(e.quantidadeMinima || 0);
    return min > 0 && atual <= min;
  };

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return estoques;
    return estoques.filter((e) => (e.produto?.nome || '').toLowerCase().includes(t));
  }, [estoques, search]);

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
        subtitle={`${estoques.length} ${estoques.length === 1 ? 'produto em estoque' : 'produtos em estoque'}`}
        action={
          <button type="button" onClick={() => navigate('/estoque/novo')}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 transition shadow-lg shadow-sky-900/40">
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
                {['Produto', 'Categoria', 'Saldo Atual', 'Mínimo', 'Situação', 'Ações'].map((h) => (
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
                        className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 transition">
                        <Plus size={15} /> Novo Item
                      </button>
                    }
                  />
                </td></tr>
              ) : (
                filtered.map((e) => {
                  const baixo = abaixoMinimo(e);
                  const un = e.produto?.unidadeMedida;
                  const eqAtual = equivalenteKg(e.quantidadeAtual, un);
                  return (
                    <tr key={e.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4 font-medium text-white">{e.produto?.nome || '—'}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {CATEGORIA_LABEL[e.produto?.categoria] || e.produto?.categoria || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`font-mono font-bold ${baixo ? 'text-amber-400' : 'text-white'}`}>
                          {formatarQtd(e.quantidadeAtual, un)}
                        </span>
                        {eqAtual && (
                          <span className="block text-[10px] text-slate-600">≈ {eqAtual}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-400">
                        {formatarQtd(e.quantidadeMinima, un)}
                      </td>
                      <td className="px-5 py-4">
                        {baixo ? (
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
                          <Tooltip label="Ajustar quantidades">
                            <button type="button" onClick={() => setEditing(e)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition">
                              <Pencil size={13} />
                            </button>
                          </Tooltip>
                          <Tooltip label="Excluir">
                            <button type="button" onClick={() => handleDelete(e.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition">
                              <Trash2 size={14} />
                            </button>
                          </Tooltip>
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

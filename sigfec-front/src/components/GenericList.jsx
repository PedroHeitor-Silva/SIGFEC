/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader, MODULES } from '../theme/modules.jsx';
import { confirm } from './ConfirmDialog';
import EmptyState from './EmptyState';
import Tooltip from './Tooltip';
import BotaoAcao from './BotaoAcao';
import { TableSkeleton } from './Skeleton';
import EditModal from './EditModal';

/**
 * Generic list page. Pass module key, endpoint, columns, search keys.
 *
 * columns: [{ label, key, render?, mono?, accent? }]
 * filterFn: (item, term) => boolean
 */
export default function GenericList({
  moduleKey,
  endpoint,
  title,
  newPath,
  newLabel,
  columns,
  filterKeys = ['nome'],
  emptyState,
  searchPlaceholder = 'Buscar...',
  editFields = null, // [{name, label, type, options, required, full}] — habilita botão editar
  editTitle = 'Editar Registro',
  buildEditInitial, // (item) => object — opcional, customiza dados iniciais (ex: omitir senha)
}) {
  const navigate = useNavigate();
  const m = MODULES[moduleKey];
  const Icon = m.icon;

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // item being edited

  useEffect(() => {
    api.get(endpoint)
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setError('Não foi possível carregar.'))
      .finally(() => setLoading(false));
  }, [endpoint]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return items;
    return items.filter((item) =>
      filterKeys.some((k) => String(getKey(item, k) ?? '').toLowerCase().includes(t))
    );
  }, [items, search, filterKeys]);

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: `Excluir registro`,
      message: `Remover registro #${id}? Esta ação é permanente.`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`${endpoint}/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Registro removido.');
    } catch { toast.error('Falha ao excluir.'); }
  };

  const colCount = columns.length + 1;

  return (
    <div className="space-y-5">
      <ModuleHeader
        moduleKey={moduleKey}
        title={title}
        subtitle={`${items.length} ${items.length === 1 ? 'registro' : 'registros'}`}
        action={
          <button
            type="button"
            onClick={() => navigate(newPath)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg ${m.button}`}
          >
            <Plus size={15} /> {newLabel}
          </button>
        }
      />

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {columns.map((c) => (
                  <th key={c.label} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    {c.label}
                  </th>
                ))}
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={colCount} />
              ) : error ? (
                <tr><td colSpan={colCount} className="px-5 py-8 text-center text-red-400">{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={colCount} className="py-2">
                  <EmptyState
                    icon={emptyState?.icon ?? Icon}
                    accent={m.accent}
                    title={search ? 'Nenhum resultado' : emptyState?.title ?? `Nada cadastrado`}
                    description={search ? 'Tente outro termo de busca.' : emptyState?.description ?? 'Cadastre o primeiro registro.'}
                    action={!search && (
                      <button type="button" onClick={() => navigate(newPath)}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${m.button}`}>
                        <Plus size={15} /> {newLabel}
                      </button>
                    )}
                  />
                </td></tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                    {columns.map((c) => (
                      <td key={c.label} className={`px-5 py-4 ${c.mono ? 'font-mono text-xs' : ''} ${c.accent ?? 'text-slate-300'}`}>
                        {c.render ? c.render(item) : (getKey(item, c.key) ?? '-')}
                      </td>
                    ))}
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        {editFields && (
                          <Tooltip label="Editar">
                              <BotaoAcao icon={Pencil} label="Editar" cor="verde" soIcone dicaNativa={false} onClick={() => setEditing(item)} />
                            </Tooltip>
                        )}
                        <Tooltip label="Excluir">
                              <BotaoAcao icon={Trash2} label="Excluir" cor="vermelho" soIcone dicaNativa={false} onClick={() => handleDelete(item.id)} />
                            </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editFields && (
        <EditModal
          open={!!editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))}
          title={editTitle}
          endpoint={editing ? `${endpoint}/${editing.id}` : ''}
          initial={editing ? (buildEditInitial ? buildEditInitial(editing) : editing) : {}}
          fields={editFields}
        />
      )}
    </div>
  );
}

function getKey(obj, path) {
  return path.split('.').reduce((v, k) => v?.[k], obj);
}

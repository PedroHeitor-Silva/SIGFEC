/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil } from 'lucide-react';
import SortableHeader, { applySort } from './SortableHeader';
import DateRangeFilter from './DateRangeFilter';
import { BarraFiltros, CampoBusca, FiltroSelect, opcoesDe, noPeriodo, contem } from './Filtros';
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
 * columns: [{ label, key, render?, mono?, accent?, sortKey?, sortGet?, semOrdem? }]
 *   — toda coluna com key (ou sortKey) vira cabeçalho clicável para ordenar; sortGet ordena por valor calculado.
 * filtros: [{ key, label, get: (item) => valor, options?: [{value,label}] }] — selects; sem options, usa os valores da lista.
 * periodo: { label, get: (item) => 'AAAA-MM-DD' } — filtro de datas.
 * ordemPadrao: { key, dir }
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
  filtros = [],
  periodo = null,
  ordemPadrao = { key: 'id', dir: 'desc' }, // mais recentes primeiro
}) {
  const navigate = useNavigate();
  const m = MODULES[moduleKey];
  const Icon = m.icon;

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [valoresFiltro, setValoresFiltro] = useState({});
  const [datas, setDatas] = useState({ from: '', to: '' });
  const [sort, setSort] = useState(ordemPadrao);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // item being edited

  useEffect(() => {
    api.get(endpoint)
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setError('Não foi possível carregar.'))
      .finally(() => setLoading(false));
  }, [endpoint]);

  const acessores = useMemo(() => Object.fromEntries(columns.filter((c) => c.sortGet).map((c) => [c.sortKey || c.key || c.label, c.sortGet])), [columns]);

  const filtered = useMemo(() => {
    const lista = items.filter((item) =>
      contem(search, ...filterKeys.map((k) => getKey(item, k)))
      && filtros.every((f) => !valoresFiltro[f.key] || String(f.get(item) ?? '') === valoresFiltro[f.key])
      && (!periodo || noPeriodo(periodo.get(item), datas)));
    return applySort(lista, sort, acessores);
  }, [items, search, filterKeys, filtros, valoresFiltro, periodo, datas, sort, acessores]);

  const algumFiltro = !!search || Object.values(valoresFiltro).some(Boolean) || !!datas.from || !!datas.to;
  const limpar = () => { setSearch(''); setValoresFiltro({}); setDatas({ from: '', to: '' }); };

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
        <BarraFiltros total={items.length} exibidos={filtered.length} ativo={algumFiltro} onLimpar={limpar}>
          <CampoBusca value={search} onChange={setSearch} placeholder={searchPlaceholder} />
          {filtros.map((f) => (
            <FiltroSelect key={f.key} label={f.label} value={valoresFiltro[f.key] || ''}
              onChange={(v) => setValoresFiltro((s) => ({ ...s, [f.key]: v }))}
              options={f.options || opcoesDe(items, f.get).map(String)} />
          ))}
          {periodo && (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
              {periodo.label}
              <DateRangeFilter from={datas.from} to={datas.to} onChange={setDatas} />
            </span>
          )}
        </BarraFiltros>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {columns.map((c) => (c.semOrdem || !(c.sortKey || c.key || c.sortGet)) ? (
                  <th key={c.label} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    {c.label}
                  </th>
                ) : (
                  <SortableHeader key={c.label} sortKey={c.sortKey || c.key || c.label} current={sort} onChange={setSort}>{c.label}</SortableHeader>
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
                    title={algumFiltro ? 'Nenhum resultado' : emptyState?.title ?? `Nada cadastrado`}
                    description={algumFiltro ? 'Nenhum registro com esses filtros. Use "Limpar filtros".' : emptyState?.description ?? 'Cadastre o primeiro registro.'}
                    action={!algumFiltro && (
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

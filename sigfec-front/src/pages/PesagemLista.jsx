import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Weight, Printer, Download, Maximize2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { confirm } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
import { TableSkeleton } from '../components/Skeleton';
import { printTicketPesagem } from '../utils/printDoc';
import { exportCSV } from '../utils/csv';
import DateRangeFilter from '../components/DateRangeFilter';
import { toastUndo } from '../utils/undoToast';
import SortableHeader, { applySort } from '../components/SortableHeader';

const STATUS_BADGE = {
  Concluido: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  Pendente: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  Cancelado: 'bg-red-500/10 text-red-400 border border-red-500/20',
  'Em andamento': 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
};

const fmt = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : new Intl.DateTimeFormat('pt-BR').format(d);
};

export default function PesagemLista() {
  const [pesagens, setPesagens] = useState([]);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sort, setSort] = useState({ key: 'dataHoraEntrada', dir: 'desc' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/pesagens')
      .then(({ data }) => setPesagens(data || []))
      .catch(() => setError('Não foi possível carregar as pesagens.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    const from = dateRange.from ? new Date(dateRange.from + 'T00:00:00') : null;
    const to = dateRange.to ? new Date(dateRange.to + 'T23:59:59') : null;
    const matches = pesagens.filter((p) => {
      if (t) {
        const match = (p.produtorNome || '').toLowerCase().includes(t) ||
                      (p.veiculoPlaca || '').toLowerCase().includes(t);
        if (!match) return false;
      }
      if (from || to) {
        const d = p.dataHoraEntrada ? new Date(p.dataHoraEntrada) : null;
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
    return applySort(matches, sort);
  }, [pesagens, search, dateRange, sort]);

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Excluir pesagem',
      message: `Tem certeza que deseja remover a pesagem #${id}?`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;

    // Optimistic: remove do front imediatamente
    const backup = pesagens.find((p) => p.id === id);
    setPesagens((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(id);

    const undone = await toastUndo(`Pesagem #${id} removida.`, () => {
      if (backup) setPesagens((prev) => [backup, ...prev]);
    });

    if (!undone) {
      try {
        await api.delete(`/pesagens/${id}`);
      } catch {
        // backend falhou — restaura
        if (backup) setPesagens((prev) => [backup, ...prev]);
        toast.error('Falha ao excluir no servidor.');
      }
    }
    setDeletingId(null);
  };

  const pesoLiq = (item) => {
    if (item.pesoLiquido != null) return Number(item.pesoLiquido).toFixed(2);
    return '-';
  };

  return (
    <div className="space-y-5">
      

      <ModuleHeader
        moduleKey="pesagem"
        title="Pesagens de Carga"
        subtitle={`${pesagens.length} ${pesagens.length === 1 ? 'pesagem registrada' : 'pesagens registradas'}`}
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/balanca')}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
              title="Modo balança express (fullscreen)"
            >
              <Maximize2 size={15} /> Express
            </button>
            <button
              type="button"
              onClick={() => exportCSV('pesagens.csv', [
                { label: 'ID', key: 'id' },
                { label: 'Data', key: 'dataHoraEntrada' },
                { label: 'Produtor', key: 'produtorNome' },
                { label: 'Placa', key: 'veiculoPlaca' },
                { label: 'Peso Bruto', key: 'pesoBruto' },
                { label: 'Peso Tara', key: 'pesoTara' },
                { label: 'Peso Líquido', key: 'pesoLiquido' },
                { label: 'Peso Final', key: 'pesoFinal' },
                { label: 'Valor Total', key: 'valorTotal' },
              ], filtered)}
              disabled={!filtered.length}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition"
            >
              <Download size={15} /> CSV
            </button>
            <button
              type="button"
              onClick={() => navigate('/pesagem/mandioca')}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 transition shadow-lg shadow-amber-900/40"
            >
              <Plus size={15} /> Nova Pesagem
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por produtor ou placa"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition"
            />
          </div>
          <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={setDateRange} />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <SortableHeader sortKey="id" current={sort} onChange={setSort}>ID</SortableHeader>
                <SortableHeader sortKey="dataHoraEntrada" current={sort} onChange={setSort}>Data</SortableHeader>
                <SortableHeader sortKey="produtorNome" current={sort} onChange={setSort}>Produtor</SortableHeader>
                <SortableHeader sortKey="veiculoPlaca" current={sort} onChange={setSort}>Placa</SortableHeader>
                <SortableHeader sortKey="pesoLiquido" current={sort} onChange={setSort}>Peso Líq.</SortableHeader>
                <SortableHeader sortKey="pesoFinal" current={sort} onChange={setSort}>Peso Final</SortableHeader>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={7} />
              ) : error ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-red-400">{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-2">
                  <EmptyState
                    icon={Weight}
                    accent="amber"
                    title="Nenhuma pesagem registrada"
                    description="Comece registrando a primeira carga que chega no pátio da fecularia."
                    action={
                      <button
                        type="button"
                        onClick={() => navigate('/pesagem/mandioca')}
                        className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 transition"
                      >
                        <Plus size={15} /> Nova Pesagem
                      </button>
                    }
                  />
                </td></tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4 text-slate-500 text-xs">{item.id}</td>
                    <td className="px-5 py-4 text-slate-400">{fmt(item.dataHoraEntrada)}</td>
                    <td className="px-5 py-4 font-medium text-white">{item.produtorNome || '-'}</td>
                    <td className="px-5 py-4 text-slate-400 font-mono">{item.veiculoPlaca || '-'}</td>
                    <td className="px-5 py-4 text-white font-mono">{pesoLiq(item)} kg</td>
                    <td className="px-5 py-4 text-emerald-400 font-mono">{item.pesoFinal ? Number(item.pesoFinal).toFixed(2) + ' kg' : '-'}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        <Tooltip label="Imprimir ticket">
                          <button type="button"
                            onClick={() => printTicketPesagem(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition">
                            <Printer size={14} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Excluir pesagem">
                          <button type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition">
                            <Trash2 size={14} />
                          </button>
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
    </div>
  );
}

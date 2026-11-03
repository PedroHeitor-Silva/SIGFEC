import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Search, Trash2, Weight, Printer, Download, Maximize2, Eye, X,
  Calendar, User, Truck, Package, CheckCircle2, Boxes,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { confirm } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
import BotaoAcao from '../components/BotaoAcao';
import { TableSkeleton } from '../components/Skeleton';
import { printTicketPesagem } from '../utils/printDoc';
import { exportCSV } from '../utils/csv';
import DateRangeFilter from '../components/DateRangeFilter';
import { toastUndo } from '../utils/undoToast';
import SortableHeader, { applySort } from '../components/SortableHeader';
import { pesoFromNumber, maskPlaca } from '../utils/masks';
import { BarraFiltros, CampoBusca, FiltroSelect, opcoesDe } from '../components/Filtros';

const numPesagem = (id) => `PES-${String(id).padStart(6, '0')}`;
const fmtPeso = (v) => (v != null ? pesoFromNumber(Number(v)) : '—');
const fmtDataHora = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// Situação derivada (sem campo status no backend)
const situacaoDe = (p) => p.consumida
  ? { label: 'Consumida', cls: 'bg-slate-700 text-slate-300 border border-slate-600' }
  : { label: 'Disponível', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };

export default function PesagemLista() {
  const [pesagens, setPesagens] = useState([]);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [filtroSituacao, setFiltroSituacao] = useState('TODOS');
  const [sort, setSort] = useState({ key: 'dataHoraEntrada', dir: 'desc' });
  const [fProdutor, setFProdutor] = useState('');
  const [fVeiculo, setFVeiculo] = useState('');
  const [fLaudo, setFLaudo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
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
      if (filtroSituacao === 'DISPONIVEL' && p.consumida) return false;
      if (filtroSituacao === 'CONSUMIDA' && !p.consumida) return false;
      if (fProdutor && p.produtorNome !== fProdutor) return false;
      if (fVeiculo && p.veiculoPlaca !== fVeiculo) return false;
      if (fLaudo === 'COM' && p.gramasAmido == null) return false;
      if (fLaudo === 'SEM' && p.gramasAmido != null) return false;
      if (t) {
        const match = (p.produtorNome || '').toLowerCase().includes(t) ||
                      (p.veiculoPlaca || '').toLowerCase().includes(t) ||
                      (p.produtoNome || '').toLowerCase().includes(t) ||
                      numPesagem(p.id).toLowerCase().includes(t);
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
  }, [pesagens, search, dateRange, sort, filtroSituacao, fProdutor, fVeiculo, fLaudo]);
  const algumFiltro = !!(search || fProdutor || fVeiculo || fLaudo || dateRange.from || dateRange.to || filtroSituacao !== 'TODOS');
  const limpar = () => { setSearch(''); setFProdutor(''); setFVeiculo(''); setFLaudo(''); setDateRange({ from: '', to: '' }); setFiltroSituacao('TODOS'); };

  const totais = useMemo(() => ({
    qtd: filtered.length,
    pesoFinal: filtered.reduce((s, p) => s + Number(p.pesoFinal || 0), 0),
    disponiveis: pesagens.filter((p) => !p.consumida).length,
  }), [filtered, pesagens]);

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Excluir pesagem',
      message: `Remover a pesagem ${numPesagem(id)}?`,
      confirmLabel: 'Excluir', tone: 'danger',
    });
    if (!ok) return;
    const backup = pesagens.find((p) => p.id === id);
    setPesagens((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(id);
    const undone = await toastUndo(`Pesagem ${numPesagem(id)} removida.`, () => {
      if (backup) setPesagens((prev) => [backup, ...prev]);
    });
    if (!undone) {
      try { await api.delete(`/pesagens/${id}`); }
      catch (err) {
        if (backup) setPesagens((prev) => [backup, ...prev]);
        toast.error(err?.response?.data?.error || 'Falha ao excluir no servidor.');
      }
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-5">
      <ModuleHeader
        moduleKey="pesagem"
        title="Pesagens de Carga"
        subtitle={`${pesagens.length} ${pesagens.length === 1 ? 'pesagem registrada' : 'pesagens registradas'} · ${totais.disponiveis} disponível(is)`}
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate('/balanca')}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
              title="Modo balança express (fullscreen)">
              <Maximize2 size={15} /> Express
            </button>
            <button type="button"
              onClick={() => exportCSV('pesagens.csv', [
                { label: 'Nº', key: 'id' },
                { label: 'Data', key: 'dataHoraEntrada' },
                { label: 'Produtor', key: 'produtorNome' },
                { label: 'Produto', key: 'produtoNome' },
                { label: 'Placa', key: 'veiculoPlaca' },
                { label: 'Peso Bruto', key: 'pesoBruto' },
                { label: 'Tara', key: 'pesoTara' },
                { label: 'Peso Líquido', key: 'pesoLiquido' },
                { label: 'Impureza %', key: 'percentualImpureza' },
                { label: 'Peso Final', key: 'pesoFinal' },
              ], filtered)}
              disabled={!filtered.length}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition">
              <Download size={15} /> CSV
            </button>
            <button type="button" onClick={() => navigate('/pesagem/mandioca')}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
              <Plus size={15} /> Nova Pesagem
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        {/* Filtros */}
        <BarraFiltros total={pesagens.length} exibidos={filtered.length} ativo={algumFiltro} onLimpar={limpar}
          ordenacao={`Peso final da lista: ${fmtPeso(totais.pesoFinal)}`}>
          <CampoBusca value={search} onChange={setSearch} placeholder="Buscar nº, produtor, produto ou placa" />
            <div className="flex gap-1.5">
              {[['TODOS', 'Todos'], ['DISPONIVEL', 'Disponíveis'], ['CONSUMIDA', 'Consumidas']].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setFiltroSituacao(k)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                    filtroSituacao === k ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}>{l}</button>
              ))}
            </div>
          <FiltroSelect label="Produtor" value={fProdutor} onChange={setFProdutor} options={opcoesDe(pesagens, (p) => p.produtorNome)} />
          <FiltroSelect label="Veículo" value={fVeiculo} onChange={setFVeiculo} options={opcoesDe(pesagens, (p) => p.veiculoPlaca)} />
          <FiltroSelect label="Laudo" value={fLaudo} onChange={setFLaudo}
            options={[{ value: 'SEM', label: 'Aguardando laudo' }, { value: 'COM', label: 'Com laudo' }]} />
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
            Data <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={setDateRange} />
          </span>
        </BarraFiltros>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <SortableHeader sortKey="id" current={sort} onChange={setSort}>Nº</SortableHeader>
                <SortableHeader sortKey="dataHoraEntrada" current={sort} onChange={setSort}>Data/Hora</SortableHeader>
                <SortableHeader sortKey="produtorNome" current={sort} onChange={setSort}>Produtor</SortableHeader>
                <SortableHeader sortKey="veiculoPlaca" current={sort} onChange={setSort}>Veículo</SortableHeader>
                <SortableHeader sortKey="pesoBruto" current={sort} onChange={setSort}>Bruto</SortableHeader>
                <SortableHeader sortKey="pesoLiquido" current={sort} onChange={setSort}>Líquido</SortableHeader>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Imp.</th>
                <SortableHeader sortKey="pesoFinal" current={sort} onChange={setSort}>Peso Final</SortableHeader>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Situação</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={10} />
              ) : error ? (
                <tr><td colSpan={10} className="px-5 py-8 text-center text-red-400">{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="py-2">
                  <EmptyState icon={Weight} accent="amber"
                    title="Nenhuma pesagem encontrada"
                    description="Comece registrando a primeira carga que chega no pátio da fecularia."
                    action={
                      <button type="button" onClick={() => navigate('/pesagem/mandioca')}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
                        <Plus size={15} /> Nova Pesagem
                      </button>
                    }
                  />
                </td></tr>
              ) : (
                filtered.map((item) => {
                  const sit = situacaoDe(item);
                  return (
                    <tr key={item.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-amber-400 text-xs">{numPesagem(item.id)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{fmtDataHora(item.dataHoraEntrada)}</td>
                      <td className="px-4 py-3 font-medium text-white">{item.produtorNome || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{item.veiculoPlaca ? maskPlaca(item.veiculoPlaca) : '—'}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">{fmtPeso(item.pesoBruto)}</td>
                      <td className="px-4 py-3 text-white font-mono text-xs">{fmtPeso(item.pesoLiquido)}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{item.percentualImpureza != null ? `${item.percentualImpureza}%` : '—'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">{fmtPeso(item.pesoFinal)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${sit.cls}`}>{sit.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Tooltip label="Ver detalhes">
                              <BotaoAcao icon={Eye} label="Ver detalhes" cor="azul" soIcone dicaNativa={false} onClick={() => setDetalhe(item)} />
                            </Tooltip>
                          <Tooltip label="Imprimir comprovante">
                              <BotaoAcao icon={Printer} label="Imprimir comprovante" cor="verde" soIcone dicaNativa={false} onClick={() => printTicketPesagem(item)} />
                            </Tooltip>
                          <Tooltip label="Excluir pesagem">
                              <BotaoAcao icon={Trash2} label="Excluir pesagem" cor="vermelho" soIcone dicaNativa={false} disabled={deletingId === item.id} onClick={() => handleDelete(item.id)} />
                            </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-800/40">
                  <td colSpan={7} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Total peso final ({totais.qtd}):</td>
                  <td colSpan={3} className="px-4 py-3 font-mono font-bold text-emerald-400">{pesoFromNumber(totais.pesoFinal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <DetalheModal pesagem={detalhe} onClose={() => setDetalhe(null)} onImprimir={printTicketPesagem} />
    </div>
  );
}

/* eslint-disable react/prop-types */
function DetalheModal({ pesagem, onClose, onImprimir }) {
  if (typeof document === 'undefined') return null;
  const linha = (icon, label, value) => {
    const Icon = icon;
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-slate-800/60">
        <span className="flex items-center gap-2 text-sm text-slate-400">{Icon && <Icon size={13} />}{label}</span>
        <span className="text-sm font-semibold text-white font-mono">{value}</span>
      </div>
    );
  };
  return createPortal(
    <AnimatePresence>
      {pesagem && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20"><Weight size={14} className="text-amber-400" /></div>
                <div>
                  <h3 className="text-sm font-bold text-white">{numPesagem(pesagem.id)}</h3>
                  <p className="text-[11px] text-slate-500">{fmtDataHora(pesagem.dataHoraEntrada)}</p>
                </div>
              </div>
              <button type="button" aria-label="Fechar" title="Fechar" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"><X size={16} /></button>
            </div>
            <div className="p-6">
              {linha(User, 'Produtor', pesagem.produtorNome || '—')}
              {linha(Package, 'Produto', pesagem.produtoNome || '—')}
              {linha(Truck, 'Veículo', pesagem.veiculoPlaca ? maskPlaca(pesagem.veiculoPlaca) : '—')}
              <div className="h-px bg-slate-800 my-2" />
              {linha(null, 'Peso Bruto', fmtPeso(pesagem.pesoBruto))}
              {linha(null, 'Tara', fmtPeso(pesagem.pesoTara))}
              {linha(null, 'Peso Líquido', fmtPeso(pesagem.pesoLiquido))}
              {linha(null, 'Impureza', pesagem.percentualImpureza != null ? `${pesagem.percentualImpureza}%` : '—')}
              <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400"><CheckCircle2 size={13} /> Peso Final</span>
                <span className="text-xl font-black text-white font-mono">{fmtPeso(pesagem.pesoFinal)}</span>
              </div>
              {pesagem.gramasAmido != null && linha(Boxes, 'Renda (amido)', `${pesagem.gramasAmido} g`)}
              <button type="button" onClick={() => onImprimir(pesagem)}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition">
                <Printer size={15} /> Imprimir comprovante
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

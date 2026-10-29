import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Search, Trash2, Boxes, CheckCircle2, Truck, XCircle, Eye, X,
  Calendar, Scale, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { confirm } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
import { TableSkeleton } from '../components/Skeleton';
import { formatarQtd } from '../utils/unidades';

const STATUS_BADGE = {
  EM_PRODUCAO: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  FINALIZADO:  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  EXPEDIDO:    'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  CANCELADO:   'bg-slate-700 text-slate-400 border border-slate-600',
};

const fmtDate = (v) => v ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00' : v).toLocaleDateString('pt-BR') : '-'; // AAAA-MM-DD é data local

export default function LoteLista() {
  const [lotes, setLotes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detalhe, setDetalhe] = useState(null);
  const navigate = useNavigate();

  const carregar = () => {
    setLoading(true);
    api.get('/lotes')
      .then(({ data }) => setLotes(data || []))
      .catch(() => setError('Não foi possível carregar os lotes.'))
      .finally(() => setLoading(false));
  };
  useEffect(carregar, []);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return lotes;
    return lotes.filter((l) =>
      (l.codigoLote || '').toLowerCase().includes(t) ||
      (l.produto?.nome || '').toLowerCase().includes(t));
  }, [lotes, search]);

  const aplicarStatus = async (lote, novoStatus, msgOk, msgConfirm) => {
    if (msgConfirm) {
      const ok = await confirm({
        title: msgConfirm.title,
        message: msgConfirm.message,
        confirmLabel: msgConfirm.confirmLabel,
        tone: msgConfirm.tone || 'default',
      });
      if (!ok) return;
    }
    try {
      const { data } = await api.patch(`/lotes/${lote.id}/status`, { status: novoStatus });
      setLotes((prev) => prev.map((l) => l.id === lote.id ? data : l));
      toast.success(msgOk);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Falha ao mudar status.');
    }
  };

  const handleFinalizar = (l) => aplicarStatus(l, 'FINALIZADO',
    'Lote finalizado — entrada no estoque registrada.',
    {
      title: 'Finalizar lote',
      message: `Confirmar finalização do lote ${l.codigoLote}? Isso vai adicionar ${l.quantidadeProduzida} ao estoque de ${l.produto?.nome || 'produto'}.`,
      confirmLabel: 'Finalizar',
    });

  const handleExpedir = (l) => aplicarStatus(l, 'EXPEDIDO',
    'Lote marcado como expedido.',
    {
      title: 'Expedir lote',
      message: `Confirmar expedição do lote ${l.codigoLote}? Status terminal — não pode ser revertido.`,
      confirmLabel: 'Expedir',
    });

  const handleCancelar = (l) => aplicarStatus(l, 'CANCELADO',
    'Lote cancelado. Pesagens liberadas.',
    {
      title: 'Cancelar lote',
      message: `Cancelar o lote ${l.codigoLote}? As pesagens vinculadas voltam a ficar disponíveis.`,
      confirmLabel: 'Cancelar lote',
      tone: 'warning',
    });

  const handleDelete = async (l) => {
    const ok = await confirm({
      title: 'Excluir lote',
      message: `Remover ${l.codigoLote}? Lotes FINALIZADOS/EXPEDIDOS não podem ser excluídos.`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/lotes/${l.id}`);
      setLotes((prev) => prev.filter((x) => x.id !== l.id));
      toast.success('Lote removido.');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Falha ao excluir.');
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="lotes"
        title="Lotes de Produção"
        subtitle={`${lotes.length} ${lotes.length === 1 ? 'lote' : 'lotes'}`}
        action={
          <button type="button" onClick={() => navigate('/lotes/novo')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/40">
            <Plus size={15} /> Novo Lote
          </button>
        }
      />

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código ou produto"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {['Código', 'Produto', 'Fabricação', 'Quantidade', 'Rendimento', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={7} />
              ) : error ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-red-400">{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-2">
                  <EmptyState icon={Boxes} accent="emerald"
                    title="Nenhum lote registrado"
                    description="Vincule pesagens à produção pra gerar rastreabilidade e dar entrada no estoque."
                    action={
                      <button type="button" onClick={() => navigate('/lotes/novo')}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
                        <Plus size={15} /> Novo Lote
                      </button>
                    }
                  />
                </td></tr>
              ) : (
                filtered.map((l) => {
                  const status = l.statusLote || 'EM_PRODUCAO';
                  const r = l.rendimentoReal != null ? Number(l.rendimentoReal) : null;
                  const rColor = r == null ? 'text-slate-600'
                    : r >= 25 ? 'text-emerald-400'
                    : r >= 18 ? 'text-amber-400'
                    : 'text-rose-400';
                  return (
                    <tr key={l.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-white">{l.codigoLote}</td>
                      <td className="px-4 py-3 text-slate-300">{l.produto?.nome || '-'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{fmtDate(l.dataFabricacao)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        {formatarQtd(l.quantidadeProduzida, l.produto?.unidadeMedida)}
                      </td>
                      <td className={`px-4 py-3 font-mono font-bold ${rColor}`}>
                        {r != null ? `${r.toFixed(2)}%` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[status] || 'bg-slate-700 text-slate-400'}`}>
                          {status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Tooltip label="Ver detalhes">
                            <button type="button" onClick={() => setDetalhe(l)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition">
                              <Eye size={14} />
                            </button>
                          </Tooltip>
                          {status === 'EM_PRODUCAO' && (
                            <>
                              <Tooltip label="Finalizar (entra no estoque)">
                                <button type="button" onClick={() => handleFinalizar(l)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition">
                                  <CheckCircle2 size={14} />
                                </button>
                              </Tooltip>
                              <Tooltip label="Cancelar lote">
                                <button type="button" onClick={() => handleCancelar(l)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition">
                                  <XCircle size={14} />
                                </button>
                              </Tooltip>
                            </>
                          )}
                          {status === 'FINALIZADO' && (
                            <Tooltip label="Expedir">
                              <button type="button" onClick={() => handleExpedir(l)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition">
                                <Truck size={14} />
                              </button>
                            </Tooltip>
                          )}
                          {(status === 'EM_PRODUCAO' || status === 'CANCELADO') && (
                            <Tooltip label="Excluir">
                              <button type="button" onClick={() => handleDelete(l)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition">
                                <Trash2 size={14} />
                              </button>
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

      <LoteDetalheModal lote={detalhe} onClose={() => setDetalhe(null)} />
    </div>
  );
}

/* eslint-disable react/prop-types */
function LoteDetalheModal({ lote, onClose }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {lote && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <Boxes size={14} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Lote {lote.codigoLote}</h3>
                  <p className="text-[11px] text-slate-500">{lote.produto?.nome}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition">
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                <Box label="Quantidade" value={formatarQtd(lote.quantidadeProduzida, lote.produto?.unidadeMedida)} accent="text-emerald-400" />
                <Box label="Rendimento" value={lote.rendimentoReal != null ? `${Number(lote.rendimentoReal).toFixed(2)}%` : '—'} accent="text-sky-400" />
                <Box label="Fabricação" value={fmtDate(lote.dataFabricacao)} icon={Calendar} />
                <Box label="Validade" value={fmtDate(lote.validade)} icon={Calendar} />
              </div>

              {lote.observacao && (
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Observação</p>
                  <p className="text-sm text-slate-300">{lote.observacao}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                  <Scale size={12} /> Pesagens Consumidas ({lote.pesagensConsumidas?.length || 0})
                </p>
                {(!lote.pesagensConsumidas || lote.pesagensConsumidas.length === 0) ? (
                  <p className="text-sm text-slate-600 italic">Nenhuma pesagem vinculada.</p>
                ) : (
                  <div className="rounded-lg border border-slate-700 divide-y divide-slate-800">
                    {lote.pesagensConsumidas.map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <div>
                          <span className="font-mono text-xs text-slate-500">#{p.id}</span>
                          <span className="ml-2 text-white">{p.produtor?.nome || 'Sem produtor'}</span>
                          {p.veiculo?.placa && (
                            <span className="ml-2 text-[10px] font-mono uppercase text-slate-500">{p.veiculo.placa}</span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-amber-400">
                          {Number(p.pesoFinal || p.pesoLiquido || 0).toLocaleString('pt-BR')} kg
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {lote.statusLote === 'EM_PRODUCAO' && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <span className="text-xs text-slate-300">
                    Lote em produção — finalize para dar entrada no estoque.
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function Box({ label, value, accent = 'text-white', icon: Icon }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
        {Icon && <Icon size={9} />} {label}
      </p>
      <p className={`mt-1 text-sm font-mono font-bold ${accent}`}>{value || '—'}</p>
    </div>
  );
}

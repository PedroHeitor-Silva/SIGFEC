import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Trash2, TrendingDown, TrendingUp, DollarSign,
  CheckCircle2, RotateCcw, Printer, AlertTriangle, Clock, QrCode,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { confirm } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import BotaoAcao from '../components/BotaoAcao';
import { TableSkeleton } from '../components/Skeleton';
import { toastUndo } from '../utils/undoToast';
import { printReciboFinanceiro } from '../utils/printDoc';
import { maskMoeda, unmaskMoeda, moedaFromNumber } from '../utils/masks';
import CobrancaModal from '../components/CobrancaModal';
import { isoHoje } from '../utils/relatorio';
import { FORMAS_PAGAMENTO, formaLabel } from '../utils/formasPagamento';

const STATUS_BADGE = {
  ABERTO: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  PAGO: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  CANCELADO: 'bg-slate-700 text-slate-400',
  ATRASADO: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_ICON = { PAGO: CheckCircle2, ATRASADO: AlertTriangle, ABERTO: Clock };

const fmtMoeda = (v) =>
  v != null
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))
    : '-';
const fmtData = (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
const todayIso = () => isoHoje();

export default function FinanceiroListagem() {
  const [titulos, setTitulos] = useState([]);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [aba, setAba] = useState('ABERTO'); // ABERTO | HISTORICO
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [baixando, setBaixando] = useState(null); // título sendo quitado
  const [cobrancaTitulo, setCobrancaTitulo] = useState(null); // título p/ cobrança Asaas
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/financeiro')
      .then(({ data }) => setTitulos(data || []))
      .catch(() => setError('Não foi possível carregar os lançamentos.'))
      .finally(() => setLoading(false));
  }, []);

  const tipoDe = (t) => (t.fornecedor ? 'PAGAR' : t.cliente ? 'RECEBER' : '—');
  const parceiroDe = (t) => t.fornecedor?.nome ?? t.cliente?.nome ?? '-';
  const saldoDe = (t) => Math.max(0, Number(t.valorOriginal || 0) - Number(t.valorPago || 0));

  const filtered = useMemo(() => {
    return titulos.filter((t) => {
      // Aba: ABERTO mostra o que ainda tem saldo; HISTORICO mostra quitados e cancelados
      const encerrado = t.statusFinanceiro === 'PAGO' || t.statusFinanceiro === 'CANCELADO';
      if (aba === 'ABERTO' && encerrado) return false;
      if (aba === 'HISTORICO' && !encerrado) return false;
      const tipo = tipoDe(t);
      if (filtroTipo !== 'TODOS' && tipo !== filtroTipo) return false;
      if (aba === 'ABERTO' && filtroStatus !== 'TODOS' && t.statusFinanceiro !== filtroStatus) return false;
      if (!search) return true;
      return parceiroDe(t).toLowerCase().includes(search.toLowerCase());
    });
  }, [titulos, search, filtroTipo, filtroStatus, aba]);

  // Histórico ordenado por data de pagamento (mais recente primeiro)
  const historicoOrdenado = useMemo(() => {
    if (aba !== 'HISTORICO') return filtered;
    return [...filtered].sort((a, b) =>
      new Date(b.dataPagamento || 0) - new Date(a.dataPagamento || 0));
  }, [filtered, aba]);

  const listaExibida = aba === 'HISTORICO' ? historicoOrdenado : filtered;

  const totais = useMemo(() => {
    const pagarAberto = titulos.filter((t) => t.fornecedor && t.statusFinanceiro !== 'PAGO' && t.statusFinanceiro !== 'CANCELADO')
      .reduce((s, t) => s + saldoDe(t), 0);
    const receberAberto = titulos.filter((t) => t.cliente && t.statusFinanceiro !== 'PAGO' && t.statusFinanceiro !== 'CANCELADO')
      .reduce((s, t) => s + saldoDe(t), 0);
    // inclui as baixas parciais (valorPago acumulado) dos títulos ainda em aberto
    const recebido = titulos.filter((t) => t.cliente && t.statusFinanceiro !== 'CANCELADO')
      .reduce((s, t) => s + Number(t.valorPago || 0), 0);
    const pago = titulos.filter((t) => t.fornecedor && t.statusFinanceiro !== 'CANCELADO')
      .reduce((s, t) => s + Number(t.valorPago || 0), 0);
    const atrasados = titulos.filter((t) => t.statusFinanceiro === 'ATRASADO').length;
    return { pagarAberto, receberAberto, recebido, pago, atrasados };
  }, [titulos]);

  const aplicarBaixa = async (id, body) => {
    const { data } = await api.patch(`/financeiro/${id}/baixar`, body);
    setTitulos((prev) => prev.map((t) => t.id === id ? data : t));
    return data;
  };

  const estornar = async (t) => {
    const ok = await confirm({
      title: 'Estornar baixa',
      message: `Reverter o pagamento do título #${t.id}? Volta para ABERTO.`,
      confirmLabel: 'Estornar',
      tone: 'warning',
    });
    if (!ok) return;
    try {
      const { data } = await api.patch(`/financeiro/${t.id}/estornar`);
      setTitulos((prev) => prev.map((x) => x.id === t.id ? data : x));
      toast.success('Baixa estornada.');
    } catch (err) { toast.error(err?.response?.data?.error || 'Falha ao estornar.'); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Excluir lançamento',
      message: `Remover título #${id}?`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    const backup = titulos.find((t) => t.id === id);
    setTitulos((prev) => prev.filter((t) => t.id !== id));
    const undone = await toastUndo(`Título #${id} removido.`, () => {
      if (backup) setTitulos((prev) => [backup, ...prev]);
    });
    if (!undone) {
      try { await api.delete(`/financeiro/${id}`); }
      catch (err) {
        if (backup) setTitulos((prev) => [backup, ...prev]);
        toast.error(err?.response?.data?.error || 'Falha ao excluir no servidor.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="financeiro"
        title="Contas e Movimentações"
        subtitle={`${titulos.length} ${titulos.length === 1 ? 'título' : 'títulos'}`}
        action={
          <button
            type="button"
            onClick={() => navigate('/financeiro/novo')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition"
          >
            <Plus size={15} /> Novo Lançamento
          </button>
        }
      />

      {/* Totais detalhados */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardTotal label="A Receber (aberto)" valor={totais.receberAberto} accent="emerald" icon={TrendingUp} />
        <CardTotal label="A Pagar (aberto)" valor={totais.pagarAberto} accent="rose" icon={TrendingDown} />
        <CardTotal label="Já Recebido" valor={totais.recebido} accent="sky" icon={CheckCircle2} />
        <CardTotal label="Já Pago" valor={totais.pago} accent="violet" icon={CheckCircle2} />
      </div>

      {totais.atrasados > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-400" />
          <span className="text-sm text-slate-300">
            <span className="font-bold text-red-400">{totais.atrasados}</span> título(s) em atraso — vencimento ultrapassado sem quitação.
          </span>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        {/* Abas: Em Aberto / Histórico */}
        <div className="flex border-b border-slate-800">
          {[
            { key: 'ABERTO', label: 'Em Aberto', icon: Clock },
            { key: 'HISTORICO', label: 'Histórico (Pagas)', icon: CheckCircle2 },
          ].map((a) => {
            const Icon = a.icon;
            const active = aba === a.key;
            return (
              <button key={a.key} type="button" onClick={() => setAba(a.key)}
                className={`relative inline-flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-wider transition ${
                  active ? 'text-lime-400' : 'text-slate-500 hover:text-white'
                }`}>
                <Icon size={13} /> {a.label}
                {active && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-lime-500 rounded-t" />}
              </button>
            );
          })}
        </div>

        <div className="px-5 py-4 border-b border-slate-800 flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar parceiro"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition"
            />
          </div>
          <div className="flex flex-nowrap items-center gap-1.5">
            {['TODOS', 'RECEBER', 'PAGAR'].map((t) => (
              <button key={t} type="button" onClick={() => setFiltroTipo(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                  filtroTipo === t ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}>
                {t}
              </button>
            ))}
            {aba === 'ABERTO' && (<>
              <span className="w-px bg-slate-700 mx-1" />
              {['TODOS', 'ABERTO', 'ATRASADO'].map((s) => (
                <button key={s} type="button" onClick={() => setFiltroStatus(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                    filtroStatus === s ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}>
                  {s}
                </button>
              ))}
            </>)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {(aba === 'HISTORICO'
                  ? ['ID', 'Tipo', 'Parceiro', 'Valor', 'Pago', 'Pago em', 'Forma', 'Ações']
                  : ['ID', 'Tipo', 'Parceiro', 'Valor', 'Pago', 'Saldo', 'Vencimento', 'Status', 'Ações']
                ).map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={aba === 'HISTORICO' ? 8 : 9} />
              ) : error ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-red-400">{error}</td></tr>
              ) : listaExibida.length === 0 ? (
                <tr><td colSpan={9} className="py-2">
                  <EmptyState
                    icon={aba === 'HISTORICO' ? CheckCircle2 : DollarSign}
                    accent="lime"
                    title={aba === 'HISTORICO' ? 'Nenhuma conta quitada ainda' : 'Sem lançamentos em aberto'}
                    description={aba === 'HISTORICO'
                      ? 'Contas pagas/recebidas aparecem aqui com data e forma de pagamento.'
                      : 'Registre contas a pagar (fornecedores) ou a receber (clientes).'}
                    action={aba === 'ABERTO' && (
                      <button type="button" onClick={() => navigate('/financeiro/novo')}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
                        <Plus size={15} /> Novo Lançamento
                      </button>
                    )}
                  />
                </td></tr>
              ) : (
                listaExibida.map((t) => {
                  const tipo = tipoDe(t);
                  const saldo = saldoDe(t);
                  const StatusIcon = STATUS_ICON[t.statusFinanceiro] || Clock;
                  const quitado = t.statusFinanceiro === 'PAGO';
                  return (
                    <tr key={t.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">#{t.id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${tipo === 'PAGAR' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {tipo === 'PAGAR' ? <TrendingDown size={9} /> : <TrendingUp size={9} />}
                          {tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-white min-w-[220px]">{parceiroDe(t)}</td>
                      <td className="px-4 py-3 text-white font-mono">{fmtMoeda(t.valorOriginal)}</td>
                      <td className="px-4 py-3 font-mono text-emerald-400">{fmtMoeda(t.valorPago)}</td>
                      {aba === 'HISTORICO' ? (
                        <>
                          <td className="px-4 py-3 text-slate-300 font-mono">{fmtData(t.dataPagamento)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              {formaLabel(t.formaPagamento)}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={`px-4 py-3 font-mono font-bold ${saldo > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                            {saldo > 0 ? fmtMoeda(saldo) : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-400">{fmtData(t.dataVencimento)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[t.statusFinanceiro] ?? 'bg-slate-700 text-slate-400'}`}>
                              <StatusIcon size={10} /> {t.statusFinanceiro || '-'}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex flex-nowrap items-center gap-1.5">
                          {!quitado && t.statusFinanceiro !== 'CANCELADO' && (
                            <BotaoAcao icon={CheckCircle2} label={tipo === 'RECEBER' ? 'Receber' : 'Pagar'} cor="verde" onClick={() => setBaixando(t)} />
                          )}
                          {!quitado && t.statusFinanceiro !== 'CANCELADO' && tipo === 'RECEBER' && (
                            <BotaoAcao icon={QrCode} label="Gerar cobrança PIX / Boleto" cor="roxo" soIcone onClick={() => setCobrancaTitulo(t)} />
                          )}
                          {(quitado || Number(t.valorPago) > 0) && (
                            <BotaoAcao icon={Printer} label="Imprimir comprovante" cor="azul" soIcone={!quitado} onClick={() => printReciboFinanceiro(t)} />
                          )}
                          {quitado && <BotaoAcao icon={RotateCcw} label="Estornar baixa" cor="ambar" soIcone onClick={() => estornar(t)} />}
                          <BotaoAcao icon={Trash2} label="Excluir título" cor="vermelho" soIcone onClick={() => handleDelete(t.id)} />
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

      {/* Modal cobrança Asaas (PIX / Boleto) */}
      <CobrancaModal
        open={!!cobrancaTitulo}
        onClose={() => setCobrancaTitulo(null)}
        conta={cobrancaTitulo}
        onUpdated={(atualizada) =>
          setTitulos((prev) => prev.map((t) => t.id === atualizada.id ? { ...t, ...atualizada } : t))}
      />

      {/* Modal de baixa */}
      <BaixaModal
        titulo={baixando}
        onClose={() => setBaixando(null)}
        onConfirm={async (body) => {
          try {
            const atualizado = await aplicarBaixa(baixando.id, body);
            toast.success(atualizado?.statusFinanceiro === 'PAGO' ? 'Título quitado.'
              : `Baixa parcial registrada. Saldo: ${fmtMoeda(saldoDe(atualizado))}.`);
            setBaixando(null);
          } catch (err) { toast.error(err?.response?.data?.error || 'Falha ao dar baixa.'); }
        }}
      />
    </div>
  );
}

function CardTotal({ label, valor, accent, icon: Icon }) {
  const A = {
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
    rose: 'border-rose-500/20 bg-rose-500/5 text-rose-400',
    sky: 'border-sky-500/20 bg-sky-500/5 text-sky-400',
    violet: 'border-violet-500/20 bg-violet-500/5 text-violet-400',
  }[accent];
  return (
    <div className={`rounded-xl border p-5 ${A.split(' ')[0]} ${A.split(' ')[1]}`}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-bold uppercase tracking-wider ${A.split(' ')[2]}`}>{label}</p>
        <Icon size={16} className={A.split(' ')[2]} />
      </div>
      <p className="mt-2 text-2xl font-bold text-white font-mono">{fmtMoeda(valor)}</p>
    </div>
  );
}

/* eslint-disable react/prop-types */
function BaixaModal({ titulo, onClose, onConfirm }) {
  const [valorPago, setValorPago] = useState('');
  const [dataPagamento, setDataPagamento] = useState(todayIso());
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (titulo) {
      const saldo = Math.max(0, Number(titulo.valorOriginal || 0) - Number(titulo.valorPago || 0));
      setValorPago(moedaFromNumber(saldo));
      setDataPagamento(todayIso());
      // forma combinada na venda (ex.: cartão de crédito) já vem selecionada
      setFormaPagamento(titulo.formaPagamento || 'PIX');
    }
  }, [titulo]);

  if (typeof document === 'undefined') return null;

  const tipo = titulo?.fornecedor ? 'PAGAR' : 'RECEBER';
  const inputCls = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-500 transition';
  const labelCls = 'text-xs font-bold uppercase tracking-wider text-slate-400';

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onConfirm({ valorPago: unmaskMoeda(valorPago), dataPagamento, formaPagamento });
    setSaving(false);
  };

  return createPortal(
    <AnimatePresence>
      {titulo && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
              <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Dar Baixa — Título #{titulo.id}</h3>
                <p className="text-[11px] text-slate-500">
                  {tipo === 'PAGAR' ? 'Pagamento ao fornecedor' : 'Recebimento do cliente'}
                  {' • '}{titulo.fornecedor?.nome || titulo.cliente?.nome}
                </p>
              </div>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 flex justify-between text-sm">
                <span className="text-slate-400">Valor original</span>
                <span className="text-white font-mono font-bold">{fmtMoeda(titulo.valorOriginal)}</span>
              </div>

              <label className="block">
                <span className={labelCls}>Valor Pago (R$)</span>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">R$</span>
                  <input type="text" inputMode="numeric" value={valorPago}
                    onChange={(e) => setValorPago(maskMoeda(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 text-white font-mono outline-none focus:border-emerald-500 transition"
                    required autoFocus />
                </div>
                <span className="mt-1 block text-[11px] text-slate-600">
                  Pagamento parcial mantém título em aberto com saldo restante.
                </span>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className={labelCls}>Data Pagamento</span>
                  <input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} className={inputCls} required />
                </label>
                <label className="block">
                  <span className={labelCls}>Forma</span>
                  <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className={inputCls}>
                    {FORMAS_PAGAMENTO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition">
                  <CheckCircle2 size={14} /> {saving ? 'Processando...' : 'Confirmar Baixa'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

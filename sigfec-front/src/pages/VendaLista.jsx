import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Trash2, ShoppingCart, CheckCircle2, FileText, XCircle, Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { confirm } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import BotaoAcao from '../components/BotaoAcao';
import { TableSkeleton } from '../components/Skeleton';
import { printNotaFiscal } from '../utils/printDoc';

const STATUS_BADGE = {
  ORCAMENTO: 'bg-slate-700 text-slate-300',
  CONFIRMADA: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  FATURADA: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  CANCELADA: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const fmtMoeda = (v) =>
  v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v)) : '-';
const fmtData = (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

export default function VendaLista() {
  const [vendas, setVendas] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const carregar = () => {
    setLoading(true);
    api.get('/vendas')
      .then(({ data }) => setVendas(data || []))
      .catch(() => setError('Não foi possível carregar as vendas.'))
      .finally(() => setLoading(false));
  };
  useEffect(carregar, []);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return vendas;
    return vendas.filter((v) =>
      (v.cliente?.nome || '').toLowerCase().includes(t) ||
      String(v.numeroNota || '').includes(t)
    );
  }, [vendas, search]);

  const totais = useMemo(() => {
    const faturado = vendas.filter((v) => v.statusVenda === 'FATURADA' || v.statusVenda === 'CONFIRMADA')
      .reduce((s, v) => s + Number(v.valorTotal || 0), 0);
    const orcamentos = vendas.filter((v) => v.statusVenda === 'ORCAMENTO').length;
    return { faturado, orcamentos, total: vendas.length };
  }, [vendas]);

  const confirmar = async (v) => {
    const ok = await confirm({
      title: 'Confirmar venda',
      message: `Confirmar venda #${v.id}? Isto baixa o estoque dos produtos e gera uma conta a receber de ${fmtMoeda(v.valorTotal)}.`,
      confirmLabel: 'Confirmar', tone: 'info',
    });
    if (!ok) return;
    try {
      await api.patch(`/vendas/${v.id}/confirmar`);
      toast.success('Venda confirmada. Estoque baixado e conta a receber gerada.');
      carregar();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Falha ao confirmar.';
      toast.error(msg);
    }
  };

  const faturar = async (v) => {
    try {
      const { data } = await api.patch(`/vendas/${v.id}/faturar`);
      toast.success(`Nota fiscal #${data.numeroNota} emitida.`);
      carregar();
    } catch (err) { toast.error(err?.response?.data?.error || 'Falha ao faturar.'); }
  };

  const cancelar = async (v) => {
    const confirmada = v.statusVenda === 'CONFIRMADA';
    const ok = await confirm({
      title: 'Cancelar venda',
      message: confirmada
        ? `Cancelar venda #${v.id}? O estoque baixado volta (devolução no Kardex) e a conta a receber é cancelada.`
        : `Cancelar venda #${v.id}?`,
      confirmLabel: 'Cancelar venda', tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.patch(`/vendas/${v.id}/cancelar`);
      toast.success(confirmada ? 'Venda cancelada — estoque devolvido e conta cancelada.' : 'Venda cancelada.');
      carregar();
    } catch (err) { toast.error(err?.response?.data?.error || 'Falha ao cancelar.'); }
  };

  const excluir = async (v) => {
    const ok = await confirm({
      title: 'Excluir venda', message: `Remover venda #${v.id} permanentemente?`,
      confirmLabel: 'Excluir', tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/vendas/${v.id}`);
      setVendas((prev) => prev.filter((x) => x.id !== v.id));
      toast.success('Venda removida.');
    } catch (err) { toast.error(err?.response?.data?.error || 'Falha ao excluir.'); }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="vendas"
        title="Vendas de Produtos"
        subtitle={`${vendas.length} ${vendas.length === 1 ? 'venda registrada' : 'vendas registradas'}`}
        action={
          <button type="button" onClick={() => navigate('/vendas/nova')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/40">
            <Plus size={15} /> Nova Venda
          </button>
        }
      />

      {/* Totais */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Vendido</p>
          <p className="mt-2 text-2xl font-bold text-white font-mono">{fmtMoeda(totais.faturado)}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Orçamentos</p>
          <p className="mt-2 text-2xl font-bold text-white font-mono">{totais.orcamentos}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total de Vendas</p>
          <p className="mt-2 text-2xl font-bold text-white font-mono">{totais.total}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente ou nº nota"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {['ID', 'NF', 'Cliente', 'Data', 'Itens', 'Valor', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={8} />
              ) : error ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-red-400">{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-2">
                  <EmptyState icon={ShoppingCart} accent="emerald"
                    title="Nenhuma venda registrada"
                    description="Registre a venda de fécula, polvilho e outros produtos aos clientes."
                    action={
                      <button type="button" onClick={() => navigate('/vendas/nova')}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
                        <Plus size={15} /> Nova Venda
                      </button>
                    }
                  />
                </td></tr>
              ) : (
                filtered.map((v) => {
                  const st = v.statusVenda || 'ORCAMENTO';
                  return (
                    <tr key={v.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">#{v.id}</td>
                      <td className="px-4 py-3 font-mono text-white font-bold">
                        {v.numeroNota ? String(v.numeroNota).padStart(6, '0') : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-white min-w-[220px]">{v.cliente?.nome || '—'}</td>
                      <td className="px-4 py-3 text-slate-400">{fmtData(v.dataVenda)}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono">{(v.itens || []).length}</td>
                      <td className="px-4 py-3 text-emerald-400 font-mono font-bold">{fmtMoeda(v.valorTotal)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[st]}`}>
                          {st}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-nowrap items-center gap-1.5">
                          {st === 'ORCAMENTO' && <BotaoAcao icon={CheckCircle2} label="Confirmar" cor="verde" onClick={() => confirmar(v)} />}
                          {st === 'CONFIRMADA' && <BotaoAcao icon={FileText} label="Emitir nota" cor="verde" onClick={() => faturar(v)} />}
                          {st !== 'CANCELADA' && (
                            <BotaoAcao icon={Printer} label={st === 'FATURADA' ? 'Imprimir nota' : 'Imprimir pedido'} cor="azul" soIcone={st !== 'FATURADA'} onClick={() => printNotaFiscal(v)} />
                          )}
                          {st !== 'CANCELADA' && st !== 'FATURADA' && <BotaoAcao icon={XCircle} label="Cancelar venda" cor="ambar" soIcone onClick={() => cancelar(v)} />}
                          {(st === 'ORCAMENTO' || st === 'CANCELADA') && <BotaoAcao icon={Trash2} label="Excluir venda" cor="vermelho" soIcone onClick={() => excluir(v)} />}
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
    </div>
  );
}

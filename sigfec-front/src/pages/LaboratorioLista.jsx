import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Beaker, Printer, Download } from 'lucide-react';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
import { TableSkeleton } from '../components/Skeleton';
import { printLaudoLaboratorio } from '../utils/printDoc';
import { exportCSV } from '../utils/csv';

const fmt = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : new Intl.DateTimeFormat('pt-BR').format(d);
};

const rendaBadge = (v) => {
  if (v >= 500) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  if (v >= 350) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  return 'bg-red-500/10 text-red-400 border border-red-500/20';
};

export default function LaboratorioLista() {
  const [analises, setAnalises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/laboratorio')
      .then(({ data }) => setAnalises(data || []))
      .catch(() => setError('Não foi possível carregar as análises.'))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() =>
    [...analises].sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao)),
    [analises]
  );

  return (
    <div className="space-y-5">
      <ModuleHeader
        moduleKey="laboratorio"
        title="Análises de Qualidade"
        subtitle={`${analises.length} ${analises.length === 1 ? 'laudo emitido' : 'laudos emitidos'}`}
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => exportCSV('analises.csv', [
                { label: 'ID', key: 'id' },
                { label: 'Data', key: 'dataCriacao' },
                { label: 'Carga', key: 'pesagem.id' },
                { label: 'Produtor', key: 'pesagem.produtor.nome' },
                { label: 'Amostras', key: (a) => (a.amostras || []).length },
                { label: 'Renda Media (g)', key: 'rendaMedia' },
                { label: 'Status', key: 'statusQualidade' },
              ], sorted)}
              disabled={!sorted.length}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition"
            >
              <Download size={15} /> CSV
            </button>
            <button
              type="button"
              onClick={() => navigate('/laboratorio/novo')}
              className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-500 transition shadow-lg shadow-fuchsia-900/40"
            >
              <Plus size={15} /> Nova Análise
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {['Data', 'Produtor', 'Amostras', 'Renda Média', 'Status', 'Carga', 'Ações'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={7} widths={[120, 160, 70, 90, 110, 60, 40]} />
              ) : error ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-red-400">{error}</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={7} className="py-2">
                  <EmptyState
                    icon={Beaker}
                    accent="fuchsia"
                    title="Nenhuma análise registrada"
                    description="Emita o primeiro laudo após uma pesagem para medir a renda da carga."
                    action={
                      <button type="button" onClick={() => navigate('/laboratorio/novo')}
                        className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-500 transition">
                        <Plus size={15} /> Nova Análise
                      </button>
                    }
                  />
                </td></tr>
              ) : (
                sorted.map((item) => {
                  const renda = Number(item.rendaMedia ?? 0);
                  const qtdAmostras = (item.amostras || []).length;
                  const status = item.statusQualidade || 'AGUARDANDO_ANALISE';
                  const STATUS_BADGE = {
                    APROVADO: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                    APROVADO_COM_DESCONTO: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                    REPROVADO: 'bg-red-500/10 text-red-400 border border-red-500/20',
                    AGUARDANDO_ANALISE: 'bg-slate-700 text-slate-400',
                  };
                  return (
                    <tr key={item.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4 text-slate-400">{fmt(item.dataCriacao)}</td>
                      <td className="px-5 py-4 font-medium text-white">{item.pesagem?.produtor?.nome || '—'}</td>
                      <td className="px-5 py-4 text-slate-400 font-mono">{qtdAmostras}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${rendaBadge(renda)}`}>
                          {renda.toFixed(2)} g
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}>
                          {status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-mono">#{item.pesagem?.id || '—'}</td>
                      <td className="px-5 py-4">
                        <Tooltip label="Imprimir laudo">
                          <button type="button" onClick={() => printLaudoLaboratorio(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 transition">
                            <Printer size={14} />
                          </button>
                        </Tooltip>
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

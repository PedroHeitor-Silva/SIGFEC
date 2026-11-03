import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Beaker, Printer, Download, Clock } from 'lucide-react';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
import BotaoAcao from '../components/BotaoAcao';
import { TableSkeleton } from '../components/Skeleton';
import { printLaudoLaboratorio } from '../utils/printDoc';
import { exportCSV } from '../utils/csv';
import SortableHeader, { applySort } from '../components/SortableHeader';
import DateRangeFilter from '../components/DateRangeFilter';
import { BarraFiltros, CampoBusca, FiltroSelect, opcoesDe, noPeriodo, contem } from '../components/Filtros';

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
  const [pendentes, setPendentes] = useState([]); // cargas pesadas que ainda não têm laudo
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/laboratorio')
      .then(({ data }) => setAnalises(data || []))
      .catch(() => setError('Não foi possível carregar as análises.'))
      .finally(() => setLoading(false));
    api.get('/pesagens')
      .then(({ data }) => setPendentes((data || []).filter((p) => p.gramasAmido == null)
        .sort((a, b) => new Date(a.dataHoraEntrada) - new Date(b.dataHoraEntrada))))
      .catch(() => {});
  }, []);

  const [search, setSearch] = useState('');
  const [fProdutor, setFProdutor] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [datas, setDatas] = useState({ from: '', to: '' });
  const [sort, setSort] = useState({ key: 'dataCriacao', dir: 'desc' });

  const sorted = useMemo(() => applySort(analises.filter((a) =>
    contem(search, a.pesagem?.produtor?.nome, a.pesagem?.id && `PES-${String(a.pesagem.id).padStart(6, '0')}`, a.observacao)
    && (!fProdutor || a.pesagem?.produtor?.nome === fProdutor)
    && (!fStatus || (a.statusQualidade || 'AGUARDANDO_ANALISE') === fStatus)
    && noPeriodo(a.dataCriacao, datas)), sort, {
    amostras: (a) => (a.amostras || []).length,
    rendaMedia: (a) => (a.rendaMedia != null ? Number(a.rendaMedia) : null),
  }), [analises, search, fProdutor, fStatus, datas, sort]);
  const algumFiltro = !!(search || fProdutor || fStatus || datas.from || datas.to);
  const limpar = () => { setSearch(''); setFProdutor(''); setFStatus(''); setDatas({ from: '', to: '' }); };

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
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition"
            >
              <Plus size={15} /> Nova Análise
            </button>
          </div>
        }
      />

      {pendentes.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <Clock size={16} className="text-amber-500" />
            {pendentes.length === 1 ? '1 carga aguardando análise' : `${pendentes.length} cargas aguardando análise`}
            <span className="font-normal text-slate-400">— o produtor só recebe depois do laudo.</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {pendentes.slice(0, 8).map((p) => (
              <button key={p.id} type="button" onClick={() => navigate(`/laboratorio/novo?pesagem=${p.id}`)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-xs hover:border-emerald-500 transition">
                <span className="font-mono font-bold text-amber-500">PES-{String(p.id).padStart(6, '0')}</span>
                <span className="text-slate-200">{p.produtorNome || 'Sem produtor'}</span>
                <span className="text-slate-500">{fmt(p.dataHoraEntrada)}</span>
                <span className="rounded bg-emerald-600 px-2 py-0.5 font-bold text-white">Analisar</span>
              </button>
            ))}
            {pendentes.length > 8 && <span className="self-center text-xs text-slate-500">+{pendentes.length - 8} — use "Nova Análise"</span>}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <BarraFiltros total={analises.length} exibidos={sorted.length} ativo={algumFiltro} onLimpar={limpar}>
          <CampoBusca value={search} onChange={setSearch} placeholder="Buscar produtor ou nº da carga (PES-...)" />
          <FiltroSelect label="Produtor" value={fProdutor} onChange={setFProdutor} options={opcoesDe(analises, (a) => a.pesagem?.produtor?.nome)} />
          <FiltroSelect label="Resultado" value={fStatus} onChange={setFStatus}
            options={[['APROVADO', 'Aprovado'], ['APROVADO_COM_DESCONTO', 'Aprovado com desconto'], ['REPROVADO', 'Reprovado']].map(([value, label]) => ({ value, label }))} />
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
            Data <DateRangeFilter from={datas.from} to={datas.to} onChange={setDatas} />
          </span>
        </BarraFiltros>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <SortableHeader sortKey="dataCriacao" current={sort} onChange={setSort}>Data</SortableHeader>
                <SortableHeader sortKey="pesagem.produtor.nome" current={sort} onChange={setSort}>Produtor</SortableHeader>
                <SortableHeader sortKey="amostras" current={sort} onChange={setSort}>Amostras</SortableHeader>
                <SortableHeader sortKey="rendaMedia" current={sort} onChange={setSort}>Renda Média</SortableHeader>
                <SortableHeader sortKey="statusQualidade" current={sort} onChange={setSort}>Status</SortableHeader>
                <SortableHeader sortKey="pesagem.id" current={sort} onChange={setSort}>Carga</SortableHeader>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
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
                    title={algumFiltro ? 'Nenhum laudo com esses filtros' : 'Nenhuma análise registrada'}
                    description={algumFiltro ? 'Use "Limpar filtros" para ver todos.' : 'Emita o primeiro laudo após uma pesagem para medir a renda da carga.'}
                    action={
                      <button type="button" onClick={() => navigate('/laboratorio/novo')}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
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
                      <td className="px-5 py-4 text-slate-500 font-mono">{item.pesagem?.id ? `PES-${String(item.pesagem.id).padStart(6, '0')}` : '—'}</td>
                      <td className="px-5 py-4">
                        <Tooltip label="Imprimir laudo">
                              <BotaoAcao icon={Printer} label="Imprimir laudo" cor="roxo" soIcone dicaNativa={false} onClick={() => printLaudoLaboratorio(item)} />
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

import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList, Calendar, ChevronLeft, ChevronRight, Truck, Scale,
  Printer, Download, TrendingUp, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { CardSkeleton } from '../components/Skeleton';
import BarChart from '../components/charts/BarChart';
import HBarChart from '../components/charts/HBarChart';
import { printRomaneio } from '../utils/printDoc';
import { exportCSV } from '../utils/csv';

const fmtKg = (v) => v != null ? `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg` : '-';
const fmtTime = (v) => v ? new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';

const todayIso = () => {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
};

const shiftDate = (iso, delta) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
};

export default function RomaneioDiario() {
  const [data, setData] = useState(todayIso());
  const [pesagens, setPesagens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/pesagens')
      .then(({ data: d }) => setPesagens(d || []))
      .catch(() => toast.error('Falha ao carregar pesagens.'))
      .finally(() => setLoading(false));
  }, []);

  const doDia = useMemo(() => {
    return pesagens.filter((p) => {
      if (!p.dataHoraEntrada) return false;
      return new Date(p.dataHoraEntrada).toISOString().slice(0, 10) === data;
    }).sort((a, b) => new Date(a.dataHoraEntrada) - new Date(b.dataHoraEntrada));
  }, [pesagens, data]);

  const totais = useMemo(() => {
    const sum = (k) => doDia.reduce((s, p) => s + Number(p[k] || 0), 0);
    return {
      cargas: doDia.length,
      pesoBruto: sum('pesoBruto'),
      pesoTara: sum('pesoTara'),
      pesoLiquido: sum('pesoLiquido'),
      pesoFinal: sum('pesoFinal'),
      valorTotal: sum('valorTotal'),
    };
  }, [doDia]);

  // Entradas por hora (24h grid)
  const porHora = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ label: String(h).padStart(2, '0'), value: 0 }));
    doDia.forEach((p) => {
      const h = new Date(p.dataHoraEntrada).getHours();
      buckets[h].value += Number(p.pesoLiquido || 0) / 1000; // em toneladas
    });
    // Pega só faixa relevante (primeiro até último com valor + 2h margem)
    const firstWithValue = buckets.findIndex((b) => b.value > 0);
    const lastWithValue = buckets.length - 1 - [...buckets].reverse().findIndex((b) => b.value > 0);
    if (firstWithValue === -1) return buckets.slice(6, 18); // padrão jornada
    return buckets.slice(Math.max(0, firstWithValue - 1), Math.min(24, lastWithValue + 2));
  }, [doDia]);

  // Top produtores do dia
  const topProdutores = useMemo(() => {
    const map = {};
    doDia.forEach((p) => {
      const nome = p.produtorNome || p.produtor?.nome;
      if (!nome) return;
      map[nome] = (map[nome] || 0) + Number(p.pesoFinal || p.pesoLiquido || 0);
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [doDia]);

  const isToday = data === todayIso();
  const fmtData = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const handleExport = () => exportCSV(`romaneio-${data}.csv`, [
    { label: 'ID', key: 'id' },
    { label: 'Hora', key: (p) => fmtTime(p.dataHoraEntrada) },
    { label: 'Produtor', key: 'produtorNome' },
    { label: 'Placa', key: 'veiculoPlaca' },
    { label: 'Peso Bruto', key: 'pesoBruto' },
    { label: 'Peso Tara', key: 'pesoTara' },
    { label: 'Peso Líquido', key: 'pesoLiquido' },
    { label: 'Peso Final', key: 'pesoFinal' },
  ], doDia);

  const handlePrint = () => printRomaneio({ data, pesagens: doDia, totais });

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="romaneio"
        title="Romaneio do Pátio"
        subtitle={fmtData[0].toUpperCase() + fmtData.slice(1)}
        action={
          <div className="flex gap-2">
            <button type="button" onClick={handleExport} disabled={!doDia.length}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition">
              <Download size={15} /> CSV
            </button>
            <button type="button" onClick={handlePrint} disabled={!doDia.length}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50 transition shadow-lg shadow-amber-900/40">
              <Printer size={15} /> Imprimir Romaneio
            </button>
          </div>
        }
      />

      {/* Date picker */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setData(shiftDate(data, -1))}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            title="Dia anterior">
            <ChevronLeft size={16} />
          </button>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input type="date" value={data} onChange={(e) => setData(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-amber-500 transition" />
          </div>
          <button type="button" onClick={() => setData(shiftDate(data, 1))} disabled={isToday}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition"
            title="Próximo dia">
            <ChevronRight size={16} />
          </button>
          {!isToday && (
            <button type="button" onClick={() => setData(todayIso())}
              className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-500/20 transition">
              Hoje
            </button>
          )}
        </div>

        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Cargas no dia</p>
          <p className="text-2xl font-bold font-mono text-amber-400">{loading ? '—' : doDia.length}</p>
        </div>
      </div>

      {/* KPIs do dia */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <Kpi icon={Truck} accent="amber" label="Cargas" value={totais.cargas.toString()} sub={isToday ? 'Hoje' : 'No dia'} />
            <Kpi icon={Scale} accent="sky" label="Peso Bruto Total" value={fmtKg(totais.pesoBruto)} sub="Entrada bruta" />
            <Kpi icon={Scale} accent="emerald" label="Peso Final" value={fmtKg(totais.pesoFinal)} sub="Após impurezas" />
            <Kpi icon={TrendingUp} accent="lime" label="Valor Pago" value={
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totais.valorTotal)
            } sub="Aos produtores" />
          </>
        )}
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Fluxo do dia</p>
              <h3 className="text-base font-bold text-white mt-0.5">Entradas por hora (toneladas)</h3>
            </div>
            <Calendar size={16} className="text-amber-400" />
          </div>
          {doDia.length > 0
            ? <BarChart data={porHora} color="#f59e0b" height={180} valueFmt={(v) => `${v.toFixed(1)}t`} />
            : <div className="h-[180px] flex items-center justify-center text-xs text-slate-600">Sem cargas neste dia</div>
          }
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">Top Produtores</p>
              <h3 className="text-base font-bold text-white mt-0.5">Volume do dia</h3>
            </div>
            <Truck size={16} className="text-cyan-400" />
          </div>
          {topProdutores.length > 0
            ? <HBarChart data={topProdutores} valueFmt={(v) => `${v.toLocaleString('pt-BR')} kg`} defaultColor="#06b6d4" />
            : <div className="py-8 text-center text-xs text-slate-600">Sem produtores no dia</div>
          }
        </div>
      </div>

      {/* Tabela detalhada */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <ClipboardList size={16} className="text-amber-400" />
            <span className="text-sm font-bold text-white">Detalhamento</span>
          </div>
          <span className="text-xs text-slate-500">{doDia.length} carga{doDia.length === 1 ? '' : 's'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {['ID', 'Hora', 'Produtor', 'Placa', 'Bruto', 'Tara', 'Líquido', 'Final'].map((h) => (
                  <th key={h} className={`px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${['Bruto', 'Tara', 'Líquido', 'Final'].includes(h) ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">Carregando...</td></tr>
              ) : doDia.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <AlertCircle size={28} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-sm font-bold text-white">Sem pesagens neste dia</p>
                    <p className="text-xs text-slate-500 mt-1">Pátio vazio em {fmtData}</p>
                  </td>
                </tr>
              ) : (
                doDia.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">#{p.id}</td>
                    <td className="px-5 py-3 text-slate-300 font-mono">{fmtTime(p.dataHoraEntrada)}</td>
                    <td className="px-5 py-3 font-medium text-white">{p.produtorNome || '-'}</td>
                    <td className="px-5 py-3 text-slate-400 font-mono uppercase">{p.veiculoPlaca || '-'}</td>
                    <td className="px-5 py-3 text-right text-slate-400 font-mono">{fmtKg(p.pesoBruto)}</td>
                    <td className="px-5 py-3 text-right text-slate-500 font-mono">{fmtKg(p.pesoTara)}</td>
                    <td className="px-5 py-3 text-right text-white font-mono font-bold">{fmtKg(p.pesoLiquido)}</td>
                    <td className="px-5 py-3 text-right text-emerald-400 font-mono font-bold">{fmtKg(p.pesoFinal)}</td>
                  </tr>
                ))
              )}
              {!loading && doDia.length > 0 && (
                <tr className="bg-slate-800/50 font-bold">
                  <td colSpan={4} className="px-5 py-3 text-right text-xs uppercase tracking-wider text-amber-400">Totais</td>
                  <td className="px-5 py-3 text-right text-slate-300 font-mono">{fmtKg(totais.pesoBruto)}</td>
                  <td className="px-5 py-3 text-right text-slate-500 font-mono">{fmtKg(totais.pesoTara)}</td>
                  <td className="px-5 py-3 text-right text-white font-mono">{fmtKg(totais.pesoLiquido)}</td>
                  <td className="px-5 py-3 text-right text-emerald-400 font-mono">{fmtKg(totais.pesoFinal)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, accent, label, value, sub }) {
  const A = {
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    sky: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    lime: 'bg-lime-500/10 border-lime-500/20 text-lime-400',
  }[accent];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <div className={`p-1.5 rounded-md border ${A}`}>
          <Icon size={13} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white font-mono tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-600 mt-1">{sub}</p>
    </div>
  );
}

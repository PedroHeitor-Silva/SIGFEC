import { useEffect, useMemo, useState } from 'react';
import { animate } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Scale, Truck, Warehouse, DollarSign, TrendingUp, Package,
  ArrowUpRight, Activity, AlertCircle, CheckCircle2, Beaker, Users,
  ArrowDownRight, Minus,
} from 'lucide-react';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { CardSkeleton } from '../components/Skeleton';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import DonutChart from '../components/charts/DonutChart';
import HBarChart from '../components/charts/HBarChart';

const KPIS = [
  { key: 'entradaHoje', title: 'Entrada Hoje', unit: 't', icon: Scale, accent: 'amber', desc: 'Mandioca recebida hoje' },
  { key: 'caminhoesPatio', title: 'Caminhões no Pátio', unit: '', icon: Truck, accent: 'sky', desc: 'Aguardando descarga' },
  { key: 'saldoEstoque', title: 'Estoque', unit: 'sc', icon: Warehouse, accent: 'violet', desc: 'Sacos disponíveis' },
  { key: 'lotesAtivos', title: 'Lotes Ativos', unit: '', icon: Package, accent: 'fuchsia', desc: 'Em produção' },
  { key: 'pagamentosPendentes', title: 'Títulos em Aberto', unit: '', icon: DollarSign, accent: 'rose', desc: 'Financeiro a processar' },
  { key: 'totalReceber', title: 'A Receber', unit: '', icon: TrendingUp, accent: 'emerald', money: true, desc: 'Total de clientes' },
];

const ACCENT = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/10', stroke: '#10b981', glow: 'group-hover:shadow-emerald-500/10' },
  sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', ring: 'ring-sky-500/10', stroke: '#0ea5e9', glow: 'group-hover:shadow-sky-500/10' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', ring: 'ring-amber-500/10', stroke: '#f59e0b', glow: 'group-hover:shadow-amber-500/10' },
  fuchsia: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', text: 'text-fuchsia-400', ring: 'ring-fuchsia-500/10', stroke: '#d946ef', glow: 'group-hover:shadow-fuchsia-500/10' },
  lime: { bg: 'bg-lime-500/10', border: 'border-lime-500/20', text: 'text-lime-400', ring: 'ring-lime-500/10', stroke: '#84cc16', glow: 'group-hover:shadow-lime-500/10' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', ring: 'ring-rose-500/10', stroke: '#f43f5e', glow: 'group-hover:shadow-rose-500/10' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', ring: 'ring-cyan-500/10', stroke: '#06b6d4', glow: 'group-hover:shadow-cyan-500/10' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', ring: 'ring-violet-500/10', stroke: '#8b5cf6', glow: 'group-hover:shadow-violet-500/10' },
};

const fmtMoney = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const shortDayLabel = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit' });

// Mini sparkline embaixo do número
function Spark({ data, stroke }) {
  if (!data || data.length < 2) return null;
  const w = 100, h = 24;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-6" preserveAspectRatio="none">
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={stroke} opacity="0.07" />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  const [pesagens, setPesagens] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [analises, setAnalises] = useState([]);
  const [financeiro, setFinanceiro] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/pesagens'),
      api.get('/estoque'),
      api.get('/laboratorio'),
      api.get('/financeiro'),
    ]).then(([p, e, l, f]) => {
      setPesagens(p.status === 'fulfilled' ? (p.value.data || []) : []);
      setEstoque(e.status === 'fulfilled' ? (e.value.data || []) : []);
      setAnalises(l.status === 'fulfilled' ? (l.value.data || []) : []);
      setFinanceiro(f.status === 'fulfilled' ? (f.value.data || []) : []);
      setLoading(false);
    });
  }, []);

  const data = useMemo(() => {
    const hoje = new Date().toDateString();
    const entradaHoje = pesagens
      .filter((p) => p.dataHoraEntrada && new Date(p.dataHoraEntrada).toDateString() === hoje)
      .reduce((s, p) => s + Number(p.pesoLiquido || 0), 0);
    const saldoEstoque = estoque.reduce((s, l) => s + Number(l.quantidadeAtual || l.quantidadeTotal || 0), 0);
    const totalReceber = financeiro
      .filter((t) => t.cliente && t.statusFinanceiro !== 'PAGO' && t.statusFinanceiro !== 'CANCELADO')
      .reduce((s, t) => s + Number(t.valorOriginal || 0), 0);
    const pagamentosPendentes = financeiro.filter((t) => t.statusFinanceiro === 'ABERTO' || t.statusFinanceiro === 'ATRASADO').length;
    return {
      entradaHoje: Math.round(entradaHoje / 1000),
      caminhoesPatio: pesagens.filter((p) => !p.finalizado).length,
      saldoEstoque,
      lotesAtivos: estoque.length,
      pagamentosPendentes,
      totalReceber,
    };
  }, [pesagens, estoque, financeiro]);

  // Entradas últimos 7 dias
  const entradasPorDia = useMemo(() => {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const total = pesagens
        .filter((p) => p.dataHoraEntrada && new Date(p.dataHoraEntrada).toDateString() === key)
        .reduce((s, p) => s + Number(p.pesoLiquido || 0), 0);
      dias.push({ label: shortDayLabel(d), value: Math.round(total / 1000) });
    }
    return dias;
  }, [pesagens]);

  const sparkEntradas = useMemo(() => entradasPorDia.map((d) => d.value), [entradasPorDia]);

  const topProdutores = useMemo(() => {
    const map = {};
    pesagens.forEach((p) => {
      const nome = p.produtorNome || p.produtor?.nome;
      if (!nome) return;
      map[nome] = (map[nome] || 0) + Number(p.pesoLiquido || 0);
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [pesagens]);

  // Evolução da renda média
  const evolucaoRenda = useMemo(() => {
    return [...analises]
      .filter((a) => a.rendaMedia != null)
      .sort((a, b) => new Date(a.dataCriacao) - new Date(b.dataCriacao))
      .slice(-12)
      .map((a, i) => ({
        label: a.dataCriacao ? new Date(a.dataCriacao).toLocaleDateString('pt-BR', { day: '2-digit' }) : `#${i + 1}`,
        value: Number(a.rendaMedia),
      }));
  }, [analises]);

  const distribQualidade = useMemo(() => {
    const COLORS = {
      APROVADO: '#10b981',
      APROVADO_COM_DESCONTO: '#f59e0b',
      REPROVADO: '#ef4444',
      AGUARDANDO_ANALISE: '#64748b',
    };
    const counts = {};
    analises.forEach((a) => {
      const s = a.statusQualidade || 'AGUARDANDO_ANALISE';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([k, v]) => ({
      label: k.replace(/_/g, ' '),
      value: v,
      color: COLORS[k] || '#64748b',
    }));
  }, [analises]);

  // Counts animados
  const [counts, setCounts] = useState(KPIS.map(() => 0));
  useEffect(() => {
    if (loading) return;
    const ctrls = KPIS.map((c, i) =>
      animate(0, data[c.key] ?? 0, {
        duration: 1.1, ease: 'easeOut',
        onUpdate(v) {
          setCounts((p) => { const n = [...p]; n[i] = Math.round(v); return n; });
        },
      })
    );
    return () => ctrls.forEach((c) => c.stop());
  }, [loading, data]);

  const atalhos = [
    { label: 'Nova Pesagem', to: '/pesagem/mandioca', icon: Scale, accent: 'amber' },
    { label: 'Nova Análise', to: '/laboratorio/novo', icon: Beaker, accent: 'fuchsia' },
    { label: 'Novo Parceiro', to: '/parceiros/novo', icon: Users, accent: 'cyan' },
    { label: 'Novo Lote', to: '/lotes/novo', icon: Package, accent: 'emerald' },
  ];

  return (
    <div className="space-y-8">
      <ModuleHeader
        moduleKey="dashboard"
        title="Visão Geral da Produção"
        subtitle={
          new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
            .replace(/^\w/, (c) => c.toUpperCase())
        }
      />

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? KPIS.map((_, i) => <CardSkeleton key={i} />)
          : KPIS.map((card, i) => {
            const Icon = card.icon;
            const a = ACCENT[card.accent];
            const raw = counts[i];
            const value = card.money ? fmtMoney(raw) : raw.toLocaleString('pt-BR');
            return (
              <div
                key={card.key}
                className={`group relative rounded-2xl border border-slate-800 bg-slate-900 p-6 overflow-hidden transition-all duration-300 hover:border-slate-700 hover:shadow-xl ${a.glow}`}
              >
                {/* Glow accent canto */}
                <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full ${a.bg} blur-2xl opacity-40 group-hover:opacity-70 transition`} />

                <div className="relative z-10">
                  {/* Topo: ícone */}
                  <div className={`inline-flex items-center justify-center h-11 w-11 rounded-xl ${a.bg} border ${a.border}`}>
                    <Icon size={20} className={a.text} />
                  </div>

                  {/* Label */}
                  <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    {card.title}
                  </p>

                  {/* Número herói — grande, bold, leading apertado */}
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-white tracking-tight leading-none tabular-nums">
                      {value}
                    </span>
                    {!card.money && card.unit && (
                      <span className="text-base font-semibold text-slate-500">{card.unit}</span>
                    )}
                  </div>

                  {/* Contexto */}
                  <p className="mt-2 text-xs text-slate-600">{card.desc}</p>

                  {/* Sparkline só no card de entrada */}
                  {card.key === 'entradaHoje' && sparkEntradas.some((v) => v > 0) && (
                    <div className="mt-3">
                      <Spark data={sparkEntradas} stroke={a.stroke} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Gráficos principais */}
      <div className="space-y-4">
        <SectionTitle>Análise de Produção</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard accent="amber" tag="Entradas" titulo="Pesagens — últimos 7 dias" icon={Scale}>
            <BarChart data={entradasPorDia} color="#f59e0b" height={190} valueFmt={(v) => `${v}t`} />
          </ChartCard>
          <ChartCard accent="fuchsia" tag="Qualidade" titulo="Evolução da renda média" icon={Activity}>
            {evolucaoRenda.length > 1
              ? <LineChart data={evolucaoRenda} color="#d946ef" height={190} valueFmt={(v) => `${v.toFixed(0)}g`} />
              : <EmptyChart>Sem análises suficientes</EmptyChart>}
          </ChartCard>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard accent="cyan" tag="Ranking" titulo="Top produtores por volume" icon={Users}>
            {topProdutores.length > 0
              ? <HBarChart data={topProdutores} valueFmt={(v) => `${v.toLocaleString('pt-BR')} kg`} defaultColor="#06b6d4" />
              : <EmptyChart>Nenhum produtor com pesagens</EmptyChart>}
          </ChartCard>
          <ChartCard accent="fuchsia" tag="Distribuição" titulo="Status das análises" icon={Beaker}>
            {distribQualidade.length > 0
              ? <DonutChart data={distribQualidade} size={150} label="Total" />
              : <EmptyChart>Sem análises registradas</EmptyChart>}
          </ChartCard>
        </div>
      </div>

      {/* Atalhos */}
      <div className="space-y-4">
        <SectionTitle>Atalhos Rápidos</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {atalhos.map((at) => {
            const Icon = at.icon;
            const c = ACCENT[at.accent];
            return (
              <Link key={at.to} to={at.to}
                className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-700 hover:bg-slate-800/60 transition">
                <div className={`p-2.5 rounded-lg ${c.bg} border ${c.border} shrink-0`}>
                  <Icon size={16} className={c.text} />
                </div>
                <span className="text-sm font-semibold text-white flex-1">{at.label}</span>
                <ArrowUpRight size={15} className="text-slate-600 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Status + alerta */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Saúde do Sistema</p>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 size={13} /> Operacional
            </span>
          </div>
          <div className="space-y-1">
            {[
              { label: 'Banco de dados PostgreSQL', ok: true },
              { label: 'Integração IBGE (municípios)', ok: true },
              { label: 'API ViaCEP', ok: true },
              { label: 'Balança serial (Web Serial)', ok: false },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-sm py-2 border-b border-slate-800/60 last:border-0">
                <span className="text-slate-400">{s.label}</span>
                <span className={`flex items-center gap-1.5 text-xs font-semibold ${s.ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.ok ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {s.ok ? 'Online' : 'Aguardando'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
              <AlertCircle size={14} className="text-amber-400" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Pendências</p>
          </div>
          <p className="text-2xl font-black text-white tracking-tight">
            {data.pagamentosPendentes}
            <span className="text-sm font-semibold text-slate-500 ml-2">título(s) em aberto</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 flex-1">
            Contas a pagar e receber aguardando processamento no módulo financeiro.
          </p>
          <Link to="/financeiro"
            className="mt-4 inline-flex items-center gap-1.5 self-start rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-500/20 transition">
            Abrir financeiro <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* eslint-disable react/prop-types */
function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-4 w-1 rounded-full bg-emerald-500" />
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">{children}</h2>
      <span className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

function ChartCard({ accent, tag, titulo, icon: Icon, children }) {
  const a = ACCENT[accent];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${a.text}`}>{tag}</p>
          <h3 className="text-base font-bold text-white mt-0.5">{titulo}</h3>
        </div>
        <div className={`p-2 rounded-lg ${a.bg} border ${a.border}`}>
          <Icon size={16} className={a.text} />
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ children }) {
  return (
    <div className="h-[190px] flex items-center justify-center text-xs text-slate-600">
      {children}
    </div>
  );
}

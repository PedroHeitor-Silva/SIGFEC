import { useEffect, useMemo, useState } from 'react';
import { animate } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Scale, Warehouse, DollarSign, TrendingUp, Package,
  ArrowUpRight, Activity, AlertCircle, CheckCircle2, Beaker, Users,
  Gauge, ClipboardList, IdCard, AlertTriangle, Boxes, XCircle, Wifi, WifiOff,
} from 'lucide-react';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { CardSkeleton } from '../components/Skeleton';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import DonutChart from '../components/charts/DonutChart';

const KPIS = [
  { key: 'entradaHoje', title: 'Entrada Hoje', unit: 't', icon: Scale, accent: 'amber', desc: 'Mandioca recebida hoje' },
  { key: 'pesagensHoje', title: 'Pesagens Hoje', unit: '', icon: ClipboardList, accent: 'sky', desc: 'Cargas pesadas no dia' },
  { key: 'pesagensPendentes', title: 'Aguardando Análise', unit: '', icon: Beaker, accent: 'cyan', desc: 'Pesagens sem laudo' },
  { key: 'producaoHoje', title: 'Produção Hoje', unit: 'kg', icon: Boxes, accent: 'emerald', desc: 'Total produzido no dia' },
  { key: 'saldoEstoque', title: 'Estoque', unit: 'un', icon: Warehouse, accent: 'violet', desc: 'Saldo disponível' },
  { key: 'lotesAtivos', title: 'Lotes Ativos', unit: '', icon: Package, accent: 'fuchsia', desc: 'Em produção' },
  { key: 'rendimentoMedio', title: 'Rendimento Médio', unit: '', icon: Gauge, accent: 'lime', pct: true, desc: 'Média da produção' },
  { key: 'pagamentosPendentes', title: 'Títulos em Aberto', unit: '', icon: AlertCircle, accent: 'rose', desc: 'Financeiro a processar' },
  { key: 'totalReceber', title: 'Contas a Receber', unit: '', icon: TrendingUp, accent: 'emerald', money: true, desc: 'Valores pendentes de recebimento' },
];

const ACCENT = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', stroke: '#10b981' },
  sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', stroke: '#0ea5e9' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', stroke: '#f59e0b' },
  fuchsia: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', text: 'text-fuchsia-400', stroke: '#d946ef' },
  lime: { bg: 'bg-lime-500/10', border: 'border-lime-500/20', text: 'text-lime-400', stroke: '#84cc16' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', stroke: '#f43f5e' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', stroke: '#06b6d4' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', stroke: '#8b5cf6' },
};

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_COLOR = ['#f59e0b', '#94a3b8', '#b45309'];

const fmtMoney = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const shortDayLabel = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit' });
const isHoje = (d) => d && new Date(d).toDateString() === new Date().toDateString();

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
  const [lotes, setLotes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/pesagens'),
      api.get('/estoque'),
      api.get('/laboratorio'),
      api.get('/financeiro'),
      api.get('/lotes'),
      api.get('/motoristas'),
    ]).then(([p, e, l, f, lo, m]) => {
      setPesagens(p.status === 'fulfilled' ? (p.value.data || []) : []);
      setEstoque(e.status === 'fulfilled' ? (e.value.data || []) : []);
      setAnalises(l.status === 'fulfilled' ? (l.value.data || []) : []);
      setFinanceiro(f.status === 'fulfilled' ? (f.value.data || []) : []);
      setLotes(lo.status === 'fulfilled' ? (lo.value.data || []) : []);
      setMotoristas(m.status === 'fulfilled' ? (m.value.data || []) : []);
      setLoading(false);
    });
  }, []);

  const data = useMemo(() => {
    const entradaHoje = pesagens
      .filter((p) => isHoje(p.dataHoraEntrada))
      .reduce((s, p) => s + Number(p.pesoLiquido || 0), 0);
    const pesagensHoje = pesagens.filter((p) => isHoje(p.dataHoraEntrada)).length;
    // Pesagens sem análise vinculada (aguardando laudo) e ainda não consumidas
    const comAnalise = new Set(analises.map((a) => a.pesagem?.id).filter(Boolean));
    const pesagensPendentes = pesagens.filter((p) => !p.consumida && !comAnalise.has(p.id)).length;
    const saldoEstoque = estoque.reduce((s, l) => s + Number(l.quantidadeAtual || l.quantidadeTotal || 0), 0);
    const totalReceber = financeiro
      .filter((t) => t.cliente && t.statusFinanceiro !== 'PAGO' && t.statusFinanceiro !== 'CANCELADO')
      .reduce((s, t) => s + Number(t.valorOriginal || 0), 0);
    const pagamentosPendentes = financeiro.filter((t) => t.statusFinanceiro === 'ABERTO' || t.statusFinanceiro === 'ATRASADO').length;
    const producaoHoje = lotes
      .filter((l) => isHoje(l.dataFabricacao) || isHoje(l.dataCriacao))
      .reduce((s, l) => s + Number(l.quantidadeProduzida || 0), 0);
    const lotesAtivos = lotes.filter((l) => l.statusLote === 'EM_PRODUCAO').length;
    const rendimentos = lotes.map((l) => Number(l.rendimentoReal)).filter((r) => r > 0);
    const rendimentoMedio = rendimentos.length
      ? rendimentos.reduce((s, r) => s + r, 0) / rendimentos.length : 0;
    return {
      entradaHoje: Math.round(entradaHoje / 1000),
      pesagensHoje,
      pesagensPendentes,
      producaoHoje: Math.round(producaoHoje),
      saldoEstoque,
      lotesAtivos,
      rendimentoMedio,
      pagamentosPendentes,
      totalReceber,
    };
  }, [pesagens, estoque, financeiro, lotes, analises]);

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
      APROVADO: '#10b981', APROVADO_COM_DESCONTO: '#f59e0b',
      REPROVADO: '#ef4444', AGUARDANDO_ANALISE: '#64748b',
    };
    const counts = {};
    analises.forEach((a) => {
      const s = a.statusQualidade || 'AGUARDANDO_ANALISE';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([k, v]) => ({
      label: k.replace(/_/g, ' '), value: v, color: COLORS[k] || '#64748b',
    }));
  }, [analises]);

  // === Central de alertas operacionais (dados reais) ===
  const alertas = useMemo(() => {
    const out = [];
    // CNH vencida/vencendo
    motoristas.forEach((m) => {
      if (!m.validadeCnh || m.statusAtivo === false) return;
      const dias = Math.floor((new Date(m.validadeCnh + 'T00:00:00') - new Date()) / 86400000);
      if (dias < 0) out.push({ tipo: 'CNH', cls: 'danger', icon: IdCard, texto: `CNH de ${m.nome} vencida` });
      else if (dias <= 30) out.push({ tipo: 'CNH', cls: 'warning', icon: IdCard, texto: `CNH de ${m.nome} vence em ${dias}d` });
    });
    // Estoque baixo
    estoque.forEach((e) => {
      const atual = Number(e.quantidadeAtual || 0), min = Number(e.quantidadeMinima || 0);
      if (min > 0 && atual <= min) {
        out.push({ tipo: 'ESTOQUE', cls: atual <= 0 ? 'danger' : 'warning', icon: Warehouse,
          texto: `${e.produto?.nome || 'Produto'} ${atual <= 0 ? 'zerado' : 'abaixo do mínimo'}` });
      }
    });
    // Análise pendente (pesagem sem análise)
    const comAnalise = new Set(analises.map((a) => a.pesagem?.id).filter(Boolean));
    const pendentes = pesagens.filter((p) => !comAnalise.has(p.id)).length;
    if (pendentes > 0) out.push({ tipo: 'ANALISE', cls: 'info', icon: Beaker, texto: `${pendentes} pesagem(ns) aguardando análise` });
    // Título vencido
    const vencidos = financeiro.filter((t) => t.statusFinanceiro === 'ATRASADO').length;
    if (vencidos > 0) out.push({ tipo: 'TITULO', cls: 'danger', icon: DollarSign, texto: `${vencidos} título(s) vencido(s)` });
    // Lote parado (EM_PRODUCAO há mais de 2 dias)
    lotes.forEach((l) => {
      if (l.statusLote !== 'EM_PRODUCAO') return;
      const ref = l.dataCriacao || l.dataFabricacao;
      if (ref && (new Date() - new Date(ref)) / 86400000 > 2) {
        out.push({ tipo: 'LOTE', cls: 'warning', icon: Package, texto: `Lote ${l.codigoLote} parado em produção` });
      }
    });
    return out.slice(0, 8);
  }, [motoristas, estoque, analises, pesagens, financeiro, lotes]);

  // Counts animados
  const [counts, setCounts] = useState(KPIS.map(() => 0));
  useEffect(() => {
    if (loading) return;
    const ctrls = KPIS.map((c, i) =>
      animate(0, data[c.key] ?? 0, {
        duration: 1.1, ease: 'easeOut',
        onUpdate(v) { setCounts((p) => { const n = [...p]; n[i] = c.pct ? v : Math.round(v); return n; }); },
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

  const ALERT_CLS = {
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  };

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

      {/* === KPI Grid === */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? KPIS.map((_, i) => <CardSkeleton key={i} />)
          : KPIS.map((card, i) => {
            const Icon = card.icon;
            const a = ACCENT[card.accent];
            const raw = counts[i];
            const value = card.money ? fmtMoney(raw)
              : card.pct ? `${raw.toFixed(1).replace('.', ',')}%`
              : raw.toLocaleString('pt-BR');
            return (
              <div
                key={card.key}
                className="group relative rounded-2xl border border-slate-800 bg-slate-900 p-5 overflow-hidden transition-all duration-300 hover:border-slate-700 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className={`absolute -top-12 -right-12 h-28 w-28 rounded-full ${a.bg} blur-2xl opacity-30 group-hover:opacity-60 transition`} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className={`inline-flex items-center justify-center h-11 w-11 rounded-xl ${a.bg} border ${a.border} group-hover:scale-110 transition-transform`}>
                      <Icon size={20} className={a.text} />
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{card.title}</p>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-white tracking-tight leading-none tabular-nums">{value}</span>
                    {!card.money && !card.pct && card.unit && (
                      <span className="text-sm font-semibold text-slate-500">{card.unit}</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{card.desc}</p>
                  {card.key === 'entradaHoje' && sparkEntradas.some((v) => v > 0) && (
                    <div className="mt-3"><Spark data={sparkEntradas} stroke={a.stroke} /></div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* === Gráficos === */}
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
          {/* Ranking com medalhas */}
          <ChartCard accent="cyan" tag="Ranking" titulo="Top produtores por volume" icon={Users}>
            {topProdutores.length > 0 ? (
              <div className="space-y-3 pt-1">
                {topProdutores.map((p, idx) => {
                  const max = topProdutores[0].value || 1;
                  const pct = Math.max(4, (p.value / max) * 100);
                  return (
                    <div key={p.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 text-sm font-semibold text-white truncate">
                          <span className="text-base w-6 text-center">{MEDAL[idx] || `${idx + 1}º`}</span>
                          <span className="truncate">{p.label}</span>
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
                          {p.value.toLocaleString('pt-BR')} kg
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden ml-8">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: MEDAL_COLOR[idx] || '#06b6d4' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyChart>Nenhum produtor com pesagens</EmptyChart>}
          </ChartCard>
          <ChartCard accent="fuchsia" tag="Distribuição" titulo="Status das análises" icon={Beaker}>
            {distribQualidade.length > 0
              ? <DonutChart data={distribQualidade} size={150} label="Total" />
              : <EmptyChart>Sem análises registradas</EmptyChart>}
          </ChartCard>
        </div>
      </div>

      {/* === Alertas + Atalhos === */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Central de Alertas */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={14} className="text-amber-400" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Alertas Operacionais</p>
            </div>
            {alertas.length > 0 && (
              <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-400">
                {alertas.length}
              </span>
            )}
          </div>
          {alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 size={32} className="text-emerald-400/40 mb-2" />
              <p className="text-sm font-semibold text-white">Tudo em ordem</p>
              <p className="text-xs text-slate-500 mt-0.5">Nenhum alerta operacional</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {alertas.map((al, i) => {
                const Icon = al.icon;
                return (
                  <div key={i} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${ALERT_CLS[al.cls]}`}>
                    <Icon size={15} className="shrink-0" />
                    <span className="text-xs font-medium flex-1">{al.texto}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">{al.tipo}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Atalhos */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Atalhos Rápidos</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {atalhos.map((at) => {
              const Icon = at.icon;
              const c = ACCENT[at.accent];
              return (
                <Link key={at.to} to={at.to}
                  className="group flex flex-col items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/40 p-4 hover:border-slate-700 hover:bg-slate-800/60 active:scale-95 transition">
                  <div className={`p-3 rounded-xl ${c.bg} border ${c.border} group-hover:scale-110 transition-transform`}>
                    <Icon size={22} className={c.text} />
                  </div>
                  <span className="text-sm font-semibold text-white text-center">{at.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* === Saúde do Sistema === */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Saúde do Sistema</p>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 size={13} /> Operacional
          </span>
        </div>
        <div className="grid gap-x-6 sm:grid-cols-2">
          {[
            { label: 'Banco de dados PostgreSQL', status: 'online' },
            { label: 'Integração IBGE (municípios)', status: 'online' },
            { label: 'API ViaCEP', status: 'online' },
            { label: 'Gateway de pagamento ASAAS', status: 'online' },
            { label: 'Balança serial (Web Serial)', status: 'aguardando' },
          ].map((s) => {
            const map = {
              online: { cls: 'text-emerald-400', dot: 'bg-emerald-500 animate-pulse', Icon: Wifi, txt: 'Online' },
              aguardando: { cls: 'text-amber-400', dot: 'bg-amber-500', Icon: AlertCircle, txt: 'Aguardando' },
              offline: { cls: 'text-rose-400', dot: 'bg-rose-500', Icon: WifiOff, txt: 'Offline' },
            }[s.status];
            const SIcon = map.Icon;
            return (
              <div key={s.label} className="flex items-center justify-between text-sm py-2.5 border-b border-slate-800/60">
                <span className="text-slate-400">{s.label}</span>
                <span className={`flex items-center gap-1.5 text-xs font-semibold ${map.cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${map.dot}`} />
                  <SIcon size={12} /> {map.txt}
                </span>
              </div>
            );
          })}
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
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700">
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
    <div className="h-[190px] flex items-center justify-center text-xs text-slate-600">{children}</div>
  );
}

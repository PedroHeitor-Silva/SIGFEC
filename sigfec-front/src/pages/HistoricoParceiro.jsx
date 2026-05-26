import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, MapPin, Phone, Mail, Beaker,
  Scale, TrendingUp, TrendingDown, Calendar, Activity, Printer, Download, Boxes, Gauge,
} from 'lucide-react';
import api from '../services/api';
import { CardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import { printTicketPesagem, printLaudoLaboratorio } from '../utils/printDoc';
import { exportCSV } from '../utils/csv';

const fmt = (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '-';
const fmtMoney = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const fmtKg = (v) => v != null ? `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg` : '-';

const TIPO_BADGE = {
  PRODUTOR: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CLIENTE: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  FORNECEDOR: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const TABS = [
  { key: 'timeline', label: 'Timeline', icon: Activity },
  { key: 'pesagens', label: 'Pesagens', icon: Scale },
  { key: 'analises', label: 'Análises', icon: Beaker },
  { key: 'eficiencia', label: 'Eficiência', icon: Gauge },
  { key: 'financeiro', label: 'Financeiro', icon: TrendingUp },
];

export default function HistoricoParceiro() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [parceiro, setParceiro] = useState(null);
  const [pesagens, setPesagens] = useState([]);
  const [analises, setAnalises] = useState([]);
  const [titulos, setTitulos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('timeline');

  useEffect(() => {
    Promise.allSettled([
      api.get(`/parceiros/${id}`),
      api.get('/pesagens'),
      api.get('/financeiro'),
      api.get('/laboratorio'),
      api.get('/lotes'),
    ]).then(([p, pes, fin, lab, lot]) => {
      if (p.status === 'fulfilled') setParceiro(p.value.data);
      const todasPesagens = pes.status === 'fulfilled' ? (pes.value.data || []) : [];
      const todosFin = fin.status === 'fulfilled' ? (fin.value.data || []) : [];
      const todasAnalises = lab.status === 'fulfilled' ? (lab.value.data || []) : [];
      const todosLotes = lot.status === 'fulfilled' ? (lot.value.data || []) : [];
      const pid = Number(id);
      const parceiroNome = p.status === 'fulfilled' ? p.value.data?.nome : null;

      const minhaspesagens = todasPesagens.filter(
        (x) => (x.produtor?.id ?? x.produtorId) === pid ||
               (parceiroNome && (x.produtorNome === parceiroNome || x.produtor?.nome === parceiroNome))
      );
      setPesagens(minhaspesagens);
      setTitulos(todosFin.filter((t) => (t.fornecedor?.id === pid) || (t.cliente?.id === pid)));
      const pesagemIds = new Set(minhaspesagens.map((p) => p.id));
      setAnalises(todasAnalises.filter((a) => pesagemIds.has(a.pesagem?.id)));
      // lotes que consumiram alguma pesagem deste produtor
      setLotes(todosLotes.filter((l) =>
        (l.pesagensConsumidas || []).some((pp) => pesagemIds.has(pp.id))
      ));
      setLoading(false);
    });
  }, [id]);

  // Análise de eficiência (rendimento por lote contribuído)
  const eficiencia = useMemo(() => {
    const pesagemIdsDoParceiro = new Set(pesagens.map((p) => p.id));
    const detalhes = lotes.map((lote) => {
      const pesagensDele = (lote.pesagensConsumidas || []).filter((p) => pesagemIdsDoParceiro.has(p.id));
      const pesoContribuido = pesagensDele.reduce((s, p) => {
        const full = pesagens.find((x) => x.id === p.id);
        return s + Number(full?.pesoFinal || full?.pesoLiquido || 0);
      }, 0);
      return {
        loteId: lote.id,
        codigoLote: lote.codigoLote,
        produtoNome: lote.produto?.nome,
        rendimento: Number(lote.rendimentoReal || 0),
        pesoContribuido,
        cargasContribuidas: pesagensDele.length,
        dataFabricacao: lote.dataFabricacao,
      };
    }).filter((d) => d.pesoContribuido > 0);

    const rendimentoMedio = detalhes.length
      ? detalhes.reduce((s, d) => s + d.rendimento, 0) / detalhes.length
      : 0;
    const totalContribuido = detalhes.reduce((s, d) => s + d.pesoContribuido, 0);
    return { detalhes, rendimentoMedio, totalContribuido, lotesParticipados: detalhes.length };
  }, [lotes, pesagens]);

  const totais = useMemo(() => {
    const pesoTotal = pesagens.reduce((s, p) => s + Number(p.pesoFinal || p.pesoLiquido || 0), 0);
    const valorPesagens = pesagens.reduce((s, p) => s + Number(p.valorTotal || 0), 0);
    const aPagar = titulos.filter((t) => t.fornecedor && t.statusFinanceiro === 'ABERTO').reduce((s, t) => s + Number(t.valorOriginal || 0), 0);
    const aReceber = titulos.filter((t) => t.cliente && t.statusFinanceiro === 'ABERTO').reduce((s, t) => s + Number(t.valorOriginal || 0), 0);
    const rendaMedia = analises.length
      ? analises.reduce((s, a) => s + Number(a.rendaMedia || 0), 0) / analises.length
      : 0;
    return { pesoTotal, valorPesagens, aPagar, aReceber, rendaMedia };
  }, [pesagens, titulos, analises]);

  // Evolução mensal pesagens (últimos 6 meses)
  const pesagensPorMes = useMemo(() => {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      const total = pesagens
        .filter((p) => {
          if (!p.dataHoraEntrada) return false;
          const dt = new Date(p.dataHoraEntrada);
          return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}` === ym;
        })
        .reduce((s, p) => s + Number(p.pesoFinal || p.pesoLiquido || 0), 0);
      meses.push({ label, value: Math.round(total / 1000) });
    }
    return meses;
  }, [pesagens]);

  // Evolução da renda média nas análises
  const evolucaoRenda = useMemo(() => {
    return [...analises]
      .filter((a) => a.rendaMedia != null)
      .sort((a, b) => new Date(a.dataCriacao) - new Date(b.dataCriacao))
      .slice(-12)
      .map((a) => ({
        label: a.dataCriacao ? new Date(a.dataCriacao).toLocaleDateString('pt-BR', { day: '2-digit' }) : '',
        value: Number(a.rendaMedia),
      }));
  }, [analises]);

  const timeline = useMemo(() => {
    const events = [
      ...pesagens.map((p) => ({
        type: 'pesagem', date: p.dataHoraEntrada, icon: Scale, color: 'amber',
        title: `Pesagem #${p.id}`,
        desc: `${fmtKg(p.pesoFinal || p.pesoLiquido)} — ${p.veiculoPlaca || 'sem placa'}`,
        value: p.valorTotal ? fmtMoney(p.valorTotal) : null,
      })),
      ...analises.map((a) => ({
        type: 'analise', date: a.dataCriacao, icon: Beaker, color: 'fuchsia',
        title: `Análise #${a.id}`,
        desc: `Renda ${Number(a.rendaMedia || 0).toFixed(2)}g — ${a.statusQualidade || 'AGUARDANDO'}`.replace(/_/g, ' '),
        value: null,
      })),
      ...titulos.map((t) => ({
        type: 'financeiro', date: t.dataEmissao || t.dataVencimento,
        icon: t.fornecedor ? TrendingDown : TrendingUp,
        color: t.fornecedor ? 'rose' : 'lime',
        title: `${t.fornecedor ? 'A Pagar' : 'A Receber'} #${t.id}`,
        desc: t.descricao || `Vencimento ${fmt(t.dataVencimento)}`,
        value: fmtMoney(t.valorOriginal),
      })),
    ];
    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [pesagens, analises, titulos]);

  if (loading) {
    return (
      <div className="space-y-5">
        <CardSkeleton />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}</div>
      </div>
    );
  }

  if (!parceiro) {
    return <EmptyState icon={User} title="Parceiro não encontrado" description="Não foi possível carregar este registro." accent="rose" />;
  }

  const tipoCls = TIPO_BADGE[parceiro.tipoParceiro] || 'bg-slate-700 text-slate-300 border-slate-600';
  const statusBadge = {
    APROVADO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    APROVADO_COM_DESCONTO: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    REPROVADO: 'bg-red-500/10 text-red-400 border-red-500/20',
    AGUARDANDO_ANALISE: 'bg-slate-700 text-slate-400',
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/parceiros')}
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-cyan-400 transition">
        <ArrowLeft size={13} /> Voltar para parceiros
      </button>

      {/* Card identificação */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="border-l-2 border-l-cyan-500 px-6 py-5 flex items-start justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <User size={28} className="text-cyan-400" />
            </div>
            <div>
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tipoCls}`}>
                {parceiro.tipoParceiro || 'Sem tipo'}
              </span>
              <h1 className="mt-2 text-2xl font-bold text-white">{parceiro.nome}</h1>
              <p className="text-sm text-slate-500 font-mono mt-0.5">{parceiro.documento || 'Sem documento'}</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Cadastrado em</p>
            <p className="text-white font-mono mt-1">{fmt(parceiro.dataCadastro)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-800">
          <InfoCell icon={Phone} label="Telefone" value={parceiro.telefone} />
          <InfoCell icon={Mail} label="E-mail" value={parceiro.email} />
          <InfoCell icon={MapPin} label="Cidade" value={parceiro.endereco?.cidade?.nome || parceiro.cidade || 'Não informado'} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi icon={Scale} accent="amber" label="Peso Entregue" value={fmtKg(totais.pesoTotal)} sub={`${pesagens.length} pesagens`} />
        <Kpi icon={Beaker} accent="fuchsia" label="Renda Média" value={`${totais.rendaMedia.toFixed(0)} g`} sub={`${analises.length} análises`} />
        <Kpi icon={TrendingUp} accent="lime" label="Valor Pesagens" value={fmtMoney(totais.valorPesagens)} sub="Total acumulado" />
        <Kpi icon={TrendingDown} accent="rose" label="A Pagar Aberto" value={fmtMoney(totais.aPagar)} sub={`${titulos.filter((t) => t.fornecedor && t.statusFinanceiro === 'ABERTO').length} títulos`} />
        <Kpi icon={TrendingUp} accent="emerald" label="A Receber Aberto" value={fmtMoney(totais.aReceber)} sub={`${titulos.filter((t) => t.cliente && t.statusFinanceiro === 'ABERTO').length} títulos`} />
      </div>

      {/* Mini-gráficos lado a lado */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Volume mensal</p>
              <h3 className="text-sm font-bold text-white mt-0.5">Pesagens (últimos 6 meses)</h3>
            </div>
            <Scale size={14} className="text-amber-400" />
          </div>
          <BarChart data={pesagensPorMes} color="#f59e0b" height={140} valueFmt={(v) => `${v}t`} />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400">Qualidade</p>
              <h3 className="text-sm font-bold text-white mt-0.5">Evolução da renda</h3>
            </div>
            <Beaker size={14} className="text-fuchsia-400" />
          </div>
          {evolucaoRenda.length > 0
            ? <LineChart data={evolucaoRenda} color="#d946ef" height={140} valueFmt={(v) => `${v.toFixed(0)}g`} />
            : <div className="h-[140px] flex items-center justify-center text-xs text-slate-600">Sem análises</div>}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-2">
          <div className="flex">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`relative inline-flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition ${
                    active ? 'text-cyan-400' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  <Icon size={13} /> {t.label}
                  {active && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-500 rounded-t" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {tab === 'timeline' && (
            timeline.length === 0
              ? <EmptyState icon={Calendar} title="Sem atividade" description="Este parceiro ainda não tem registros." accent="slate" />
              : (
                <div className="relative space-y-4 pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-800" />
                  {timeline.map((e, i) => {
                    const Icon = e.icon;
                    const ACCENT = {
                      amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                      fuchsia: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30',
                      lime: 'text-lime-400 bg-lime-500/10 border-lime-500/30',
                      rose: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
                      emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                    }[e.color];
                    return (
                      <div key={i} className="relative flex items-center gap-4">
                        <div className={`absolute -left-6 h-4 w-4 rounded-full border-2 ${ACCENT} flex items-center justify-center`}>
                          <Icon size={9} />
                        </div>
                        <div className="flex-1 flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white">{e.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{e.desc}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {e.value && <p className="text-sm font-bold font-mono text-white">{e.value}</p>}
                            <p className="text-[10px] uppercase tracking-wider text-slate-600 mt-0.5">{fmt(e.date)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
          )}

          {tab === 'pesagens' && (
            <SubList
              empty={!pesagens.length}
              emptyIcon={Scale}
              emptyText="Sem pesagens registradas para este parceiro."
              onExport={() => exportCSV(`pesagens-${parceiro.nome}.csv`, [
                { label: 'ID', key: 'id' },
                { label: 'Data', key: 'dataHoraEntrada' },
                { label: 'Placa', key: 'veiculoPlaca' },
                { label: 'Peso Bruto', key: 'pesoBruto' },
                { label: 'Peso Tara', key: 'pesoTara' },
                { label: 'Peso Final', key: 'pesoFinal' },
                { label: 'Valor', key: 'valorTotal' },
              ], pesagens)}
              headers={['ID', 'Data', 'Placa', 'Peso Final', 'Valor', '']}
              rows={pesagens.map((p) => [
                <span className="text-slate-500 font-mono text-xs">{p.id}</span>,
                <span className="text-slate-400">{fmt(p.dataHoraEntrada)}</span>,
                <span className="text-white font-mono">{p.veiculoPlaca || '-'}</span>,
                <span className="text-amber-400 font-mono font-bold">{fmtKg(p.pesoFinal || p.pesoLiquido)}</span>,
                <span className="text-white font-mono">{p.valorTotal ? fmtMoney(p.valorTotal) : '-'}</span>,
                <button onClick={() => printTicketPesagem(p)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
                  title="Imprimir ticket"><Printer size={13} /></button>,
              ])}
            />
          )}

          {tab === 'analises' && (
            <SubList
              empty={!analises.length}
              emptyIcon={Beaker}
              emptyText="Sem análises de laboratório vinculadas."
              onExport={() => exportCSV(`analises-${parceiro.nome}.csv`, [
                { label: 'ID', key: 'id' },
                { label: 'Data', key: 'dataCriacao' },
                { label: 'Carga', key: 'pesagem.id' },
                { label: 'Amostras', key: (a) => (a.amostras || []).length },
                { label: 'Renda Media (g)', key: 'rendaMedia' },
                { label: 'Status', key: 'statusQualidade' },
              ], analises)}
              headers={['ID', 'Data', 'Carga', 'Renda Média', 'Status', '']}
              rows={analises.map((a) => [
                <span className="text-slate-500 font-mono text-xs">{a.id}</span>,
                <span className="text-slate-400">{fmt(a.dataCriacao)}</span>,
                <span className="text-slate-400 font-mono">#{a.pesagem?.id || '-'}</span>,
                <span className="text-fuchsia-400 font-mono font-bold">{Number(a.rendaMedia || 0).toFixed(2)} g</span>,
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadge[a.statusQualidade] || 'bg-slate-700 text-slate-400'}`}>
                  {(a.statusQualidade || 'AGUARDANDO').replace(/_/g, ' ')}
                </span>,
                <button onClick={() => printLaudoLaboratorio(a)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 transition"
                  title="Imprimir laudo"><Printer size={13} /></button>,
              ])}
            />
          )}

          {tab === 'eficiencia' && (
            eficiencia.detalhes.length === 0 ? (
              <EmptyState icon={Boxes} accent="emerald"
                title="Sem dados de eficiência"
                description="Pesagens deste produtor ainda não foram consumidas em lotes de produção. Crie um lote vinculando as cargas dele." />
            ) : (
              <div className="space-y-5">
                {/* KPIs eficiência */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-emerald-400">Rendimento Médio</p>
                    <p className={`mt-1 text-3xl font-bold font-mono ${eficiencia.rendimentoMedio >= 25 ? 'text-emerald-400' : eficiencia.rendimentoMedio >= 18 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {eficiencia.rendimentoMedio.toFixed(2)}%
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Conversão MP → produto</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Lotes Participados</p>
                    <p className="mt-1 text-3xl font-bold font-mono text-white">{eficiencia.lotesParticipados}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Peso Contribuído</p>
                    <p className="mt-1 text-3xl font-bold font-mono text-amber-400">{fmtKg(eficiencia.totalContribuido)}</p>
                  </div>
                </div>

                {/* Tabela detalhada por lote */}
                <SubList
                  empty={false}
                  headers={['Código', 'Produto', 'Cargas', 'Contribuído', 'Rendimento Lote', 'Data']}
                  rows={eficiencia.detalhes.map((d) => [
                    <span className="text-white font-mono font-bold">{d.codigoLote}</span>,
                    <span className="text-slate-300">{d.produtoNome || '-'}</span>,
                    <span className="text-slate-400 font-mono">{d.cargasContribuidas}</span>,
                    <span className="text-amber-400 font-mono font-bold">{fmtKg(d.pesoContribuido)}</span>,
                    <span className={`font-mono font-bold ${d.rendimento >= 25 ? 'text-emerald-400' : d.rendimento >= 18 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {d.rendimento.toFixed(2)}%
                    </span>,
                    <span className="text-slate-400">{fmt(d.dataFabricacao)}</span>,
                  ])}
                />

                {/* Hint comparativo */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-500">
                  <strong className="text-white">Referência Fecularia Loanda:</strong> rendimento esperado de fécula a partir de mandioca in natura é de <span className="text-emerald-400 font-bold font-mono">25–28%</span>.
                  Acima → mandioca de alta qualidade. Abaixo → revisar plantio/colheita do produtor.
                </div>
              </div>
            )
          )}

          {tab === 'financeiro' && (
            <SubList
              empty={!titulos.length}
              emptyIcon={TrendingUp}
              emptyText="Sem títulos financeiros vinculados."
              onExport={() => exportCSV(`financeiro-${parceiro.nome}.csv`, [
                { label: 'ID', key: 'id' },
                { label: 'Tipo', key: (t) => t.fornecedor ? 'PAGAR' : 'RECEBER' },
                { label: 'Emissão', key: 'dataEmissao' },
                { label: 'Vencimento', key: 'dataVencimento' },
                { label: 'Valor', key: 'valorOriginal' },
                { label: 'Status', key: 'statusFinanceiro' },
              ], titulos)}
              headers={['ID', 'Tipo', 'Vencimento', 'Valor', 'Status']}
              rows={titulos.map((t) => [
                <span className="text-slate-500 font-mono text-xs">{t.id}</span>,
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${t.fornecedor ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {t.fornecedor ? <TrendingDown size={9} /> : <TrendingUp size={9} />}
                  {t.fornecedor ? 'Pagar' : 'Receber'}
                </span>,
                <span className="text-slate-400">{fmt(t.dataVencimento)}</span>,
                <span className="text-white font-mono font-bold">{fmtMoney(t.valorOriginal)}</span>,
                <span className="text-[10px] uppercase tracking-wider text-slate-400">{t.statusFinanceiro || '-'}</span>,
              ])}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCell({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-900 px-5 py-4 flex items-center gap-3">
      <Icon size={14} className="text-slate-500 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-sm text-slate-300 truncate">{value || '-'}</p>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, accent, label, value, sub }) {
  const A = {
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    lime: 'bg-lime-500/10 border-lime-500/20 text-lime-400',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    fuchsia: 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400',
  }[accent];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <div className={`p-1.5 rounded-md border ${A}`}>
          <Icon size={13} />
        </div>
      </div>
      <p className="text-xl font-bold text-white font-mono">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-600 mt-1">{sub}</p>
    </div>
  );
}

function SubList({ empty, emptyIcon, emptyText, headers, rows, onExport }) {
  if (empty) return <EmptyState icon={emptyIcon} title="Nada por aqui" description={emptyText} accent="slate" />;
  return (
    <div className="space-y-3">
      {onExport && (
        <div className="flex justify-end">
          <button onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition">
            <Download size={11} /> CSV
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/50">
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                {row.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

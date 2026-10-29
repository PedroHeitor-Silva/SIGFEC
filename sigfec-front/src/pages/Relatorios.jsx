import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileChartColumn, Printer, Download, RefreshCw, AlertCircle, Calendar, Users,
  ListChecks, Weight, Beaker, HandCoins, Boxes, Package, ArrowLeftRight, ShoppingCart, DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { currentUser } from '../theme/permissions';
import { exportCSV } from '../utils/csv';
import { printRelatorio } from '../utils/printDoc';
import { fmtValor, csvValor, isNumerico, isoHoje, isoMenosDias, isoMaisDias, isoInicioMes, fmtDataIso } from '../utils/relatorio';

/** Ícone e tipo de parceiro de cada relatório (o catálogo e as permissões vêm da API). */
const META = {
  fila:                   { icon: ListChecks,     parceiro: 'PRODUTOR' },
  recebimento:            { icon: Weight,         parceiro: 'PRODUTOR' },
  qualidade:              { icon: Beaker,         parceiro: 'PRODUTOR' },
  'pagamento-produtores': { icon: HandCoins,      parceiro: 'PRODUTOR' },
  producao:               { icon: Boxes },
  estoque:                { icon: Package,        semPeriodo: true },
  kardex:                 { icon: ArrowLeftRight },
  vendas:                 { icon: ShoppingCart,   parceiro: 'CLIENTE' },
  financeiro:             { icon: DollarSign,     parceiro: 'TODOS', futuro: 90 }, // inclui vencimentos dos próximos 90 dias
};

const PERIODOS = [
  { key: 'hoje',  label: 'Hoje',       range: () => [isoHoje(), isoHoje()] },
  { key: '7d',    label: '7 dias',     range: () => [isoMenosDias(6), isoHoje()] },
  { key: 'mes',   label: 'Este mês',   range: () => [isoInicioMes(), isoHoje()] },
  { key: '30d',   label: '30 dias',    range: () => [isoMenosDias(29), isoHoje()] },
  { key: '1a',    label: '12 meses',   range: () => [isoMenosDias(364), isoHoje()] },
  { key: 'tudo',  label: 'Tudo',       range: () => ['2000-01-01', isoHoje()] },
];

const inputCls = 'rounded-lg border border-slate-700 bg-slate-800 py-2 px-3 text-sm text-white outline-none focus:border-emerald-500 transition';

export default function Relatorios() {
  const [params, setParams] = useSearchParams();
  const [catalogo, setCatalogo] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [chave, setChave] = useState(params.get('tipo') || '');
  // padrão: últimos 12 meses (com 'Este mês' o relatório costuma abrir vazio)
  const [periodo, setPeriodo] = useState('1a');
  const [inicio, setInicio] = useState(isoMenosDias(364));
  const [fim, setFim] = useState(isoHoje());
  const [parceiroId, setParceiroId] = useState('');
  const [rel, setRel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const [erroCatalogo, setErroCatalogo] = useState(false);

  const carregarCatalogo = () => {
    setErroCatalogo(false);
    api.get('/relatorios')
      .then(({ data }) => {
        if (!Array.isArray(data)) throw new Error('resposta inválida');
        setCatalogo(data);
        setChave((atual) => data.some((r) => r.chave === atual) ? atual : data[0]?.chave || '');
      })
      .catch((err) => {
        const msg = err?.response?.data?.error || (err?.response ? `Erro ${err.response.status} no servidor.` : 'Servidor fora do ar.');
        setErroCatalogo(msg);
        toast.error('Falha ao carregar os relatórios: ' + msg);
      });
    api.get('/parceiros').then(({ data }) => setParceiros(Array.isArray(data) ? data : [])).catch(() => {});
  };

  useEffect(() => { carregarCatalogo(); }, []);

  const info = catalogo.find((r) => r.chave === chave);
  const meta = META[chave] || {};

  const parceirosFiltro = useMemo(() => {
    if (!meta.parceiro) return [];
    const lista = meta.parceiro === 'TODOS' ? parceiros : parceiros.filter((p) => p.tipoParceiro === meta.parceiro);
    return [...lista].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [parceiros, meta.parceiro]);

  const gerar = async () => {
    if (!chave) return;
    setLoading(true);
    setErro('');
    try {
      const query = { inicio, fim };
      if (parceiroId && meta.parceiro) query.parceiroId = parceiroId;
      const { data } = await api.get(`/relatorios/${chave}`, { params: query });
      if (!data || !Array.isArray(data.linhas) || !Array.isArray(data.colunas)) throw new Error('resposta inválida');
      setRel(data);
    } catch (err) {
      setRel(null);
      setErro(err?.response?.data?.error || 'Não foi possível gerar o relatório.');
    } finally {
      setLoading(false);
    }
  };

  // Gera ao trocar de relatório ou de filtro
  useEffect(() => { gerar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [chave, inicio, fim, parceiroId]);

  const escolher = (k) => {
    setChave(k);
    setParceiroId('');
    // ao trocar de relatório, reaplica o período rápido (o financeiro olha também para frente)
    const p = PERIODOS.find((x) => x.key === periodo);
    if (p) { const [i, f] = p.range(); setInicio(i); setFim(META[k]?.futuro ? isoMaisDias(META[k].futuro) : f); }
    setParams(k ? { tipo: k } : {}, { replace: true });
  };

  const aplicarPeriodo = (key) => {
    const p = PERIODOS.find((x) => x.key === key);
    setPeriodo(key);
    if (p) { const [i, f] = p.range(); setInicio(i); setFim(meta.futuro ? isoMaisDias(meta.futuro) : f); }
  };

  const nomeParceiro = parceirosFiltro.find((p) => String(p.id) === String(parceiroId))?.nome;

  const handleCSV = () => exportCSV(
    `relatorio-${rel.chave}-${inicio}_${fim}.csv`,
    rel.colunas.map((c) => ({ label: c.rotulo, key: (l) => csvValor(l[c.chave], c.tipo) })),
    rel.linhas,
  );

  const handlePrint = () => {
    const u = currentUser();
    printRelatorio(rel, { inicio, fim, parceiro: nomeParceiro, usuario: u?.nome || u?.login, fmtValor });
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="relatorios"
        title="Relatórios"
        subtitle="Relatórios de todos os módulos, com filtro por período e parceiro. Imprima, salve em PDF ou exporte para Excel."
        action={rel && (
          <div className="flex gap-2">
            <button type="button" onClick={handleCSV} disabled={!rel.linhas.length}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition">
              <Download size={15} /> Excel (CSV)
            </button>
            <button type="button" onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
              <Printer size={15} /> Imprimir / PDF
            </button>
          </div>
        )}
      />

      {/* Catálogo — no celular vira uma lista de seleção para o relatório ficar logo abaixo */}
      {catalogo.length > 0 && (
        <label className="block sm:hidden">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Relatório</span>
          <select value={chave} onChange={(e) => escolher(e.target.value)} className={`${inputCls} block mt-1.5 w-full`}>
            {catalogo.map((r) => <option key={r.chave} value={r.chave}>{r.titulo}</option>)}
          </select>
        </label>
      )}
      <div className="hidden sm:grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {catalogo.map((r) => {
          const Icon = META[r.chave]?.icon || FileChartColumn;
          const ativo = r.chave === chave;
          return (
            <button key={r.chave} type="button" onClick={() => escolher(r.chave)}
              className={`text-left rounded-xl border p-4 transition flex gap-3 items-start ${ativo
                ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40'
                : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}>
              <div className={`p-2 rounded-lg border ${ativo ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-slate-700 text-slate-400 bg-slate-800'}`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-bold ${ativo ? 'text-emerald-400' : 'text-white'}`}>{r.titulo}</p>
                <p className="text-xs text-slate-500 mt-0.5">{r.descricao}</p>
              </div>
            </button>
          );
        })}
        {!catalogo.length && !erroCatalogo && <p className="text-sm text-slate-500">Carregando relatórios...</p>}
        {erroCatalogo && (
          <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center gap-3">
            <AlertCircle size={16} /> Não foi possível carregar os relatórios ({erroCatalogo}).
            <button type="button" onClick={carregarCatalogo} className="ml-auto rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-bold hover:bg-red-500/10">Tentar de novo</button>
          </div>
        )}
      </div>

      {/* Filtros */}
      {info && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-wrap items-end gap-4">
          {!meta.semPeriodo ? (
            <>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1"><Calendar size={11} /> Período</p>
                <div className="flex flex-wrap gap-1.5">
                  {PERIODOS.map((p) => (
                    <button key={p.key} type="button" onClick={() => aplicarPeriodo(p.key)}
                      className={`rounded-md px-3 py-1.5 text-xs font-bold transition border ${periodo === p.key
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">De</span>
                <input type="date" value={inicio} max={fim} onChange={(e) => { setInicio(e.target.value); setPeriodo(''); }} className={`${inputCls} block mt-1.5`} />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Até</span>
                <input type="date" value={fim} min={inicio} onChange={(e) => { setFim(e.target.value); setPeriodo(''); }} className={`${inputCls} block mt-1.5`} />
              </label>
            </>
          ) : (
            <p className="text-sm text-slate-400">Posição atual do estoque (não depende de período).</p>
          )}
          {meta.parceiro && (
            <label className="block min-w-[220px]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                <Users size={11} /> {meta.parceiro === 'CLIENTE' ? 'Cliente' : meta.parceiro === 'PRODUTOR' ? 'Produtor' : 'Parceiro'}
              </span>
              <select value={parceiroId} onChange={(e) => setParceiroId(e.target.value)} className={`${inputCls} block mt-1.5 w-full`}>
                <option value="">Todos</option>
                {parceirosFiltro.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
          )}
          <button type="button" onClick={gerar} disabled={loading}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>
      )}

      {erro && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle size={16} /> {erro}
        </div>
      )}

      {rel && (
        <>
          {/* Indicadores */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {rel.indicadores.map((i) => (
              <div key={i.rotulo} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{i.rotulo}</p>
                <p className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums mt-2">{fmtValor(i.valor, i.tipo)}</p>
              </div>
            ))}
          </div>

          {/* Tabela */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <FileChartColumn size={16} className="text-emerald-400" />
                <span className="text-sm font-bold text-white">{rel.titulo}</span>
              </div>
              <span className="text-xs text-slate-500">
                {meta.semPeriodo ? 'Posição atual' : `${fmtDataIso(inicio)} a ${fmtDataIso(fim)}`}
                {nomeParceiro ? ` • ${nomeParceiro}` : ''} • {rel.linhas.length} registro{rel.linhas.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/50">
                    {rel.colunas.map((c) => (
                      <th key={c.chave} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap ${isNumerico(c.tipo) ? 'text-right' : 'text-left'}`}>
                        {c.rotulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rel.linhas.length === 0 ? (
                    <tr>
                      <td colSpan={rel.colunas.length} className="px-5 py-12 text-center">
                        <AlertCircle size={28} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-sm font-bold text-white">Nenhum registro no período</p>
                        <p className="text-xs text-slate-500 mt-1">Ajuste o período ou o filtro de parceiro.</p>
                      </td>
                    </tr>
                  ) : rel.linhas.map((l, idx) => (
                    <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                      {rel.colunas.map((c) => (
                        <td key={c.chave} className={`px-4 py-2.5 whitespace-nowrap ${isNumerico(c.tipo) ? 'text-right font-mono text-slate-300' : 'text-slate-300'}`}>
                          {fmtValor(l[c.chave], c.tipo)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rel.linhas.length > 0 && rel.totais && Object.keys(rel.totais).length > 0 && (
                    <tr className="bg-slate-800/50 font-bold">
                      {rel.colunas.map((c) => {
                        const v = rel.totais[c.chave];
                        return (
                          <td key={c.chave} className={`px-4 py-3 whitespace-nowrap ${isNumerico(c.tipo) ? 'text-right font-mono text-emerald-400' : 'text-xs uppercase tracking-wider text-emerald-400'}`}>
                            {v == null ? '' : typeof v === 'string' ? v : fmtValor(v, c.tipo)}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

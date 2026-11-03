import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
/* eslint-disable react/prop-types */
import { Plus, Search, Trash2, Package, AlertTriangle, Pencil, Scale, CircleDashed, ArrowUpDown, History } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { confirm } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
import BotaoAcao from '../components/BotaoAcao';
import { TableSkeleton } from '../components/Skeleton';
import { toastUndo } from '../utils/undoToast';
import EditModal from '../components/EditModal';
import { unidadeLabel, formatarQtd, equivalenteKg } from '../utils/unidades';
import { can } from '../theme/permissions';
import SortableHeader, { applySort } from '../components/SortableHeader';
import { BarraFiltros, CampoBusca, FiltroSelect, contem } from '../components/Filtros';

const CATEGORIA_LABEL = {
  FECULA: 'Fécula', TAPIOCA: 'Tapioca', POLVILHO_DOCE: 'Polvilho Doce',
  POLVILHO_AZEDO_GRANULADO: 'Polvilho Azedo (Gran.)', POLVILHO_AZEDO_PO: 'Polvilho Azedo (Pó)',
  DEXTRINA: 'Dextrina', RESIDUO_FIBROSO: 'Resíduo', MANDIOCA: 'Mandioca',
};

/** Papel do produto no processo (define ordem e o que a tela mostra). */
const TIPO = {
  MANDIOCA: { ordem: 3, label: 'Matéria-prima' },
  RESIDUO_FIBROSO: { ordem: 2, label: 'Subproduto' },
};
const tipoDe = (cat) => TIPO[cat] || { ordem: 1, label: 'Produto acabado' };

export default function EstoqueListagem() {
  const [estoques, setEstoques] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [ajustando, setAjustando] = useState(null);
  const navigate = useNavigate();

  const carregar = () => {
    setLoading(true);
    Promise.all([api.get('/estoque'), api.get('/produtos').catch(() => ({ data: [] }))])
      .then(([est, prod]) => {
        setEstoques(Array.isArray(est.data) ? est.data : []);
        setProdutos(Array.isArray(prod.data) ? prod.data : []);
      })
      .catch(() => setError('Não foi possível carregar o estoque.'))
      .finally(() => setLoading(false));
  };
  useEffect(carregar, []);

  const abaixoMinimo = (e) => {
    const atual = Number(e.quantidadeAtual || 0);
    const min = Number(e.quantidadeMinima || 0);
    return min > 0 && atual <= min;
  };

  // Todos os produtos do catálogo: os sem registro de estoque aparecem com saldo 0 ("sem movimentação").
  const linhas = useMemo(() => {
    const porProduto = new Map(estoques.map((e) => [e.produto?.id, e]));
    const semCadastro = estoques.filter((e) => !produtos.some((p) => p.id === e.produto?.id));
    const todas = [
      ...produtos.map((p) => porProduto.get(p.id) || { id: null, produto: p, quantidadeAtual: 0, quantidadeMinima: 0, semRegistro: true }),
      ...semCadastro,
    ];
    return todas.sort((a, b) => tipoDe(a.produto?.categoria).ordem - tipoDe(b.produto?.categoria).ordem
      || (a.produto?.nome || '').localeCompare(b.produto?.nome || ''));
  }, [estoques, produtos]);

  const [fTipo, setFTipo] = useState('');
  const [fSituacao, setFSituacao] = useState('');
  const [sort, setSort] = useState({ key: null, dir: null }); // padrão: acabados → subproduto → matéria-prima

  const situacaoDe = (e) => (e.produto?.categoria === 'MANDIOCA' ? 'Matéria-prima'
    : e.semRegistro ? 'Sem movimentação' : abaixoMinimo(e) ? 'Estoque baixo' : 'Normal');

  const filtered = useMemo(() => applySort(linhas.filter((e) =>
    contem(search, e.produto?.nome, CATEGORIA_LABEL[e.produto?.categoria])
    && (!fTipo || tipoDe(e.produto?.categoria).label === fTipo)
    && (!fSituacao || situacaoDe(e) === fSituacao)), sort, {
    categoria: (e) => CATEGORIA_LABEL[e.produto?.categoria] || e.produto?.categoria,
    situacao: situacaoDe,
  }), [linhas, search, fTipo, fSituacao, sort]);
  const algumFiltro = !!(search || fTipo || fSituacao);
  const limpar = () => { setSearch(''); setFTipo(''); setFSituacao(''); };

  const alertas = useMemo(() => estoques.filter(abaixoMinimo).length, [estoques]);

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Excluir registro de estoque',
      message: `Remover este item do estoque?`,
      confirmLabel: 'Excluir', tone: 'danger',
    });
    if (!ok) return;
    const backup = estoques.find((e) => e.id === id);
    setEstoques((prev) => prev.filter((e) => e.id !== id));
    const undone = await toastUndo('Item removido.', () => {
      if (backup) setEstoques((prev) => [backup, ...prev]);
    });
    if (!undone) {
      try { await api.delete(`/estoque/${id}`); }
      catch {
        if (backup) setEstoques((prev) => [backup, ...prev]);
        toast.error('Falha ao excluir.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="estoque"
        title="Controle de Estoque"
        subtitle={`${linhas.length} produtos no catálogo · ${estoques.length} com registro de estoque`}
        action={
          <button type="button" onClick={() => navigate('/estoque/novo')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
            <Plus size={15} /> Novo Item
          </button>
        }
      />

      {alertas > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-400" />
          <span className="text-sm text-slate-300">
            <span className="font-bold text-amber-400">{alertas}</span> produto(s) com estoque no mínimo ou abaixo.
          </span>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <BarraFiltros total={linhas.length} exibidos={filtered.length} ativo={algumFiltro} onLimpar={limpar}>
          <CampoBusca value={search} onChange={setSearch} placeholder="Buscar produto ou categoria" />
          <FiltroSelect label="Tipo" value={fTipo} onChange={setFTipo} options={['Produto acabado', 'Subproduto', 'Matéria-prima']} />
          <FiltroSelect label="Situação" value={fSituacao} onChange={setFSituacao} options={['Estoque baixo', 'Normal', 'Sem movimentação', 'Matéria-prima']} />
        </BarraFiltros>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <SortableHeader sortKey="produto.nome" current={sort} onChange={setSort}>Produto</SortableHeader>
                <SortableHeader sortKey="categoria" current={sort} onChange={setSort}>Categoria</SortableHeader>
                <SortableHeader sortKey="quantidadeAtual" current={sort} onChange={setSort}>Saldo atual</SortableHeader>
                <SortableHeader sortKey="quantidadeMinima" current={sort} onChange={setSort}>Mínimo</SortableHeader>
                <SortableHeader sortKey="situacao" current={sort} onChange={setSort}>Situação</SortableHeader>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : error ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-red-400">{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-2">
                  <EmptyState icon={Package} accent="sky"
                    title="Estoque vazio"
                    description="Registre o estoque de cada produto acabado (fécula, polvilho, tapioca)."
                    action={
                      <button type="button" onClick={() => navigate('/estoque/novo')}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
                        <Plus size={15} /> Novo Item
                      </button>
                    }
                  />
                </td></tr>
              ) : (
                filtered.map((e) => {
                  const materiaPrima = e.produto?.categoria === 'MANDIOCA';
                  const baixo = !e.semRegistro && abaixoMinimo(e);
                  const un = e.produto?.unidadeMedida;
                  const eqAtual = equivalenteKg(e.quantidadeAtual, un);
                  return (
                    <tr key={e.id ?? `p-${e.produto?.id}`} className={`border-b border-slate-800/60 hover:bg-slate-800/40 transition ${e.semRegistro ? 'opacity-80' : ''}`}>
                      <td className="px-5 py-4 font-medium text-white">{e.produto?.nome || '—'}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {CATEGORIA_LABEL[e.produto?.categoria] || e.produto?.categoria || '—'}
                        </span>
                        <span className="block mt-1 text-[11px] text-slate-500">{tipoDe(e.produto?.categoria).label}</span>
                      </td>
                      <td className="px-5 py-4">
                        {materiaPrima ? <span className="text-slate-500">—</span> : (
                        <span className={`font-mono font-bold ${baixo ? 'text-amber-400' : e.semRegistro ? 'text-slate-400' : 'text-white'}`}>
                          {formatarQtd(e.quantidadeAtual, un)}
                        </span>)}
                        {!materiaPrima && !e.semRegistro && eqAtual && (
                          <span className="block text-[11px] text-slate-600">≈ {eqAtual}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-400">
                        {materiaPrima || e.semRegistro ? '—' : formatarQtd(e.quantidadeMinima, un)}
                      </td>
                      <td className="px-5 py-4">
                        {materiaPrima ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2.5 py-0.5 text-xs font-semibold">
                            <Scale size={11} /> Matéria-prima · controlada pela pesagem
                          </span>
                        ) : e.semRegistro ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 text-xs font-semibold">
                            <CircleDashed size={11} /> Sem movimentação
                          </span>
                        ) : baixo ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold">
                            <AlertTriangle size={11} /> Estoque baixo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Normal
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {!materiaPrima && can('estoque', e.semRegistro ? 'criar' : 'editar') && (
                            <BotaoAcao icon={ArrowUpDown} label="Ajustar saldo" cor="verde" onClick={() => setAjustando(e)} />
                          )}
                          {!e.semRegistro && can('estoque', 'editar') && (
                            <Tooltip label="Alterar estoque mínimo">
                              <BotaoAcao icon={Pencil} label="Alterar estoque mínimo" cor="azul" soIcone dicaNativa={false} onClick={() => setEditing(e)} />
                            </Tooltip>
                          )}
                          {!e.semRegistro && (
                            <Tooltip label="Histórico (Kardex)">
                              <BotaoAcao icon={History} label="Histórico (Kardex)" cor="azul" soIcone dicaNativa={false}
                                onClick={() => navigate('/relatorios?tipo=kardex')} />
                            </Tooltip>
                          )}
                          {!e.semRegistro && can('estoque', 'excluir') && (
                            <Tooltip label="Excluir">
                              <BotaoAcao icon={Trash2} label="Excluir" cor="vermelho" soIcone dicaNativa={false} onClick={() => handleDelete(e.id)} />
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

      <EditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => setEstoques((prev) => prev.map((e) => e.id === updated.id ? updated : e))}
        title={`Estoque mínimo — ${editing?.produto?.nome || ''}`}
        endpoint={editing ? `/estoque/${editing.id}` : ''}
        initial={editing ? {
          id: editing.id,
          quantidadeMinima: editing.quantidadeMinima ?? 0,
        } : {}}
        fields={[
          {
            name: 'quantidadeMinima',
            label: `Avisar quando o saldo chegar a (${unidadeLabel(editing?.produto?.unidadeMedida)})`,
            type: 'number',
          },
        ]}
      />

      {ajustando && (
        <AjusteSaldoModal linha={ajustando} onClose={() => setAjustando(null)}
          onSalvo={() => { setAjustando(null); carregar(); }} />
      )}
    </div>
  );
}

/**
 * Ajuste de saldo pelo Kardex: o usuário informa o saldo CONTADO (inventário) ou a quantidade a somar/tirar,
 * e o motivo. Gera AJUSTE_ENTRADA/AJUSTE_SAIDA — o histórico fica no relatório de Kardex.
 */
function AjusteSaldoModal({ linha, onClose, onSalvo }) {
  const un = linha.produto?.unidadeMedida;
  const atual = Number(linha.quantidadeAtual || 0);
  const [modo, setModo] = useState('CONTAGEM'); // CONTAGEM | ENTRADA | SAIDA
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const num = parseFloat(String(valor).replace(',', '.'));
  const diferenca = Number.isFinite(num)
    ? (modo === 'CONTAGEM' ? num - atual : modo === 'ENTRADA' ? num : -num)
    : 0;
  const novoSaldo = atual + diferenca;

  const MOTIVOS = modo === 'SAIDA' || diferenca < 0
    ? ['Inventário (contagem física)', 'Avaria / perda', 'Amostra / consumo interno', 'Correção de lançamento']
    : ['Inventário (contagem física)', 'Saldo inicial', 'Devolução de cliente', 'Correção de lançamento'];

  const salvar = async () => {
    if (!Number.isFinite(num) || num < 0) { toast.error('Informe uma quantidade válida.'); return; }
    if (Math.abs(diferenca) < 0.0005) { toast('Saldo igual ao atual — nada a ajustar.', { icon: 'ℹ️' }); return; }
    if (novoSaldo < 0) { toast.error('O saldo não pode ficar negativo.'); return; }
    if (!motivo.trim()) { toast.error('Escolha ou escreva o motivo do ajuste.'); return; }
    setSalvando(true);
    try {
      await api.post('/movimentacoes-estoque/ajuste', {
        produtoId: linha.produto.id,
        tipo: diferenca > 0 ? 'AJUSTE_ENTRADA' : 'AJUSTE_SAIDA',
        quantidade: Math.abs(Math.round(diferenca * 1000) / 1000),
        motivo: motivo.trim(),
      });
      toast.success(`Saldo de ${linha.produto.nome} ajustado para ${formatarQtd(novoSaldo, un)}.`);
      onSalvo();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível ajustar o saldo.');
    } finally {
      setSalvando(false);
    }
  };

  const inputCls = 'mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500';
  const ABAS = [
    { k: 'CONTAGEM', l: 'Informar saldo contado' },
    { k: 'ENTRADA', l: 'Somar ao saldo' },
    { k: 'SAIDA', l: 'Tirar do saldo' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={`Ajustar saldo de ${linha.produto?.nome}`}>
        <h2 className="text-lg font-bold text-white">Ajustar saldo — {linha.produto?.nome}</h2>
        <p className="mt-1 text-sm text-slate-400">
          Saldo atual: <strong className="font-mono text-white">{formatarQtd(atual, un)}</strong>. O ajuste fica registrado no Kardex com seu usuário.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-slate-800 p-1">
          {ABAS.map((a) => (
            <button key={a.k} type="button" onClick={() => setModo(a.k)}
              className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${modo === a.k ? 'bg-slate-900 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              {a.l}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm font-semibold text-slate-200">
          {modo === 'CONTAGEM' ? 'Quantidade contada' : 'Quantidade'} ({unidadeLabel(un)})
          <input autoFocus type="number" min="0" step="0.001" value={valor} onChange={(e) => setValor(e.target.value)}
            className={`${inputCls} font-mono text-base`} placeholder="0" />
        </label>

        {Number.isFinite(num) && Math.abs(diferenca) >= 0.0005 && (
          <p className={`mt-2 text-sm font-semibold ${diferenca > 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
            {diferenca > 0 ? 'Entrada' : 'Saída'} de {formatarQtd(Math.abs(diferenca), un)} → novo saldo {formatarQtd(Math.max(novoSaldo, 0), un)}
          </p>
        )}

        <label className="mt-4 block text-sm font-semibold text-slate-200">
          Motivo
          <input list="motivos-ajuste" value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls}
            placeholder="Escolha ou escreva" maxLength={200} />
          <datalist id="motivos-ajuste">{MOTIVOS.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MOTIVOS.map((m) => (
            <button key={m} type="button" onClick={() => setMotivo(m)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${motivo === m ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
              {m}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800">Cancelar</button>
          <button type="button" onClick={salvar} disabled={salvando}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
            <ArrowUpDown size={15} /> {salvando ? 'Ajustando…' : 'Confirmar ajuste'}
          </button>
        </div>
      </div>
    </div>
  );
}

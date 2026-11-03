import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, RefreshCcw, Search, Users, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import SortableHeader, { applySort } from '../components/SortableHeader';
import DateRangeFilter from '../components/DateRangeFilter';
import { BarraFiltros, CampoBusca, FiltroSelect, opcoesDe, noPeriodo, contem } from '../components/Filtros';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { confirm } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
import BotaoAcao from '../components/BotaoAcao';
import { TableSkeleton } from '../components/Skeleton';
import EditModal from '../components/EditModal';
import { exportCSV } from '../utils/csv';

const LOCAL_KEY = '@sigfec:parceiros';

const TIPO_BADGE = {
  PRODUTOR:   { label: 'Produtor',   cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  CLIENTE:    { label: 'Cliente',    cls: 'bg-sky-500/10 text-sky-400 border border-sky-500/20' },
  FORNECEDOR: { label: 'Fornecedor', cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
};

const fmt = (v) => {
  if (!v) return '-';
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00' : v); // AAAA-MM-DD é data local
  return Number.isNaN(d.getTime()) ? v : new Intl.DateTimeFormat('pt-BR').format(d);
};

const merge = (remote, local) => {
  const map = new Map();
  [...remote, ...local].forEach((p) => {
    const k = String(p.id || `${p.nome}-${p.documento}`);
    if (!map.has(k)) map.set(k, p);
  });
  return Array.from(map.values());
};

export default function ListaParceiros() {
  const [parceiros, setParceiros] = useState([]);
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  const fetch = async (force = false) => {
    const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    force ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await api.get('/parceiros');
      setParceiros(merge(Array.isArray(data) ? data : [], local));
      setError('');
    } catch {
      setParceiros(local);
      setError('Backend indisponível — exibindo dados locais.');
      toast.error('Usando dados locais.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const [fCidade, setFCidade] = useState('');
  const [datas, setDatas] = useState({ from: '', to: '' });
  const [sort, setSort] = useState({ key: 'nome', dir: 'asc' });
  const cidadeDe = (p) => p.endereco?.cidade?.nome || p.cidade || '';

  const filtered = useMemo(() => applySort(parceiros.filter((p) =>
    (tipoFiltro === 'TODOS' || p.tipoParceiro === tipoFiltro)
    && (!fCidade || cidadeDe(p) === fCidade)
    && noPeriodo(p.dataCadastro, datas)
    && contem(search, p.nome, p.documento, (p.documento || '').replace(/\D/g, ''), p.email, p.telefone, cidadeDe(p))),
  sort, { cidade: cidadeDe }), [parceiros, search, tipoFiltro, fCidade, datas, sort]);
  const algumFiltro = !!(search || tipoFiltro !== 'TODOS' || fCidade || datas.from || datas.to);
  const limpar = () => { setSearch(''); setTipoFiltro('TODOS'); setFCidade(''); setDatas({ from: '', to: '' }); };

  const handleDelete = async (p) => {
    const ok = await confirm({
      title: 'Excluir parceiro',
      message: `Remover "${p.nome}"? Se tiver pesagens/vendas/títulos vinculados, será bloqueado.`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/parceiros/${p.id}`);
      setParceiros((prev) => prev.filter((x) => x.id !== p.id));
      toast.success('Parceiro removido.');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Falha ao excluir.');
    }
  };

  return (
    <div className="space-y-5">
      <ModuleHeader
        moduleKey="parceiros"
        title="Gestão de Parceiros"
        subtitle={`${parceiros.length} ${parceiros.length === 1 ? 'parceiro cadastrado' : 'parceiros cadastrados'}`}
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => exportCSV('parceiros.csv', [
                { label: 'ID', key: 'id' },
                { label: 'Nome', key: 'nome' },
                { label: 'Documento', key: 'documento' },
                { label: 'Tipo', key: 'tipoParceiro' },
                { label: 'Telefone', key: 'telefone' },
                { label: 'Email', key: 'email' },
              ], filtered)}
              disabled={!filtered.length}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition"
            >
              <Download size={15} /> CSV
            </button>
            <button
              type="button"
              onClick={() => fetch(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition"
            >
              <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/parceiros/novo')}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition"
            >
              <Plus size={15} /> Novo Parceiro
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <BarraFiltros total={parceiros.length} exibidos={filtered.length} ativo={algumFiltro} onLimpar={limpar}>
          <CampoBusca value={search} onChange={setSearch} placeholder="Buscar nome, CPF/CNPJ, telefone ou e-mail" />
          {/* Filtro tipo */}
          <div className="flex flex-wrap gap-1.5">
            {['TODOS', 'PRODUTOR', 'CLIENTE', 'FORNECEDOR'].map((t) => (
              <button key={t} type="button" onClick={() => setTipoFiltro(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                  tipoFiltro === t ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}>
                {t}
              </button>
            ))}
          </div>
          <FiltroSelect label="Cidade" value={fCidade} onChange={setFCidade} options={opcoesDe(parceiros, cidadeDe)} />
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
            Cadastro <DateRangeFilter from={datas.from} to={datas.to} onChange={setDatas} />
          </span>
        </BarraFiltros>

        {error && (
          <div className="px-5 py-3 bg-amber-500/5 border-b border-amber-500/20 text-xs text-amber-400">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {[['ID', 'id'], ['Nome', 'nome'], ['Tipo', 'tipoParceiro'], ['Documento', 'documento'], ['Cidade', 'cidade'], ['E-mail', 'email'], ['Cadastro', 'dataCadastro']].map(([h, k]) => (
                  <SortableHeader key={h} sortKey={k} current={sort} onChange={setSort}>{h}</SortableHeader>
                ))}
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={8} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-2">
                  <EmptyState
                    icon={Users}
                    accent="cyan"
                    title={algumFiltro ? 'Nenhum resultado' : 'Nenhum parceiro cadastrado'}
                    description={algumFiltro ? 'Ajuste a busca ou use "Limpar filtros".' : 'Cadastre produtores, fornecedores ou clientes pra começar.'}
                    action={!algumFiltro && (
                      <button type="button" onClick={() => navigate('/parceiros/novo')}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
                        <Plus size={15} /> Novo Parceiro
                      </button>
                    )}
                  />
                </td></tr>
              ) : (
                filtered.map((p) => {
                  const tipo = TIPO_BADGE[p.tipoParceiro];
                  const cidade = p.endereco?.cidade?.nome || p.cidade || '-';
                  return (
                    <tr key={p.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4 text-slate-500 text-xs">{p.id}</td>
                      <td className="px-5 py-4 font-medium text-white">{p.nome}</td>
                      <td className="px-5 py-4">
                        {tipo ? (
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${tipo.cls}`}>
                            {tipo.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-mono text-xs">{p.documento || '-'}</td>
                      <td className="px-5 py-4 text-slate-400">{cidade}</td>
                      <td className="px-5 py-4 text-slate-400">{p.email || '-'}</td>
                      <td className="px-5 py-4 text-slate-400">{fmt(p.dataCadastro)}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          <Tooltip label="Ver histórico">
                              <BotaoAcao icon={FileText} label="Ver histórico" cor="azul" soIcone dicaNativa={false} onClick={() => navigate(`/parceiros/${p.id}`)} />
                            </Tooltip>
                          <Tooltip label="Editar parceiro">
                              <BotaoAcao icon={Edit2} label="Editar parceiro" cor="azul" soIcone dicaNativa={false} onClick={() => setEditing(p)} />
                            </Tooltip>
                          <Tooltip label="Excluir parceiro">
                              <BotaoAcao icon={Trash2} label="Excluir parceiro" cor="vermelho" soIcone dicaNativa={false} onClick={() => handleDelete(p)} />
                            </Tooltip>
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

      {/* Modal edição */}
      <EditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={(upd) => setParceiros((prev) => prev.map((x) => x.id === upd.id ? { ...x, ...upd } : x))}
        title={`Editar parceiro — ${editing?.nome || ''}`}
        endpoint={editing ? `/parceiros/${editing.id}` : ''}
        initial={editing ? {
          id: editing.id,
          nome: editing.nome ?? '',
          documento: editing.documento ?? '',
          tipoParceiro: editing.tipoParceiro ?? '',
          email: editing.email ?? '',
          telefone: editing.telefone ?? '',
          inscricaoEstadual: editing.inscricaoEstadual ?? '',
          rg: editing.rg ?? '',
          limiteCredito: editing.limiteCredito ?? '',
        } : {}}
        fields={[
          { name: 'nome', label: 'Nome / Razão Social', required: true, full: true },
          { name: 'documento', label: 'CPF / CNPJ', mask: 'documento' },
          {
            name: 'tipoParceiro', label: 'Tipo de Parceiro', type: 'select', required: true,
            options: [
              { value: 'PRODUTOR', label: 'Produtor' },
              { value: 'CLIENTE', label: 'Cliente' },
              { value: 'FORNECEDOR', label: 'Fornecedor' },
            ],
          },
          { name: 'email', label: 'E-mail', type: 'email' },
          { name: 'telefone', label: 'Telefone', mask: 'telefone' },
          { name: 'inscricaoEstadual', label: 'Inscrição Estadual' },
          { name: 'rg', label: 'RG', mask: 'rg' },
          { name: 'limiteCredito', label: 'Limite de Crédito (R$)', type: 'number' },
        ]}
      />
    </div>
  );
}

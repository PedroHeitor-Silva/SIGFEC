import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, RefreshCcw, Search, Users, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { confirm } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
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

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return parceiros.filter((p) => {
      if (tipoFiltro !== 'TODOS' && p.tipoParceiro !== tipoFiltro) return false;
      if (!t) return true;
      return (p.nome || '').toLowerCase().includes(t) ||
             (p.documento || '').toLowerCase().includes(t);
    });
  }, [parceiros, search, tipoFiltro]);

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
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 transition shadow-lg shadow-cyan-900/40"
            >
              <Plus size={15} /> Novo Parceiro
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou documento"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition"
            />
          </div>
          {/* Filtro tipo */}
          <div className="flex flex-wrap gap-1.5">
            {['TODOS', 'PRODUTOR', 'CLIENTE', 'FORNECEDOR'].map((t) => (
              <button key={t} type="button" onClick={() => setTipoFiltro(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                  tipoFiltro === t ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-5 py-3 bg-amber-500/5 border-b border-amber-500/20 text-xs text-amber-400">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {['ID', 'Nome', 'Tipo', 'Documento', 'Cidade', 'E-mail', 'Cadastro', 'Ações'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
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
                    title={search || tipoFiltro !== 'TODOS' ? 'Nenhum resultado' : 'Nenhum parceiro cadastrado'}
                    description={search || tipoFiltro !== 'TODOS' ? 'Ajuste a busca ou filtro.' : 'Cadastre produtores, fornecedores ou clientes pra começar.'}
                    action={!search && tipoFiltro === 'TODOS' && (
                      <button type="button" onClick={() => navigate('/parceiros/novo')}
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 transition">
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
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tipo.cls}`}>
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
                            <button type="button" onClick={() => navigate(`/parceiros/${p.id}`)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition">
                              <FileText size={14} />
                            </button>
                          </Tooltip>
                          <Tooltip label="Editar parceiro">
                            <button type="button" onClick={() => setEditing(p)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition">
                              <Edit2 size={14} />
                            </button>
                          </Tooltip>
                          <Tooltip label="Excluir parceiro">
                            <button type="button" onClick={() => handleDelete(p)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition">
                              <Trash2 size={14} />
                            </button>
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

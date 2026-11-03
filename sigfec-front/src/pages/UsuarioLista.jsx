import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Trash2, UserCog, Edit2, Power, ShieldOff, ShieldCheck, Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SortableHeader, { applySort } from '../components/SortableHeader';
import { BarraFiltros, CampoBusca, contem } from '../components/Filtros';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { confirm } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
import BotaoAcao from '../components/BotaoAcao';
import { TableSkeleton } from '../components/Skeleton';
import EditModal from '../components/EditModal';
import PermissoesModal from '../components/PermissoesModal';

const PERFIL_BADGE = {
  ADMIN:       { label: 'Administrador',   cls: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' },
  BALANCA:     { label: 'Balança',         cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  LABORATORIO: { label: 'Laboratório',     cls: 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20' },
  PRODUCAO:    { label: 'Produção',        cls: 'bg-sky-500/10 text-sky-400 border border-sky-500/20' },
  FINANCEIRO:  { label: 'Financeiro',      cls: 'bg-lime-500/10 text-lime-400 border border-lime-500/20' },
};

const PERFIL_OPTIONS = Object.entries(PERFIL_BADGE).map(([value, v]) => ({ value, label: v.label }));

export default function UsuarioLista() {
  const [usuarios, setUsuarios] = useState([]);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('TODOS'); // TODOS | ATIVOS | INATIVOS
  const [filtroPerfil, setFiltroPerfil] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [permUser, setPermUser] = useState(null);
  const navigate = useNavigate();

  const carregar = () => {
    setLoading(true);
    api.get('/usuarios')
      .then(({ data }) => setUsuarios(data || []))
      .catch((err) => {
        toast.error(err?.response?.data?.error || 'Falha ao carregar usuários.');
      })
      .finally(() => setLoading(false));
  };
  useEffect(carregar, []);

  const [sort, setSort] = useState({ key: 'nome', dir: 'asc' });
  const filtered = useMemo(() => {
    return applySort(usuarios.filter((u) => {
      if (filtroStatus === 'ATIVOS' && !u.statusAtivo) return false;
      if (filtroStatus === 'INATIVOS' && u.statusAtivo) return false;
      if (filtroPerfil !== 'TODOS' && u.perfilAcesso !== filtroPerfil) return false;
      return contem(search, u.login, u.nome, u.email);
    }), sort);
  }, [usuarios, search, filtroStatus, filtroPerfil, sort]);
  const algumFiltro = !!(search || filtroStatus !== 'TODOS' || filtroPerfil !== 'TODOS');
  const limpar = () => { setSearch(''); setFiltroStatus('TODOS'); setFiltroPerfil('TODOS'); };

  const toggleAtivo = async (u) => {
    const novoStatus = !u.statusAtivo;
    const ok = await confirm({
      title: novoStatus ? 'Ativar usuário' : 'Desativar usuário',
      message: novoStatus
        ? `Liberar acesso de "${u.login}" ao sistema?`
        : `Bloquear acesso de "${u.login}"? Ele não conseguirá mais fazer login.`,
      confirmLabel: novoStatus ? 'Ativar' : 'Desativar',
      tone: novoStatus ? 'info' : 'warning',
    });
    if (!ok) return;
    try {
      const { data } = await api.put(`/usuarios/${u.id}`, { ...u, statusAtivo: novoStatus, senha: null });
      setUsuarios((prev) => prev.map((x) => x.id === u.id ? data : x));
      toast.success(novoStatus ? 'Usuário ativado.' : 'Usuário desativado.');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Falha ao atualizar status.');
    }
  };

  const handleDelete = async (u) => {
    const ok = await confirm({
      title: 'Excluir usuário',
      message: `Remover "${u.login}" permanentemente? Recomendado desativar em vez de excluir.`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/usuarios/${u.id}`);
      setUsuarios((prev) => prev.filter((x) => x.id !== u.id));
      toast.success('Usuário removido.');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Falha ao excluir.');
    }
  };

  const totais = useMemo(() => ({
    total: usuarios.length,
    ativos: usuarios.filter((u) => u.statusAtivo).length,
    inativos: usuarios.filter((u) => !u.statusAtivo).length,
  }), [usuarios]);

  return (
    <div className="space-y-5">
      <ModuleHeader
        moduleKey="usuarios"
        title="Usuários e Acessos"
        subtitle={`${totais.total} usuário(s) — ${totais.ativos} ativo(s), ${totais.inativos} inativo(s)`}
        action={
          <button type="button" onClick={() => navigate('/usuarios/novo')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
            <Plus size={15} /> Novo Usuário
          </button>
        }
      />

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <BarraFiltros total={usuarios.length} exibidos={filtered.length} ativo={algumFiltro} onLimpar={limpar}>
          <CampoBusca value={search} onChange={setSearch} placeholder="Buscar por login, nome ou email" />
          <div className="flex flex-wrap gap-1.5">
            {['TODOS', 'ATIVOS', 'INATIVOS'].map((s) => (
              <button key={s} type="button" onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                  filtroStatus === s ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}>{s}</button>
            ))}
            <span className="w-px bg-slate-700 mx-1" />
            <select value={filtroPerfil} onChange={(e) => setFiltroPerfil(e.target.value)}
              className="rounded-md bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <option value="TODOS">Todos perfis</option>
              {PERFIL_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </BarraFiltros>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {[['ID', 'id'], ['Login', 'login'], ['Nome', 'nome'], ['Email', 'email'], ['Perfil', 'perfilAcesso'], ['Acesso', 'statusAtivo']].map(([h, k]) => (
                  <SortableHeader key={h} sortKey={k} current={sort} onChange={setSort}>{h}</SortableHeader>
                ))}
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={7} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-2">
                  <EmptyState icon={UserCog} accent="rose"
                    title="Nenhum usuário"
                    description="Cadastre usuários com perfil de acesso para liberar o sistema."
                  />
                </td></tr>
              ) : (
                filtered.map((u) => {
                  const perfil = PERFIL_BADGE[u.perfilAcesso];
                  return (
                    <tr key={u.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4 text-slate-500 text-xs font-mono">#{u.id}</td>
                      <td className="px-5 py-4 font-mono font-bold text-white">{u.login}</td>
                      <td className="px-5 py-4 text-slate-300">{u.nome || '—'}</td>
                      <td className="px-5 py-4 text-slate-400 text-xs">{u.email || '—'}</td>
                      <td className="px-5 py-4">
                        {perfil ? (
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${perfil.cls}`}>
                            {perfil.label}
                          </span>
                        ) : <span className="text-xs text-slate-600">—</span>}
                      </td>
                      {/* Toggle acesso */}
                      <td className="px-5 py-4">
                        <button type="button" onClick={() => toggleAtivo(u)}
                          title={u.statusAtivo ? 'Click para BLOQUEAR acesso' : 'Click para LIBERAR acesso'}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                            u.statusAtivo
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:bg-slate-700'
                          }`}>
                          {u.statusAtivo
                            ? <><ShieldCheck size={11} /> Ativo</>
                            : <><ShieldOff size={11} /> Bloqueado</>}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          <Tooltip label={u.statusAtivo ? 'Desativar' : 'Ativar'}>
                              <BotaoAcao icon={Power} label={u.statusAtivo ? 'Desativar' : 'Ativar'} cor="azul" soIcone dicaNativa={false} onClick={() => toggleAtivo(u)} />
                            </Tooltip>
                          <Tooltip label="Editar (perfil, dados, senha)">
                              <BotaoAcao icon={Edit2} label="Editar (perfil, dados, senha)" cor="azul" soIcone dicaNativa={false} onClick={() => setEditing(u)} />
                            </Tooltip>
                          <Tooltip label="Permissões granulares (liberar/negar ações)">
                              <BotaoAcao icon={Shield} label="Permissões granulares (liberar/negar ações)" cor="roxo" soIcone dicaNativa={false} onClick={() => setPermUser(u)} />
                            </Tooltip>
                          <Tooltip label="Excluir">
                              <BotaoAcao icon={Trash2} label="Excluir" cor="vermelho" soIcone dicaNativa={false} onClick={() => handleDelete(u)} />
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

      <EditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={(u) => setUsuarios((prev) => prev.map((x) => x.id === u.id ? u : x))}
        title={`Editar usuário — ${editing?.login || ''}`}
        endpoint={editing ? `/usuarios/${editing.id}` : ''}
        initial={editing ? {
          id: editing.id,
          login: editing.login || '',
          nome: editing.nome || '',
          email: editing.email || '',
          telefone: editing.telefone || '',
          documento: editing.documento || '',
          perfilAcesso: editing.perfilAcesso || '',
          statusAtivo: !!editing.statusAtivo,
          senha: '',
        } : {}}
        fields={[
          { name: 'nome', label: 'Nome', required: true, full: true },
          { name: 'login', label: 'Login', required: true },
          { name: 'email', label: 'E-mail', type: 'email' },
          { name: 'telefone', label: 'Telefone', mask: 'telefone' },
          { name: 'documento', label: 'CPF', mask: 'documento' },
          {
            name: 'perfilAcesso', label: 'Perfil de Acesso', type: 'select', required: true,
            options: PERFIL_OPTIONS,
          },
          {
            name: 'senha', label: 'Nova Senha', type: 'password',
            placeholder: 'Deixe vazio para manter atual',
            hint: 'Só preencha se quiser alterar. BCrypt aplicado.',
            full: true,
          },
          { name: 'statusAtivo', label: 'Status', type: 'checkbox', checkLabel: 'Usuário ativo no sistema', full: true },
        ]}
      />

      <PermissoesModal
        open={!!permUser}
        usuario={permUser}
        onClose={() => setPermUser(null)}
        onSaved={(u) => setUsuarios((prev) => prev.map((x) => x.id === u.id ? u : x))}
      />
    </div>
  );
}

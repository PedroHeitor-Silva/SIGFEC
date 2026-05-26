import GenericList from '../components/GenericList';

const PERFIL_BADGE = {
  ADMIN: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  BALANCA: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  LABORATORIO: 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20',
  PRODUCAO: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  FINANCEIRO: 'bg-lime-500/10 text-lime-400 border border-lime-500/20',
};

const PERFIL_OPTIONS = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'BALANCA', label: 'Operador de Balança' },
  { value: 'LABORATORIO', label: 'Laboratório' },
  { value: 'PRODUCAO', label: 'Produção' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
];

export default function UsuarioLista() {
  return (
    <GenericList
      moduleKey="usuarios"
      endpoint="/usuarios"
      title="Usuários do Sistema"
      newPath="/usuarios/novo"
      newLabel="Novo Usuário"
      searchPlaceholder="Buscar por login ou nome"
      filterKeys={['login', 'nome', 'email']}
      columns={[
        { label: 'ID', key: 'id', mono: true, accent: 'text-slate-500' },
        { label: 'Login', key: 'login', mono: true, accent: 'text-white font-bold' },
        { label: 'Nome', key: 'nome' },
        { label: 'Email', key: 'email', accent: 'text-slate-400' },
        {
          label: 'Perfil',
          render: (u) => (
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${PERFIL_BADGE[u.perfilAcesso] ?? 'bg-slate-700 text-slate-300'}`}>
              {u.perfilAcesso || '-'}
            </span>
          ),
        },
        {
          label: 'Status',
          render: (u) => (
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${u.statusAtivo ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${u.statusAtivo ? 'bg-emerald-500' : 'bg-slate-600'}`} />
              {u.statusAtivo ? 'Ativo' : 'Inativo'}
            </span>
          ),
        },
      ]}
      editTitle="Editar Usuário"
      buildEditInitial={(u) => ({
        id: u.id,
        login: u.login || '',
        nome: u.nome || '',
        email: u.email || '',
        telefone: u.telefone || '',
        documento: u.documento || '',
        perfilAcesso: u.perfilAcesso || '',
        statusAtivo: !!u.statusAtivo,
        senha: '', // sempre vazia — só envia se admin digitar nova
      })}
      editFields={[
        { name: 'nome', label: 'Nome', type: 'text', required: true, full: true },
        { name: 'login', label: 'Login', type: 'text', required: true },
        { name: 'email', label: 'E-mail', type: 'email' },
        { name: 'telefone', label: 'Telefone', type: 'tel', mask: 'telefone', placeholder: '(00) 00000-0000' },
        { name: 'documento', label: 'CPF', mask: 'documento', placeholder: '000.000.000-00' },
        {
          name: 'perfilAcesso', label: 'Perfil de Acesso', type: 'select', required: true,
          options: PERFIL_OPTIONS,
        },
        {
          name: 'senha', label: 'Nova Senha', type: 'password',
          placeholder: 'Deixe vazio para manter atual',
          hint: 'Apenas preencha se quiser alterar. Será hasheada com BCrypt.',
          full: true,
        },
        { name: 'statusAtivo', label: 'Status', type: 'checkbox', checkLabel: 'Usuário ativo no sistema', full: true },
      ]}
      emptyState={{
        title: 'Nenhum usuário',
        description: 'Crie usuários do sistema com perfil de acesso.',
      }}
    />
  );
}

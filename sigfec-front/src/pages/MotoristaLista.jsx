import GenericList from '../components/GenericList';

// Calcula situação da CNH a partir da data de validade
const cnhInfo = (validadeCnh) => {
  if (!validadeCnh) return null;
  const hoje = new Date();
  const venc = new Date(validadeCnh + 'T00:00:00');
  const dias = Math.floor((venc - hoje) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { texto: 'Vencida', cls: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' };
  if (dias <= 30) return { texto: `Vence em ${dias}d`, cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' };
  return { texto: 'Válida', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
};

const fmtData = (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

export default function MotoristaLista() {
  return (
    <GenericList
      moduleKey="motoristas"
      endpoint="/motoristas"
      title="Gestão de Motoristas"
      newPath="/motoristas/novo"
      newLabel="Novo Motorista"
      searchPlaceholder="Buscar por nome ou CNH"
      filterKeys={['nome', 'cnh', 'documento']}
      columns={[
        { label: 'ID', key: 'id', mono: true, accent: 'text-slate-500' },
        { label: 'Nome', key: 'nome', accent: 'text-white font-medium' },
        { label: 'CPF', key: 'documento', mono: true, accent: 'text-slate-400' },
        { label: 'CNH', key: 'cnh', mono: true, accent: 'text-slate-400' },
        {
          label: 'Cat.',
          render: (m) => m.categoriaCnh
            ? <span className="inline-flex rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-[11px] font-bold text-slate-300">{m.categoriaCnh}</span>
            : <span className="text-slate-600">—</span>,
        },
        {
          label: 'Validade CNH',
          render: (m) => {
            const info = cnhInfo(m.validadeCnh);
            if (!info) return <span className="text-slate-600 text-xs">{fmtData(m.validadeCnh)}</span>;
            return (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">{fmtData(m.validadeCnh)}</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${info.cls}`}>{info.texto}</span>
              </div>
            );
          },
        },
        {
          label: 'Status',
          render: (m) => (
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${m.statusAtivo !== false ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${m.statusAtivo !== false ? 'bg-emerald-500' : 'bg-slate-600'}`} />
              {m.statusAtivo !== false ? 'Ativo' : 'Inativo'}
            </span>
          ),
        },
      ]}
      editTitle="Editar Motorista"
      editFields={[
        { name: 'nome', label: 'Nome Completo', required: true, full: true },
        { name: 'documento', label: 'CPF', mask: 'documento', placeholder: '000.000.000-00' },
        { name: 'cnh', label: 'CNH', mask: 'cnh', required: true },
        {
          name: 'categoriaCnh', label: 'Categoria CNH', type: 'select',
          options: [
            { value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' },
            { value: 'D', label: 'D' }, { value: 'E', label: 'E' },
            { value: 'AB', label: 'AB' }, { value: 'AC', label: 'AC' },
            { value: 'AD', label: 'AD' }, { value: 'AE', label: 'AE' },
          ],
        },
        { name: 'validadeCnh', label: 'Validade CNH', type: 'date' },
        { name: 'telefone', label: 'Telefone', type: 'tel', mask: 'telefone', placeholder: '(00) 00000-0000' },
        { name: 'email', label: 'E-mail', type: 'email' },
        {
          name: 'statusAtivo', label: 'Status', type: 'select',
          options: [{ value: true, label: 'Ativo' }, { value: false, label: 'Inativo' }],
        },
      ]}
      emptyState={{
        title: 'Nenhum motorista cadastrado',
        description: 'Adicione os condutores que transportam cargas para a fecularia.',
      }}
    />
  );
}

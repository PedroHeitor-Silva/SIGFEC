import GenericList from '../components/GenericList';

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
        { label: 'Telefone', key: 'telefone' },
      ]}
      editTitle="Editar Motorista"
      editFields={[
        { name: 'nome', label: 'Nome', required: true, full: true },
        { name: 'documento', label: 'CPF', mask: 'documento', placeholder: '000.000.000-00' },
        { name: 'cnh', label: 'CNH', mask: 'cnh', required: true },
        { name: 'telefone', label: 'Telefone', type: 'tel', mask: 'telefone', placeholder: '(00) 00000-0000' },
        { name: 'email', label: 'E-mail', type: 'email' },
      ]}
      emptyState={{
        title: 'Nenhum motorista cadastrado',
        description: 'Adicione os condutores que transportam cargas para a fecularia.',
      }}
    />
  );
}

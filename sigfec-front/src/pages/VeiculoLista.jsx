import GenericList from '../components/GenericList';

export default function VeiculoLista() {
  return (
    <GenericList
      moduleKey="veiculos"
      endpoint="/veiculos"
      title="Frota de Veículos"
      newPath="/veiculos/novo"
      newLabel="Novo Veículo"
      searchPlaceholder="Buscar por placa ou modelo"
      filterKeys={['placa', 'modelo']}
      columns={[
        { label: 'ID', key: 'id', mono: true, accent: 'text-slate-500' },
        { label: 'Placa', key: 'placa', mono: true, accent: 'text-white font-bold uppercase' },
        { label: 'Modelo', key: 'modelo', accent: 'text-white' },
        { label: 'Tara (kg)', key: 'tara', mono: true, accent: 'text-amber-400' },
      ]}
      editTitle="Editar Veículo"
      editFields={[
        { name: 'placa', label: 'Placa', required: true, mask: 'placa', placeholder: 'AAA1A23' },
        { name: 'modelo', label: 'Modelo', required: true, full: true },
        { name: 'tara', label: 'Tara (kg)', type: 'number', placeholder: '0', hint: 'Peso do veículo vazio em kg' },
      ]}
      emptyState={{
        title: 'Nenhum veículo cadastrado',
        description: 'Registre a frota própria e de terceiros para vincular nas pesagens.',
      }}
    />
  );
}

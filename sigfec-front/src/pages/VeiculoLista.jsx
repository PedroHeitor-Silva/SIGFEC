import GenericList from '../components/GenericList';
import { maskPlaca, pesoFromNumber } from '../utils/masks';

const TIPO_LABEL = {
  TOCO: 'Toco', TRUCK: 'Truck', CARRETA: 'Carreta', BITREM: 'Bitrem', RODOTREM: 'Rodotrem',
};

export default function VeiculoLista() {
  return (
    <GenericList
      moduleKey="veiculos"
      endpoint="/veiculos"
      title="Frota de Veículos"
      newPath="/veiculos/novo"
      newLabel="Novo Veículo"
      searchPlaceholder="Buscar por placa ou modelo"
      filterKeys={['placa', 'modelo', 'marca']}
      columns={[
        { label: 'Placa', render: (v) => maskPlaca(v.placa), mono: true, accent: 'text-white font-bold' },
        { label: 'Marca / Modelo', render: (v) => [v.marca, v.modelo].filter(Boolean).join(' ') || '—', accent: 'text-white' },
        {
          label: 'Tipo',
          render: (v) => v.tipoVeiculo
            ? <span className="inline-flex rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{TIPO_LABEL[v.tipoVeiculo] || v.tipoVeiculo}</span>
            : <span className="text-slate-600">—</span>,
        },
        { label: 'Eixos', render: (v) => v.eixos ?? '—', mono: true, accent: 'text-slate-400' },
        { label: 'Tara', render: (v) => pesoFromNumber(v.tara), mono: true, accent: 'text-amber-400' },
        { label: 'Capacidade', render: (v) => pesoFromNumber(v.capacidadeKg), mono: true, accent: 'text-emerald-400' },
        { label: 'Motorista', render: (v) => v.motorista?.nome || '—', accent: 'text-slate-400' },
        {
          label: 'Status',
          render: (v) => (
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${v.statusAtivo !== false ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${v.statusAtivo !== false ? 'bg-emerald-500' : 'bg-slate-600'}`} />
              {v.statusAtivo !== false ? 'Ativo' : 'Inativo'}
            </span>
          ),
        },
      ]}
      editTitle="Editar Veículo"
      editFields={[
        { name: 'placa', label: 'Placa', required: true, mask: 'placa', placeholder: 'ABC-1D23' },
        { name: 'marca', label: 'Marca', placeholder: 'Ex: Scania' },
        { name: 'modelo', label: 'Modelo', placeholder: 'Ex: R450' },
        {
          name: 'tipoVeiculo', label: 'Tipo', type: 'select',
          options: Object.entries(TIPO_LABEL).map(([value, label]) => ({ value, label })),
        },
        { name: 'eixos', label: 'Eixos', type: 'number', placeholder: 'Ex: 9' },
        { name: 'tara', label: 'Tara (kg)', mask: 'peso', placeholder: 'Ex: 18.500', hint: 'Peso do veículo vazio' },
        { name: 'capacidadeKg', label: 'Capacidade (kg)', mask: 'peso', placeholder: 'Ex: 74.000' },
        {
          name: 'statusAtivo', label: 'Status', type: 'select',
          options: [{ value: true, label: 'Ativo' }, { value: false, label: 'Inativo' }],
        },
        { name: 'observacao', label: 'Observação', full: true, placeholder: 'Ex: Autorizado para fécula e mandioca' },
      ]}
      emptyState={{
        title: 'Nenhum veículo cadastrado',
        description: 'Registre a frota própria e de terceiros para vincular nas pesagens.',
      }}
    />
  );
}

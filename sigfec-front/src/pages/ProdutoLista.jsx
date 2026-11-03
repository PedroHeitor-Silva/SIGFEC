import { useNavigate } from 'react-router-dom';
import { CircleDollarSign, ChevronRight } from 'lucide-react';
import GenericList from '../components/GenericList';
import { unidadeNome, UNIDADE_OPTIONS } from '../utils/unidades';

const fmtMoeda = (v) =>
  v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v)) : '-';

const CATEGORIAS = {
  MANDIOCA: { label: 'Mandioca', badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  FECULA: { label: 'Fécula', badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  TAPIOCA: { label: 'Tapioca', badge: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' },
  POLVILHO_DOCE: { label: 'Polvilho Doce', badge: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
  POLVILHO_AZEDO_GRANULADO: { label: 'Polvilho Azedo (Granulado)', badge: 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20' },
  POLVILHO_AZEDO_PO: { label: 'Polvilho Azedo (Pó)', badge: 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20' },
  DEXTRINA: { label: 'Dextrina', badge: 'bg-lime-500/10 text-lime-400 border border-lime-500/20' },
  RESIDUO_FIBROSO: { label: 'Resíduo (Ração)', badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' },
};

export default function ProdutoLista() {
  const navigate = useNavigate();
  return (
    <GenericList
      moduleKey="produtos"
      endpoint="/produtos"
      title="Catálogo de Produtos"
      newPath="/produtos/novo"
      newLabel="Novo Produto"
      searchPlaceholder="Buscar por nome ou categoria"
      filterKeys={['nome', 'categoria']}
      ordemPadrao={{ key: 'nome', dir: 'asc' }}
      filtros={[
        { key: 'cat', label: 'Categoria', get: (p) => CATEGORIAS[p.categoria]?.label || p.categoria },
        { key: 'un', label: 'Unidade', get: (p) => unidadeNome(p.unidadeMedida) },
      ]}
      columns={[
        { label: 'ID', key: 'id', mono: true, accent: 'text-slate-500' },
        { label: 'Nome', key: 'nome', accent: 'text-white font-medium' },
        {
          label: 'Categoria', sortKey: 'categoria', sortGet: (p) => CATEGORIAS[p.categoria]?.label || p.categoria,
          render: (p) => {
            const c = CATEGORIAS[p.categoria] || { label: p.categoria || '-', badge: 'bg-slate-700 text-slate-400' };
            return (
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${c.badge}`}>
                {c.label}
              </span>
            );
          },
        },
        {
          label: 'Unidade', key: 'unidadeMedida',
          render: (p) => (
            <span className="inline-flex rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {unidadeNome(p.unidadeMedida)}
            </span>
          ),
        },
        { label: 'Preço Base', key: 'precoBase', render: (p) => fmtMoeda(p.precoBase), accent: 'text-emerald-400 font-mono font-bold' },
        {
          label: 'Tabela',
          render: (p) => (
            <button type="button" onClick={() => navigate(`/produtos/precos?produto=${p.id}`)}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/20 transition">
              <CircleDollarSign size={11} /> Preços <ChevronRight size={11} />
            </button>
          ),
        },
      ]}
      editTitle="Editar Produto"
      editFields={[
        { name: 'nome', label: 'Nome', required: true, full: true },
        {
          name: 'categoria', label: 'Categoria', type: 'select', required: true,
          options: [
            { value: 'MANDIOCA', label: 'Mandioca (Matéria-prima)' },
            { value: 'FECULA', label: 'Fécula de Mandioca' },
            { value: 'TAPIOCA', label: 'Tapioca' },
            { value: 'POLVILHO_DOCE', label: 'Polvilho Doce' },
            { value: 'POLVILHO_AZEDO_GRANULADO', label: 'Polvilho Azedo Granulado' },
            { value: 'POLVILHO_AZEDO_PO', label: 'Polvilho Azedo em Pó' },
            { value: 'DEXTRINA', label: 'Dextrina' },
            { value: 'RESIDUO_FIBROSO', label: 'Resíduo Fibroso (Ração)' },
          ],
        },
        {
          name: 'unidadeMedida', label: 'Unidade de Medida', type: 'select', required: true,
          options: UNIDADE_OPTIONS,
        },
        { name: 'precoBase', label: 'Preço Base (R$)', type: 'number', placeholder: '0,00' },
      ]}
      emptyState={{
        title: 'Catálogo vazio',
        description: 'Cadastre fécula, tapioca, polvilho e outros produtos da fecularia.',
      }}
    />
  );
}

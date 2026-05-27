import {
  LayoutDashboard, Users, Weight, UserCircle, Beaker,
  DollarSign, Package, IdCard, Truck, UserCog, Boxes, ClipboardList, ShoppingCart,
} from 'lucide-react';

/*
 * Paleta corporate suave — inspirada no Dashboard de referência.
 * Cor primária do sistema: TEAL #1ABB9C (brand).
 * Cada módulo só guarda um tom para o ícone do menu/header.
 */
const PALETTE = {
  brand:   { dot: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-50',  border: 'border-emerald-100',  bar: 'bg-emerald-500' },
  indigo:  { dot: 'bg-indigo-500',  text: 'text-indigo-500',  bg: 'bg-indigo-50',   border: 'border-indigo-100',   bar: 'bg-indigo-500' },
  cyan:    { dot: 'bg-cyan-600',    text: 'text-cyan-600',    bg: 'bg-cyan-50',     border: 'border-cyan-100',     bar: 'bg-cyan-600' },
  sky:     { dot: 'bg-sky-600',     text: 'text-sky-600',     bg: 'bg-sky-50',      border: 'border-sky-100',      bar: 'bg-sky-600' },
  amber:   { dot: 'bg-amber-500',   text: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-100',    bar: 'bg-amber-500' },
  violet:  { dot: 'bg-violet-500',  text: 'text-violet-600',  bg: 'bg-violet-50',   border: 'border-violet-100',   bar: 'bg-violet-500' },
  rose:    { dot: 'bg-rose-500',    text: 'text-rose-600',    bg: 'bg-rose-50',     border: 'border-rose-100',     bar: 'bg-rose-500' },
  slate:   { dot: 'bg-slate-400',   text: 'text-slate-500',   bg: 'bg-slate-100',   border: 'border-slate-200',    bar: 'bg-slate-400' },
};

const compat = (p) => ({
  ...p,
  glow: '',
  gradient: 'from-transparent to-transparent',
  button: 'bg-brand-500 hover:bg-brand-600 text-white',
});

const M = (label, section, icon, accent) => ({
  label, section, icon, accent, ...compat(PALETTE[accent] || PALETTE.brand),
});

export const MODULES = {
  dashboard:   M('Dashboard',     'Geral',       LayoutDashboard, 'brand'),
  cadastros:   M('Central',       'Cadastros',   UserCircle,      'violet'),
  parceiros:   M('Parceiros',     'Cadastros',   Users,           'cyan'),
  motoristas:  M('Motoristas',    'Cadastros',   IdCard,          'sky'),
  veiculos:    M('Veículos',      'Cadastros',   Truck,           'amber'),
  produtos:    M('Produtos',      'Cadastros',   Package,         'indigo'),
  usuarios:    M('Usuários',      'Cadastros',   UserCog,         'rose'),
  pesagem:     M('Pesagem',       'Operacional', Weight,          'amber'),
  romaneio:    M('Romaneio',      'Operacional', ClipboardList,   'slate'),
  laboratorio: M('Laboratório',   'Operacional', Beaker,          'violet'),
  lotes:       M('Lotes Produção','Operacional', Boxes,           'brand'),
  estoque:     M('Estoque',       'Gestão',      Package,         'sky'),
  vendas:      M('Vendas',        'Gestão',      ShoppingCart,    'brand'),
  financeiro:  M('Financeiro',    'Gestão',      DollarSign,      'amber'),
};

export const SECTIONS = [
  { label: 'Geral',       items: ['dashboard'] },
  { label: 'Operacional', items: ['pesagem', 'romaneio', 'laboratorio', 'lotes'] },
  { label: 'Cadastros',   items: ['cadastros', 'parceiros', 'motoristas', 'veiculos', 'produtos', 'usuarios'] },
  { label: 'Gestão',      items: ['estoque', 'vendas', 'financeiro'] },
];

export const PATHS = {
  dashboard: '/',
  cadastros: '/cadastros',
  parceiros: '/parceiros',
  motoristas: '/motoristas',
  veiculos: '/veiculos',
  produtos: '/produtos',
  usuarios: '/usuarios',
  pesagem: '/pesagem',
  romaneio: '/romaneio',
  laboratorio: '/laboratorio',
  lotes: '/lotes',
  estoque: '/estoque',
  vendas: '/vendas',
  financeiro: '/financeiro',
};

export function moduleFromPath(pathname) {
  if (pathname === '/') return 'dashboard';
  const root = '/' + pathname.split('/')[1];
  return Object.entries(PATHS).find(([, p]) => p === root)?.[0] || 'dashboard';
}

/**
 * PageHeader — título grande + breadcrumb fino + ação à direita.
 * Estilo "Visão Geral" do Dashboard de referência.
 */
export function ModuleHeader({ moduleKey, title, subtitle, action }) {
  const m = MODULES[moduleKey] || MODULES.dashboard;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
          {m.section} <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-500">{m.label}</span>
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

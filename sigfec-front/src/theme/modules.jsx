import {
  LayoutDashboard, Users, Weight, UserCircle, Beaker,
  DollarSign, Package, IdCard, Truck, UserCog, Boxes, ClipboardList, ShoppingCart,
  ListChecks, FileChartColumn, Settings,
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
  fila:        M('Fila / Pátio',  'Operacional', ListChecks,      'cyan'),
  pesagem:     M('Pesagem',       'Operacional', Weight,          'amber'),
  romaneio:    M('Romaneio',      'Operacional', ClipboardList,   'slate'),
  laboratorio: M('Laboratório',   'Operacional', Beaker,          'violet'),
  lotes:       M('Lotes Produção','Operacional', Boxes,           'brand'),
  estoque:     M('Estoque',       'Gestão',      Package,         'sky'),
  vendas:      M('Vendas',        'Gestão',      ShoppingCart,    'brand'),
  financeiro:  M('Financeiro',    'Gestão',      DollarSign,      'amber'),
  relatorios:  M('Relatórios',    'Gestão',      FileChartColumn, 'indigo'),
  configuracoes: M('Configurações', 'Administração', Settings,      'slate'),
};

export const SECTIONS = [
  { label: 'Geral',       items: ['dashboard'] },
  { label: 'Operacional', items: ['fila', 'pesagem', 'romaneio', 'laboratorio', 'lotes'] },
  { label: 'Cadastros',   items: ['cadastros', 'parceiros', 'motoristas', 'veiculos', 'produtos', 'usuarios'] },
  { label: 'Gestão',      items: ['estoque', 'vendas', 'financeiro', 'relatorios'] },
  { label: 'Administração', items: ['configuracoes'] },
];

export const PATHS = {
  dashboard: '/',
  cadastros: '/cadastros',
  parceiros: '/parceiros',
  motoristas: '/motoristas',
  veiculos: '/veiculos',
  produtos: '/produtos',
  usuarios: '/usuarios',
  fila: '/fila',
  pesagem: '/pesagem',
  romaneio: '/romaneio',
  laboratorio: '/laboratorio',
  lotes: '/lotes',
  estoque: '/estoque',
  vendas: '/vendas',
  financeiro: '/financeiro',
  relatorios: '/relatorios',
  configuracoes: '/configuracoes',
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
    // A seção/módulo já aparece no cabeçalho fixo; aqui fica só o título da página, a descrição e as ações.
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 pb-5 border-b border-slate-800">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight" title={`${m.section} / ${m.label}`}>{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400 max-w-3xl">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

import {
  LayoutDashboard, Users, Weight, UserCircle, Beaker,
  DollarSign, Package, IdCard, Truck, UserCog, Boxes, ClipboardList, ShoppingCart,
} from 'lucide-react';

// Tailwind JIT-safe: full class strings explicit
const PALETTE = {
  emerald: {
    bar: 'bg-emerald-500', text: 'text-emerald-400',
    bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/20', gradient: 'from-emerald-500/10 to-transparent',
    button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40',
  },
  violet: {
    bar: 'bg-violet-500', text: 'text-violet-400',
    bg: 'bg-violet-500/10', border: 'border-violet-500/20',
    glow: 'shadow-violet-500/20', gradient: 'from-violet-500/10 to-transparent',
    button: 'bg-violet-600 hover:bg-violet-500 shadow-violet-900/40',
  },
  cyan: {
    bar: 'bg-cyan-500', text: 'text-cyan-400',
    bg: 'bg-cyan-500/10', border: 'border-cyan-500/20',
    glow: 'shadow-cyan-500/20', gradient: 'from-cyan-500/10 to-transparent',
    button: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/40',
  },
  sky: {
    bar: 'bg-sky-500', text: 'text-sky-400',
    bg: 'bg-sky-500/10', border: 'border-sky-500/20',
    glow: 'shadow-sky-500/20', gradient: 'from-sky-500/10 to-transparent',
    button: 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/40',
  },
  amber: {
    bar: 'bg-amber-500', text: 'text-amber-400',
    bg: 'bg-amber-500/10', border: 'border-amber-500/20',
    glow: 'shadow-amber-500/20', gradient: 'from-amber-500/10 to-transparent',
    button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40',
  },
  fuchsia: {
    bar: 'bg-fuchsia-500', text: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20',
    glow: 'shadow-fuchsia-500/20', gradient: 'from-fuchsia-500/10 to-transparent',
    button: 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-fuchsia-900/40',
  },
  rose: {
    bar: 'bg-rose-500', text: 'text-rose-400',
    bg: 'bg-rose-500/10', border: 'border-rose-500/20',
    glow: 'shadow-rose-500/20', gradient: 'from-rose-500/10 to-transparent',
    button: 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40',
  },
  lime: {
    bar: 'bg-lime-500', text: 'text-lime-400',
    bg: 'bg-lime-500/10', border: 'border-lime-500/20',
    glow: 'shadow-lime-500/20', gradient: 'from-lime-500/10 to-transparent',
    button: 'bg-lime-600 hover:bg-lime-500 shadow-lime-900/40',
  },
};

const M = (label, section, icon, accent) => ({ label, section, icon, accent, ...PALETTE[accent] });

export const MODULES = {
  dashboard: M('Dashboard', 'Geral', LayoutDashboard, 'emerald'),
  cadastros: M('Central', 'Cadastros', UserCircle, 'violet'),
  parceiros: M('Parceiros', 'Cadastros', Users, 'cyan'),
  motoristas: M('Motoristas', 'Cadastros', IdCard, 'sky'),
  veiculos: M('Veículos', 'Cadastros', Truck, 'amber'),
  produtos: M('Produtos', 'Cadastros', Package, 'fuchsia'),
  usuarios: M('Usuários', 'Cadastros', UserCog, 'rose'),
  pesagem: M('Pesagem', 'Operacional', Weight, 'amber'),
  romaneio: M('Romaneio', 'Operacional', ClipboardList, 'amber'),
  laboratorio: M('Laboratório', 'Operacional', Beaker, 'fuchsia'),
  lotes: M('Lotes Produção', 'Operacional', Boxes, 'emerald'),
  estoque: M('Estoque', 'Gestão', Package, 'sky'),
  vendas: M('Vendas', 'Gestão', ShoppingCart, 'emerald'),
  financeiro: M('Financeiro', 'Gestão', DollarSign, 'lime'),
};

export const SECTIONS = [
  { label: 'Geral', items: ['dashboard'] },
  { label: 'Operacional', items: ['pesagem', 'romaneio', 'laboratorio', 'lotes'] },
  { label: 'Cadastros', items: ['cadastros', 'parceiros', 'motoristas', 'veiculos', 'produtos', 'usuarios'] },
  { label: 'Gestão', items: ['estoque', 'vendas', 'financeiro'] },
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

export function ModuleHeader({ moduleKey, title, subtitle, action }) {
  const m = MODULES[moduleKey];
  const Icon = m.icon;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${m.bg} border ${m.border}`}>
          <Icon size={22} className={m.text} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${m.text}`}>{m.section}</p>
            <span className="text-slate-700">•</span>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{m.label}</p>
          </div>
          <h1 className="text-2xl font-bold text-white mt-0.5">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

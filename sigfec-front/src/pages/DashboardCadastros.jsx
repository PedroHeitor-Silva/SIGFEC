import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, IdCard, Truck, Package, UserCog, ChevronRight, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';

const CARDS = [
  {
    id: 'parceiros', label: 'Parceiros', icon: Users,
    desc: 'Produtores, fornecedores e clientes',
    listPath: '/parceiros', newPath: '/parceiros/novo', endpoint: '/parceiros',
    accent: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', button: 'bg-cyan-600 hover:bg-cyan-500' },
  },
  {
    id: 'motoristas', label: 'Motoristas', icon: IdCard,
    desc: 'Condutores vinculados ao transporte',
    listPath: '/motoristas', newPath: '/motoristas/novo', endpoint: '/motoristas',
    accent: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', button: 'bg-sky-600 hover:bg-sky-500' },
  },
  {
    id: 'veiculos', label: 'Veículos', icon: Truck,
    desc: 'Frota própria e de terceiros',
    listPath: '/veiculos', newPath: '/veiculos/novo', endpoint: '/veiculos',
    accent: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', button: 'bg-amber-600 hover:bg-amber-500' },
  },
  {
    id: 'produtos', label: 'Produtos', icon: Package,
    desc: 'Amidos, derivados e matérias-primas',
    listPath: '/produtos', newPath: '/produtos/novo', endpoint: '/produtos',
    accent: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30', text: 'text-fuchsia-400', button: 'bg-fuchsia-600 hover:bg-fuchsia-500' },
  },
  {
    id: 'usuarios', label: 'Usuários', icon: UserCog,
    desc: 'Controle de acesso ao sistema',
    listPath: '/usuarios', newPath: '/usuarios/novo', endpoint: '/usuarios',
    accent: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', button: 'bg-rose-600 hover:bg-rose-500' },
  },
];

export default function DashboardCadastros() {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    CARDS.forEach((c) => {
      api.get(c.endpoint).then(({ data }) => {
        setCounts((prev) => ({ ...prev, [c.id]: Array.isArray(data) ? data.length : 0 }));
      }).catch(() => setCounts((prev) => ({ ...prev, [c.id]: 0 })));
    });
  }, []);

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="cadastros"
        title="Central de Cadastros"
        subtitle="Visão geral de todas entidades de cadastro do sistema"
      />

      <motion.div
        initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {CARDS.map((card) => {
          const Icon = card.icon;
          const count = counts[card.id];
          return (
            <motion.div
              key={card.id}
              variants={{ hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
              className="group relative rounded-xl border border-slate-800 bg-slate-900 p-6 overflow-hidden hover:border-slate-700 transition"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.accent.bg} opacity-0 group-hover:opacity-100 transition pointer-events-none`} />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`rounded-xl ${card.accent.bg} border ${card.accent.border} p-3 ${card.accent.text}`}>
                    <Icon size={22} />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-white tabular-nums">
                      {count === undefined ? '—' : count}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">registros</p>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white">{card.label}</h3>
                <p className="mt-1 text-sm text-slate-500">{card.desc}</p>

                <div className="mt-5 flex gap-2">
                  <Link
                    to={card.listPath}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold uppercase tracking-wider ${card.accent.text} hover:bg-slate-700 transition`}
                  >
                    Listar <ChevronRight size={12} />
                  </Link>
                  <Link
                    to={card.newPath}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg ${card.accent.button} px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition`}
                  >
                    <Plus size={12} /> Novo
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

/* eslint-disable react/prop-types */
import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, description, action, accent = 'slate' }) {
  const accentMap = {
    slate: { bg: 'bg-slate-800/50', border: 'border-slate-700', text: 'text-slate-500' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
    fuchsia: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', text: 'text-fuchsia-400' },
    sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400' },
    lime: { bg: 'bg-lime-500/10', border: 'border-lime-500/20', text: 'text-lime-400' },
  };
  const a = accentMap[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      {Icon && (
        <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${a.bg} border ${a.border} mb-5`}>
          <Icon size={36} className={a.text} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-bold text-white">{title}</h3>
      {description && <p className="mt-2 text-sm text-slate-500 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

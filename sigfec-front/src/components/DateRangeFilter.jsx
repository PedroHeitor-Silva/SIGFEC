/* eslint-disable react/prop-types */
import { Calendar, X } from 'lucide-react';
import { isoLocal } from '../utils/relatorio';

const PRESETS = [
  { label: 'Hoje', days: 0 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export default function DateRangeFilter({ from, to, onChange }) {
  const apply = (days) => {
    const t = new Date();
    const f = new Date();
    f.setDate(f.getDate() - days);
    onChange({ from: isoLocal(f), to: isoLocal(t) });
  };

  const clear = () => onChange({ from: '', to: '' });
  const active = from || to;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
        <Calendar size={13} className="text-slate-500" />
        <input
          type="date"
          value={from}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="bg-transparent text-xs text-white outline-none"
        />
        <span className="text-slate-600 text-xs mx-1">—</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="bg-transparent text-xs text-white outline-none"
        />
        {active && (
          <button type="button" onClick={clear}
            className="ml-1 p-0.5 rounded text-slate-500 hover:text-red-400 transition">
            <X size={12} />
          </button>
        )}
      </div>

      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => apply(p.days)}
            className="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

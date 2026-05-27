c/* eslint-disable react/prop-types */
const fieldBase =
  'mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20';

const labelBase = 'text-xs font-bold uppercase tracking-wider text-slate-400';

export default function FormularioPadrao({ children, className = '', ...props }) {
  return (
    <form className={`space-y-5 ${className}`} {...props}>
      {children}
    </form>
  );
}

export function FormularioInput({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className={labelBase}>{label}</span>}
      <input className={`${fieldBase} ${className}`} {...props} />
    </label>
  );
}

export function FormularioSelect({ label, className = '', children, ...props }) {
  return (
    <label className="block">
      {label && <span className={labelBase}>{label}</span>}
      <select className={`${fieldBase} ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}

export function FormularioTextarea({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className={labelBase}>{label}</span>}
      <textarea className={`${fieldBase} ${className}`} {...props} />
    </label>
  );
}

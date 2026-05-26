/* eslint-disable react/prop-types */
/**
 * Input with optional left icon. Use for fields that need contextual icon
 * (e.g. CPF/CNPJ with IdCard, date with Calendar).
 */
export default function InputIcon({ icon: Icon, className = '', ...props }) {
  if (!Icon) {
    return (
      <input
        className={`mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition ${className}`}
        {...props}
      />
    );
  }
  return (
    <div className="relative mt-2">
      <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      <input
        className={`w-full rounded-lg border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition ${className}`}
        {...props}
      />
    </div>
  );
}

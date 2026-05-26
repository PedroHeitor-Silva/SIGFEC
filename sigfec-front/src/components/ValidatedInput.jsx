/* eslint-disable react/prop-types */
import { useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';

/**
 * Input controlado com validação onBlur + indicador visual.
 *
 * Props:
 * - label, name, value, onChange (padrão input)
 * - validate: fn(value) => errorString | null
 * - icon: lucide-react icon component (opcional)
 * - hint: texto de ajuda
 * - required: marca campo como obrigatório
 */
export default function ValidatedInput({
  label, name, value, onChange,
  validate, icon: Icon, hint, required, type = 'text',
  ...props
}) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);

  const handleBlur = (e) => {
    setTouched(true);
    if (validate) setError(validate(e.target.value));
  };

  const handleChange = (e) => {
    if (touched && validate) setError(validate(e.target.value));
    onChange?.(e);
  };

  const valid = touched && !error && value;
  const invalid = touched && error;

  const borderCls = invalid
    ? 'border-red-500 focus:border-red-400'
    : valid
    ? 'border-emerald-500/40 focus:border-emerald-500'
    : 'border-slate-700 focus:border-emerald-500';

  return (
    <label className="block">
      {label && (
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </span>
      )}
      <div className="relative mt-2">
        {Icon && (
          <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        )}
        <input
          type={type}
          name={name}
          value={value ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full rounded-lg border bg-slate-800 py-3 px-4 text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/20 transition ${Icon ? 'pl-10' : ''} ${valid || invalid ? 'pr-10' : ''} ${borderCls}`}
          {...props}
        />
        {valid && (
          <Check size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
        )}
        {invalid && (
          <AlertCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />
        )}
      </div>
      {invalid ? (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-red-400">
          <AlertCircle size={11} /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] text-slate-600">{hint}</p>
      ) : null}
    </label>
  );
}

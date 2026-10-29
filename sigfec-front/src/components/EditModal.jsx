/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Save, X, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { applyMask, unmaskMoeda, unmaskInteiro } from '../utils/masks';

const inputCls = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition';
const labelCls = 'text-xs font-bold uppercase tracking-wider text-slate-400';

/**
 * Modal de edição configurável.
 *
 * Props:
 * - open, onClose, onSaved(updated)
 * - title — header
 * - endpoint — ex: '/usuarios/5' (PUT)
 * - initial — objeto com valores atuais
 * - fields — [{name, label, type?, options?, placeholder?, hint?, mask?}]
 *     type: 'text'|'email'|'password'|'tel'|'number'|'select'|'checkbox'
 *     mask: 'telefone'|'cep'|'documento'|'rg'|'placa'|'cnh'|'moeda'|'inteiro'
 *     options: [{value, label}] (pra select)
 */
export default function EditModal({ open, onClose, onSaved, title, endpoint, initial, fields }) {
  const [form, setForm] = useState(initial || {});
  const [saving, setSaving] = useState(false);

  // mapa name → tipo de máscara
  const maskMap = {};
  fields.forEach((f) => { if (f.mask) maskMap[f.name] = f.mask; });

  // Ao abrir, aplica máscara nos valores existentes (números crus e textos)
  useEffect(() => {
    if (!open) return;
    const f = { ...(initial || {}) };
    fields.forEach((fld) => {
      if (!fld.mask || f[fld.name] == null || f[fld.name] === '') return;
      if (fld.mask === 'moeda') {
        f[fld.name] = applyMask('moeda', String(Math.round(Number(initial[fld.name]) * 100)));
      } else if (fld.mask === 'peso' || fld.mask === 'inteiro') {
        f[fld.name] = applyMask(fld.mask, String(Math.round(Number(initial[fld.name]))));
      } else {
        f[fld.name] = applyMask(fld.mask, String(initial[fld.name]));
      }
    });
    setForm(f);
  }, [open, initial]);

  if (typeof document === 'undefined') return null;

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    let v = type === 'checkbox' ? checked : value;
    if (maskMap[name]) v = applyMask(maskMap[name], value);
    setForm((p) => ({ ...p, [name]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Remove máscara de campos numéricos antes de enviar ao backend
      const payload = { ...form };
      fields.forEach((f) => {
        if (payload[f.name] == null || payload[f.name] === '') return;
        if (f.mask === 'moeda') payload[f.name] = unmaskMoeda(payload[f.name]);
        else if (f.mask === 'peso' || f.mask === 'inteiro') payload[f.name] = unmaskInteiro(payload[f.name]);
      });
      const { data } = await api.put(endpoint, payload);
      toast.success('Alterações salvas.');
      onSaved?.(data);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Falha ao salvar.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true"
            className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <Pencil size={14} className="text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-white">{title}</h3>
              </div>
              <button type="button" aria-label="Fechar" title="Fechar" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 grid gap-5 sm:grid-cols-2">
                {fields.map((f) => (
                  <label key={f.name} className={`block ${f.full ? 'sm:col-span-2' : ''}`}>
                    <span className={labelCls}>{f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}</span>

                    {f.type === 'select' ? (
                      <select name={f.name} value={form[f.name] ?? ''} onChange={handleChange} className={inputCls} required={f.required}>
                        <option value="">Selecione...</option>
                        {f.options.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : f.type === 'checkbox' ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input type="checkbox" name={f.name} checked={!!form[f.name]} onChange={handleChange}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-800 accent-emerald-500" />
                        <span className="text-sm text-slate-300">{f.checkLabel || f.label}</span>
                      </div>
                    ) : (
                      <input
                        type={f.type || 'text'}
                        name={f.name}
                        value={form[f.name] ?? ''}
                        onChange={handleChange}
                        placeholder={f.placeholder}
                        className={inputCls}
                        required={f.required}
                        autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                      />
                    )}

                    {f.hint && <p className="mt-1 text-[11px] text-slate-600">{f.hint}</p>}
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
                <button type="button" onClick={onClose}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition">
                  <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

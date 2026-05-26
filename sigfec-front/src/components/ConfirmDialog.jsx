/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

let resolver = null;
let setStateRef = null;

export function confirm(options) {
  return new Promise((resolve) => {
    resolver = resolve;
    setStateRef?.({
      open: true,
      title: options.title ?? 'Confirmar',
      message: options.message ?? 'Tem certeza?',
      confirmLabel: options.confirmLabel ?? 'Confirmar',
      cancelLabel: options.cancelLabel ?? 'Cancelar',
      tone: options.tone ?? 'danger',
    });
  });
}

const TONES = {
  danger: { icon: AlertTriangle, accent: 'text-red-400 bg-red-500/10 border-red-500/20', button: 'bg-red-600 hover:bg-red-500' },
  warning: { icon: AlertTriangle, accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20', button: 'bg-amber-600 hover:bg-amber-500' },
  info: { icon: AlertTriangle, accent: 'text-sky-400 bg-sky-500/10 border-sky-500/20', button: 'bg-sky-600 hover:bg-sky-500' },
};

export default function ConfirmDialog() {
  const [state, setState] = useState({ open: false });

  useEffect(() => {
    setStateRef = setState;
    return () => { setStateRef = null; };
  }, []);

  const close = (result) => {
    setState((s) => ({ ...s, open: false }));
    resolver?.(result);
    resolver = null;
  };

  useEffect(() => {
    if (!state.open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.open]);

  if (typeof document === 'undefined') return null;

  const tone = TONES[state.tone] ?? TONES.danger;
  const Icon = tone.icon;

  return createPortal(
    <AnimatePresence>
      {state.open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => close(false)}
        >
          <motion.div
            initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-4 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-start gap-4 p-6">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tone.accent}`}>
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">{state.title}</h3>
                <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{state.message}</p>
              </div>
              <button onClick={() => close(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition">
                <X size={16} />
              </button>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                {state.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`rounded-lg px-5 py-2.5 text-sm font-bold text-white transition ${tone.button}`}
              >
                {state.confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

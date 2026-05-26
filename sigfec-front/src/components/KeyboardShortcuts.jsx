/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], label: 'Abrir busca global / Command palette' },
  { keys: ['?'], label: 'Mostrar este painel de atalhos' },
  { keys: ['Esc'], label: 'Fechar modais / Cancelar' },
  { keys: ['G', 'D'], label: 'Ir para Dashboard' },
  { keys: ['G', 'P'], label: 'Ir para Parceiros' },
  { keys: ['G', 'M'], label: 'Ir para Pesagem' },
  { keys: ['G', 'L'], label: 'Ir para Laboratório' },
  { keys: ['G', 'E'], label: 'Ir para Estoque' },
  { keys: ['G', 'F'], label: 'Ir para Financeiro' },
  { keys: ['F2'], label: 'Nova Pesagem (atalho rápido)' },
  { keys: ['F3'], label: 'Nova Análise de Laboratório' },
];

const G_NAV = {
  d: '/', p: '/parceiros', m: '/pesagem', l: '/laboratorio',
  e: '/estoque', f: '/financeiro', c: '/cadastros',
};

export default function KeyboardShortcuts() {
  const [help, setHelp] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let gPending = false;
    let gTimeout = null;

    const onKey = (e) => {
      const tag = e.target?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Allow shortcuts only outside inputs
      if (inInput) return;

      // ? = help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setHelp((v) => !v);
        return;
      }

      // F2 = nova pesagem
      if (e.key === 'F2') {
        e.preventDefault();
        navigate('/pesagem/mandioca');
        return;
      }

      // F3 = nova análise
      if (e.key === 'F3') {
        e.preventDefault();
        navigate('/laboratorio/novo');
        return;
      }

      // Esc = close help
      if (e.key === 'Escape') {
        setHelp(false);
        return;
      }

      // g, then key = navigate
      const k = e.key.toLowerCase();
      if (gPending && G_NAV[k]) {
        e.preventDefault();
        navigate(G_NAV[k]);
        gPending = false;
        clearTimeout(gTimeout);
        return;
      }

      if (k === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        gPending = true;
        gTimeout = setTimeout(() => { gPending = false; }, 1500);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(gTimeout);
    };
  }, [navigate]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Indicador discreto no canto */}
      <button
        type="button"
        onClick={() => setHelp(true)}
        title="Atalhos (?)"
        className="fixed bottom-4 right-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 backdrop-blur text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 transition"
      >
        <Keyboard size={14} />
      </button>

      <AnimatePresence>
        {help && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg mx-4 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <Keyboard size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Atalhos de Teclado</h3>
                    <p className="text-[11px] text-slate-500">Pressione fora de campos de texto</p>
                  </div>
                </div>
                <button onClick={() => setHelp(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition">
                  <X size={14} />
                </button>
              </div>

              <div className="p-5 space-y-1.5 max-h-[60vh] overflow-y-auto">
                {SHORTCUTS.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-slate-800/60 last:border-0">
                    <span className="text-sm text-slate-300">{s.label}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {s.keys.map((k, j) => (
                        <kbd key={j} className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 shadow-inner">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
